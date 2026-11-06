import { computed, Injectable, signal } from '@angular/core';

import { Task, TaskPriority, TaskStatus, TASK_STATUSES } from '../core/models/task.model';

export const ALL = 'all';
export type StatusFilter = TaskStatus | typeof ALL;
export type PriorityFilter = TaskPriority | typeof ALL;

/**
 * Shared between pages because the search box lives in the header,
 * outside the lazily loaded routes that display the results.
 */
@Injectable({ providedIn: 'root' })
export class TaskFiltersService {
  readonly search = signal('');
  readonly status = signal<StatusFilter>(ALL);
  readonly priority = signal<PriorityFilter>(ALL);
  readonly assigneeId = signal<string>(ALL);

  readonly hasActiveFilters = computed(
    () =>
      this.search().trim() !== '' ||
      this.status() !== ALL ||
      this.priority() !== ALL ||
      this.assigneeId() !== ALL,
  );

  readonly visibleStatuses = computed<readonly TaskStatus[]>(() => {
    const status = this.status();
    return status === ALL ? TASK_STATUSES : [status];
  });

  readonly predicate = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.status();
    const priority = this.priority();
    const assigneeId = this.assigneeId();

    return (task: Task): boolean =>
      (status === ALL || task.status === status) &&
      (priority === ALL || task.priority === priority) &&
      (assigneeId === ALL || task.assignee.id === assigneeId) &&
      (term === '' ||
        task.title.toLowerCase().includes(term) ||
        task.description.toLowerCase().includes(term));
  });

  clear(): void {
    this.search.set('');
    this.status.set(ALL);
    this.priority.set(ALL);
    this.assigneeId.set(ALL);
  }
}
