import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';

import { TaskApiService } from '../core/api/task-api.service';
import { ActivityType } from '../core/models/activity.model';
import { STATUS_LABELS, Task, TaskDraft, TaskStatus } from '../core/models/task.model';
import { isOverdue, orderBetween, statusChanges } from '../shared/utils/task.utils';
import { ActivityStore } from './activity.store';
import { TaskFiltersService } from './task-filters.service';

/** Stands in for the signed-in user until the app has authentication. */
export const CURRENT_USER_NAME = 'John Doe';

export type TaskColumns = Record<TaskStatus, Task[]>;

@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly api = inject(TaskApiService);
  private readonly activity = inject(ActivityStore);
  private readonly filters = inject(TaskFiltersService);
  private readonly resource = httpResource<Task[]>(() => this.api.collectionUrl);

  // value() throws while the resource is in an error state, so everything reads through this.
  readonly tasks = computed<Task[]>(() => (this.resource.hasValue() ? this.resource.value() : []));

  readonly isLoading = computed(() => this.resource.isLoading() && !this.resource.hasValue());
  readonly error = this.resource.error;

  readonly filteredTasks = computed(() => this.tasks().filter(this.filters.predicate()));

  readonly columns = computed<TaskColumns>(() => {
    const columns: TaskColumns = { todo: [], in_progress: [], done: [] };
    for (const task of this.filteredTasks()) {
      columns[task.status].push(task);
    }
    for (const column of Object.values(columns)) {
      column.sort((a, b) => a.order - b.order);
    }
    return columns;
  });

  readonly counts = computed(() => {
    const tasks = this.tasks();
    return {
      total: tasks.length,
      completed: tasks.filter((task) => task.status === 'done').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      overdue: tasks.filter((task) => isOverdue(task)).length,
    };
  });

  reload(): void {
    this.resource.reload();
  }

  create(draft: TaskDraft): Observable<Task> {
    const now = new Date().toISOString();
    const task = {
      ...draft,
      order: this.endOfColumn(draft.status),
      createdAt: now,
      updatedAt: now,
    };

    return this.api.create(task).pipe(
      tap((created) => {
        this.setTasks([...this.tasks(), created]);
        this.log('created', created);
      }),
    );
  }

  update(task: Task, draft: TaskDraft): Observable<Task> {
    const changes: Partial<Task> = { ...draft, updatedAt: new Date().toISOString() };
    if (draft.status !== task.status) {
      changes.order = this.endOfColumn(draft.status);
    }

    return this.api.update(task.id, changes).pipe(
      tap((updated) => {
        this.replaceTask(updated);
        this.logStatusAwareChange(task, updated);
      }),
    );
  }

  /**
   * Moves a task to `index` within the currently visible cards of `status`. The board
   * updates immediately so dragging feels instant, and rolls back if the save fails.
   */
  move(task: Task, status: TaskStatus, index: number): Observable<Task> {
    const siblings = this.columns()[status].filter(({ id }) => id !== task.id);
    return this.applyMove(
      task,
      status,
      orderBetween(siblings[index - 1]?.order, siblings[index]?.order),
    );
  }

  /** For moves with no drop position. Looks past filters, which may be hiding the column. */
  moveToEnd(task: Task, status: TaskStatus): Observable<Task> {
    return this.applyMove(task, status, this.endOfColumn(status));
  }

  remove(task: Task): Observable<void> {
    return this.api.remove(task.id).pipe(
      tap(() => {
        this.setTasks(this.tasks().filter(({ id }) => id !== task.id));
        this.log('deleted', task);
      }),
    );
  }

  private applyMove(task: Task, status: TaskStatus, order: number): Observable<Task> {
    const changes: Partial<Task> = {
      ...statusChanges(task, status),
      order,
      updatedAt: new Date().toISOString(),
    };

    this.replaceTask({ ...task, ...changes });

    return this.api.update(task.id, changes).pipe(
      tap((updated) => {
        this.replaceTask(updated);
        if (updated.status !== task.status) {
          this.logStatusAwareChange(task, updated);
        }
      }),
      catchError((error: unknown) => {
        this.replaceTask(task);
        return throwError(() => error);
      }),
    );
  }

  private endOfColumn(status: TaskStatus): number {
    const orders = this.tasks()
      .filter((task) => task.status === status)
      .map((task) => task.order);
    return orderBetween(orders.length ? Math.max(...orders) : undefined);
  }

  private setTasks(tasks: Task[]): void {
    this.resource.set(tasks);
  }

  private replaceTask(task: Task): void {
    this.setTasks(this.tasks().map((current) => (current.id === task.id ? task : current)));
  }

  private logStatusAwareChange(before: Task, after: Task): void {
    if (after.status === before.status) {
      this.log('updated', after);
    } else if (after.status === 'done') {
      this.log('completed', after);
    } else {
      this.log('moved', after, STATUS_LABELS[after.status]);
    }
  }

  private log(type: ActivityType, task: Task, detail?: string): void {
    this.activity.record({
      type,
      taskId: task.id,
      taskTitle: task.title,
      actor: CURRENT_USER_NAME,
      createdAt: new Date().toISOString(),
      ...(detail ? { detail } : {}),
    });
  }
}
