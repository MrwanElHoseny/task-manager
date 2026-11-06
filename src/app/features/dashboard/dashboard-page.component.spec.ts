import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StatisticsResponse } from '../../core/models/statistic.model';
import { Task } from '../../core/models/task.model';
import { FilterBarComponent } from '../../shared/ui/filter-bar.component';
import { TaskFiltersService } from '../../state/task-filters.service';
import { JOHN, makeTask } from '../../testing/task.fixtures';
import { TaskActionsService } from '../task-form/task-actions.service';
import { DashboardPageComponent } from './dashboard-page.component';
import { TaskBoardComponent } from './task-board.component';

const SERVER_ERROR = { status: 500, statusText: 'Server Error' };

const STATISTICS: StatisticsResponse = {
  lastUpdated: '2025-01-01T00:00:00Z',
  statistics: [
    {
      id: 'stat-001',
      title: 'Total Tasks',
      icon: '📊',
      value: 156,
      change: '+12',
      changeLabel: 'this week',
      changeType: 'positive',
      color: '#000',
    },
  ],
};

/** Runs the page against the real stores, with only the HTTP layer faked. */
describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let backend: HttpTestingController;
  const actions = {
    create: vi.fn(),
    edit: vi.fn(),
    delete: vi.fn(),
    move: vi.fn(),
    moveToEnd: vi.fn(),
  };

  const element = (): HTMLElement => fixture.nativeElement;
  const settle = () => fixture.whenStable();

  function flushSecondaryRequests({ statistics = true } = {}): void {
    backend.expectOne('/api/activities').flush([]);
    backend.expectOne('/api/users').flush([JOHN]);
    const stats = backend.expectOne('/api/statistics');
    if (statistics) {
      stats.flush(STATISTICS);
    } else {
      stats.flush(null, SERVER_ERROR);
    }
  }

  async function load(tasks: Task[], options?: { statistics?: boolean }): Promise<void> {
    TestBed.tick();
    backend.expectOne('/api/tasks').flush(tasks);
    flushSecondaryRequests(options);
    await settle();
  }

  const statValues = () =>
    [...element().querySelectorAll('.value')].map((value) => value.textContent);

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TaskActionsService, useValue: actions },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardPageComponent);
  });

  afterEach(() => backend.verify());

  it('shows skeletons while the tasks are loading', async () => {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect(element().querySelector('app-board-skeleton')).not.toBeNull();
    expect(element().querySelector('app-task-board')).toBeNull();

    backend.expectOne('/api/tasks').flush([]);
    flushSecondaryRequests();
    await settle();

    expect(element().querySelector('app-board-skeleton')).toBeNull();
  });

  it('derives the stat values from tasks and takes trends from the API', async () => {
    await load([
      makeTask({ status: 'todo', dueDate: '2000-01-01' }),
      makeTask({ status: 'in_progress' }),
      makeTask({ status: 'done' }),
    ]);

    expect(statValues()).toEqual(['3', '1', '1', '1']);
    expect(element().querySelector('.change')?.textContent).toBe('+12 this week');
  });

  it('still shows the stats if the trend data fails to load', async () => {
    await load([makeTask()], { statistics: false });

    expect(statValues()).toEqual(['1', '0', '0', '0']);
    expect(element().querySelector('app-task-board')).not.toBeNull();
  });

  it('lays the tasks out on the board', async () => {
    await load([makeTask({ title: 'Ship it' })]);

    expect(element().querySelector('app-task-card .title')?.textContent).toBe('Ship it');
  });

  it('shows an error instead of misleading zeros, and recovers on retry', async () => {
    TestBed.tick();
    backend.expectOne('/api/tasks').flush(null, SERVER_ERROR);
    flushSecondaryRequests();
    await settle();

    expect(element().textContent).toContain("We couldn't load your tasks");
    expect(element().querySelector('app-stat-card')).toBeNull();

    element().querySelector<HTMLButtonElement>('app-state-message button')?.click();
    TestBed.tick();
    backend.expectOne('/api/tasks').flush([makeTask()]);
    await settle();

    expect(element().querySelector('app-state-message')).toBeNull();
    expect(element().querySelectorAll('app-task-card')).toHaveLength(1);
  });

  it('tells the user when filters match nothing and lets them clear it', async () => {
    await load([makeTask({ title: 'Ship it' })]);
    const filters = TestBed.inject(TaskFiltersService);

    filters.search.set('nothing matches this');
    await settle();
    expect(element().textContent).toContain('No tasks match');

    element().querySelector<HTMLButtonElement>('app-state-message button')?.click();
    await settle();

    expect(filters.search()).toBe('');
    expect(element().querySelectorAll('app-task-card')).toHaveLength(1);
  });

  it('shows empty columns rather than "no match" when there are simply no tasks', async () => {
    await load([]);

    expect(element().textContent).not.toContain('No tasks match');
    expect(element().querySelectorAll('app-task-column')).toHaveLength(3);
  });

  it('updates the filters from the filter bar', async () => {
    await load([makeTask({ status: 'todo' }), makeTask({ status: 'done' })]);

    const bar = fixture.debugElement.query(By.directive(FilterBarComponent))
      .componentInstance as FilterBarComponent;
    bar.status.set('done');
    await settle();

    expect(TestBed.inject(TaskFiltersService).status()).toBe('done');
    expect(element().querySelectorAll('app-task-column')).toHaveLength(1);
    expect(element().querySelectorAll('app-task-card')).toHaveLength(1);
  });

  it('hands user actions to TaskActionsService', async () => {
    const task = makeTask();
    await load([task]);

    const bar = fixture.debugElement.query(By.directive(FilterBarComponent))
      .componentInstance as FilterBarComponent;
    const board = fixture.debugElement.query(By.directive(TaskBoardComponent))
      .componentInstance as TaskBoardComponent;

    bar.newTask.emit();
    board.edit.emit(task);
    board.remove.emit(task);
    board.moved.emit({ task, status: 'done', index: 0 });
    board.statusChange.emit({ task, status: 'done' });

    expect(actions.create).toHaveBeenCalledOnce();
    expect(actions.edit).toHaveBeenCalledWith(task);
    expect(actions.delete).toHaveBeenCalledWith(task);
    expect(actions.move).toHaveBeenCalledWith({ task, status: 'done', index: 0 });
    expect(actions.moveToEnd).toHaveBeenCalledWith(task, 'done');
  });
});
