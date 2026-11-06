import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Task, TaskDraft } from '../core/models/task.model';
import { JOHN, makeActivity, makeTask } from '../testing/task.fixtures';
import { TaskFiltersService } from './task-filters.service';
import { TaskStore } from './task.store';

const TASKS_URL = '/api/tasks';
const SERVER_ERROR = { status: 500, statusText: 'Server Error' };

describe('TaskStore', () => {
  let store: TaskStore;
  let backend: HttpTestingController;

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  /** Lets the resources issue their initial requests, then answers them. */
  async function load(tasks: Task[]): Promise<void> {
    TestBed.tick();
    backend.expectOne(TASKS_URL).flush(tasks);
    backend.expectOne('/api/activities').flush([makeActivity()]);
    await settle();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(TaskStore);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  function draft(overrides: Partial<TaskDraft> = {}): TaskDraft {
    return {
      title: 'New',
      description: '',
      status: 'todo',
      priority: 'low',
      dueDate: '2999-01-01',
      completedAt: null,
      assignee: JOHN,
      tags: [],
      ...overrides,
    };
  }

  function flushActivity(): unknown {
    const request = backend.expectOne('/api/activities');
    const body = request.request.body;
    request.flush({ id: 'activity-new', ...body });
    return body;
  }

  describe('loading', () => {
    it('reports loading until the first response arrives', async () => {
      TestBed.tick();
      expect(store.isLoading()).toBe(true);
      expect(store.tasks()).toEqual([]);

      backend.expectOne(TASKS_URL).flush([makeTask()]);
      backend.expectOne('/api/activities').flush([]);
      await settle();

      expect(store.isLoading()).toBe(false);
      expect(store.tasks()).toHaveLength(1);
    });

    it('exposes failures without throwing from derived state', async () => {
      TestBed.tick();
      backend.expectOne(TASKS_URL).flush(null, SERVER_ERROR);
      backend.expectOne('/api/activities').flush([]);
      await settle();

      expect(store.error()).toBeTruthy();
      expect(store.tasks()).toEqual([]);
      expect(store.counts().total).toBe(0);
    });

    it('can recover from a failure by reloading', async () => {
      TestBed.tick();
      backend.expectOne(TASKS_URL).flush(null, SERVER_ERROR);
      backend.expectOne('/api/activities').flush([]);
      await settle();

      store.reload();
      TestBed.tick();
      backend.expectOne(TASKS_URL).flush([makeTask()]);
      await settle();

      expect(store.error()).toBeUndefined();
      expect(store.tasks()).toHaveLength(1);
    });
  });

  describe('derived state', () => {
    it('counts tasks across the whole list, ignoring filters', async () => {
      await load([
        makeTask({ status: 'todo', dueDate: '2000-01-01' }),
        makeTask({ status: 'in_progress' }),
        makeTask({ status: 'done', dueDate: '2000-01-01' }),
      ]);
      TestBed.inject(TaskFiltersService).status.set('done');

      expect(store.counts()).toEqual({ total: 3, completed: 1, inProgress: 1, overdue: 1 });
    });

    it('groups filtered tasks into columns sorted by order', async () => {
      const second = makeTask({ status: 'todo', order: 200 });
      const first = makeTask({ status: 'todo', order: 100 });
      const done = makeTask({ status: 'done' });
      await load([second, first, done]);

      expect(store.columns().todo).toEqual([first, second]);
      expect(store.columns().done).toEqual([done]);
      expect(store.columns().in_progress).toEqual([]);

      TestBed.inject(TaskFiltersService).status.set('done');
      expect(store.columns().todo).toEqual([]);
    });
  });

  describe('create', () => {
    it('appends to the end of its column and logs the activity', async () => {
      await load([makeTask({ status: 'todo', order: 5000 })]);

      store.create(draft()).subscribe();
      const request = backend.expectOne({ method: 'POST', url: TASKS_URL });
      expect(request.request.body.order).toBe(6000);
      request.flush({ ...makeTask(), ...request.request.body, id: 'created' });

      expect(store.tasks().map(({ id }) => id)).toContain('created');
      expect(flushActivity()).toMatchObject({ type: 'created', taskId: 'created' });
    });

    it('leaves the list alone and logs nothing when saving fails', async () => {
      await load([]);
      const error = vi.fn();

      store.create(draft()).subscribe({ error });
      backend.expectOne(TASKS_URL).flush(null, SERVER_ERROR);

      expect(error).toHaveBeenCalled();
      expect(store.tasks()).toEqual([]);
      backend.expectNone('/api/activities');
    });
  });

  describe('update', () => {
    it('keeps the card in place when the status is unchanged', async () => {
      const task = makeTask();
      await load([task]);

      store.update(task, draft({ title: 'Renamed' })).subscribe();
      const request = backend.expectOne(`${TASKS_URL}/${task.id}`);
      expect(request.request.body.order).toBeUndefined();
      request.flush({ ...task, title: 'Renamed' });

      expect(store.tasks()[0].title).toBe('Renamed');
      expect(flushActivity()).toMatchObject({ type: 'updated' });
    });

    it('sends the card to the end of the new column on a status change', async () => {
      const task = makeTask({ status: 'todo' });
      await load([task, makeTask({ status: 'in_progress', order: 3000 })]);

      store.update(task, draft({ status: 'in_progress' })).subscribe();
      const request = backend.expectOne(`${TASKS_URL}/${task.id}`);
      expect(request.request.body.order).toBe(4000);
      request.flush({ ...task, ...request.request.body });

      expect(flushActivity()).toMatchObject({ type: 'moved', detail: 'In Progress' });
    });

    it('logs reaching done as a completion', async () => {
      const task = makeTask({ status: 'todo' });
      await load([task]);

      store.update(task, draft({ status: 'done' })).subscribe();
      backend.expectOne(`${TASKS_URL}/${task.id}`).flush({ ...task, status: 'done' });

      expect(flushActivity()).toMatchObject({ type: 'completed' });
    });
  });

  describe('move', () => {
    it('updates the board before the server answers', async () => {
      const task = makeTask({ status: 'todo' });
      await load([task]);

      store.move(task, 'done', 0).subscribe();

      expect(store.columns().done.map(({ id }) => id)).toEqual([task.id]);
      expect(store.tasks()[0].completedAt).toBeTruthy();

      const request = backend.expectOne(`${TASKS_URL}/${task.id}`);
      request.flush({ ...task, ...request.request.body });
      flushActivity();
    });

    it('drops between neighbours using the midpoint of their order', async () => {
      const moved = makeTask({ status: 'todo', order: 100 });
      const a = makeTask({ status: 'in_progress', order: 1000 });
      const b = makeTask({ status: 'in_progress', order: 2000 });
      await load([moved, a, b]);

      store.move(moved, 'in_progress', 1).subscribe();

      const request = backend.expectOne(`${TASKS_URL}/${moved.id}`);
      expect(request.request.body).toMatchObject({ status: 'in_progress', order: 1500 });
      request.flush({ ...moved, ...request.request.body });
      flushActivity();
    });

    it('reorders within a column without logging activity', async () => {
      const a = makeTask({ order: 1000 });
      const b = makeTask({ order: 2000 });
      await load([a, b]);

      store.move(b, 'todo', 0).subscribe();
      expect(store.columns().todo.map(({ id }) => id)).toEqual([b.id, a.id]);

      const request = backend.expectOne(`${TASKS_URL}/${b.id}`);
      expect(request.request.body.order).toBe(0);
      request.flush({ ...b, order: 0 });
      backend.expectNone('/api/activities');
    });

    it('rolls back only the moved task when saving fails', async () => {
      const moved = makeTask({ status: 'todo' });
      const other = makeTask({ status: 'todo' });
      await load([moved, other]);
      const error = vi.fn();

      store.move(moved, 'done', 0).subscribe({ error });
      backend.expectOne(`${TASKS_URL}/${moved.id}`).flush(null, SERVER_ERROR);

      expect(store.tasks()).toEqual([moved, other]);
      expect(error).toHaveBeenCalled();
      backend.expectNone('/api/activities');
    });
  });

  describe('moveToEnd', () => {
    it('places the task after every card in the column, even ones hidden by filters', async () => {
      const task = makeTask({ status: 'todo', priority: 'low' });
      await load([task, makeTask({ status: 'done', priority: 'high', order: 9000 })]);
      TestBed.inject(TaskFiltersService).priority.set('low');

      store.moveToEnd(task, 'done').subscribe();

      const request = backend.expectOne(`${TASKS_URL}/${task.id}`);
      expect(request.request.body).toMatchObject({ status: 'done', order: 10000 });
      request.flush({ ...task, ...request.request.body });
      expect(flushActivity()).toMatchObject({ type: 'completed' });
    });
  });

  describe('remove', () => {
    it('removes the task once the server confirms', async () => {
      const task = makeTask();
      await load([task]);

      store.remove(task).subscribe();
      expect(store.tasks()).toHaveLength(1);

      backend.expectOne(`${TASKS_URL}/${task.id}`).flush({});
      expect(store.tasks()).toEqual([]);
      expect(flushActivity()).toMatchObject({ type: 'deleted', taskTitle: task.title });
    });

    it('keeps the task when the delete fails', async () => {
      const task = makeTask();
      await load([task]);

      store.remove(task).subscribe({ error: () => undefined });
      backend.expectOne(`${TASKS_URL}/${task.id}`).flush(null, SERVER_ERROR);

      expect(store.tasks()).toEqual([task]);
    });
  });
});
