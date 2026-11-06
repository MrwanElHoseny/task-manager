import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Task } from '../../core/models/task.model';
import { TaskFiltersService } from '../../state/task-filters.service';
import { JOHN, makeTask, SARAH } from '../../testing/task.fixtures';
import { TaskActionsService } from '../task-form/task-actions.service';
import { TasksPageComponent } from './tasks-page.component';

describe('TasksPageComponent', () => {
  let fixture: ComponentFixture<TasksPageComponent>;
  let component: TasksPageComponent;
  let backend: HttpTestingController;
  const actions = { create: vi.fn(), edit: vi.fn(), delete: vi.fn() };

  const element = (): HTMLElement => fixture.nativeElement;
  const titles = () => component['rows']().map((task) => task.title);

  async function load(tasks: Task[]): Promise<void> {
    TestBed.tick();
    backend.expectOne('/api/tasks').flush(tasks);
    backend.expectOne('/api/activities').flush([]);
    backend.expectOne('/api/users').flush([JOHN, SARAH]);
    await fixture.whenStable();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [TasksPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TaskActionsService, useValue: actions },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TasksPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => backend.verify());

  it('sorts by due date by default', async () => {
    await load([
      makeTask({ title: 'Later', dueDate: '2999-06-01' }),
      makeTask({ title: 'Sooner', dueDate: '2999-01-01' }),
    ]);

    expect(titles()).toEqual(['Sooner', 'Later']);
    expect(element().querySelector('.title-cell')?.textContent).toContain('Sooner');
  });

  it.each([
    ['title', 'asc', ['Alpha', 'beta']],
    ['title', 'desc', ['beta', 'Alpha']],
    ['priority', 'asc', ['beta', 'Alpha']],
    ['status', 'asc', ['Alpha', 'beta']],
    ['assignee', 'desc', ['beta', 'Alpha']],
  ] as const)('sorts by %s %s', async (active, direction, expected) => {
    await load([
      makeTask({ title: 'Alpha', priority: 'low', status: 'todo', assignee: JOHN }),
      makeTask({ title: 'beta', priority: 'high', status: 'done', assignee: SARAH }),
    ]);

    component['onSort']({ active, direction });

    expect(titles()).toEqual(expected);
  });

  it('falls back to the natural order when sorting is cleared', async () => {
    await load([makeTask({ title: 'B' }), makeTask({ title: 'A' })]);

    component['onSort']({ active: 'title', direction: '' });

    expect(titles()).toEqual(['B', 'A']);
  });

  describe('paging', () => {
    const manyTasks = () => Array.from({ length: 12 }, () => makeTask());

    it('shows one page at a time', async () => {
      await load(manyTasks());

      expect(component['rows']()).toHaveLength(10);
      component['onPage']({ pageIndex: 1, pageSize: 10, length: 12 });
      expect(component['rows']()).toHaveLength(2);
    });

    it('never strands the user on a page that no longer exists', async () => {
      await load(manyTasks());
      component['onPage']({ pageIndex: 1, pageSize: 10, length: 12 });

      TestBed.inject(TaskFiltersService).priority.set('high');

      expect(component['pageIndex']()).toBe(0);
    });
  });

  it('offers to clear filters when nothing matches', async () => {
    await load([makeTask()]);
    const filters = TestBed.inject(TaskFiltersService);
    filters.search.set('nothing');
    await fixture.whenStable();

    expect(element().textContent).toContain('No tasks match');

    element().querySelector<HTMLButtonElement>('app-state-message button')?.click();
    expect(filters.search()).toBe('');
  });

  it('shows the load error with a retry', async () => {
    TestBed.tick();
    backend.expectOne('/api/tasks').flush(null, { status: 500, statusText: 'Server Error' });
    backend.expectOne('/api/activities').flush([]);
    backend.expectOne('/api/users').flush([]);
    await fixture.whenStable();

    expect(element().textContent).toContain("We couldn't load your tasks");

    element().querySelector<HTMLButtonElement>('app-state-message button')?.click();
    TestBed.tick();
    backend.expectOne('/api/tasks').flush([]);
  });

  it('wires the row buttons to the task actions', async () => {
    const task = makeTask({ title: 'Ship it' });
    await load([task]);

    element().querySelector<HTMLButtonElement>('[aria-label="Edit Ship it"]')?.click();
    element().querySelector<HTMLButtonElement>('[aria-label="Delete Ship it"]')?.click();

    expect(actions.edit).toHaveBeenCalledWith(task);
    expect(actions.delete).toHaveBeenCalledWith(task);
  });
});
