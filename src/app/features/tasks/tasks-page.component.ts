import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { map } from 'rxjs';

import { usersResource } from '../../core/api/users.resource';
import { errorMessage } from '../../core/http/api-error';
import { STATUS_LABELS, Task, TASK_PRIORITIES, TASK_STATUSES } from '../../core/models/task.model';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { FilterBarComponent } from '../../shared/ui/filter-bar.component';
import { PriorityBadgeComponent } from '../../shared/ui/priority-badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { StateMessageComponent } from '../../shared/ui/state-message.component';
import { dueLabel, isOverdue } from '../../shared/utils/task.utils';
import { TaskFiltersService } from '../../state/task-filters.service';
import { TaskStore } from '../../state/task.store';
import { TaskActionsService } from '../task-form/task-actions.service';

const SORT_KEYS: Record<string, (task: Task) => string | number> = {
  title: (task) => task.title.toLowerCase(),
  status: (task) => TASK_STATUSES.indexOf(task.status),
  priority: (task) => TASK_PRIORITIES.indexOf(task.priority),
  dueDate: (task) => task.dueDate,
  assignee: (task) => task.assignee.name,
};

const ALL_COLUMNS = ['title', 'status', 'priority', 'dueDate', 'assignee', 'actions'];
const NARROW_COLUMNS = ['title', 'priority', 'actions'];

@Component({
  selector: 'app-tasks-page',
  imports: [
    MatButtonModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    AvatarComponent,
    FilterBarComponent,
    PriorityBadgeComponent,
    SkeletonComponent,
    StateMessageComponent,
  ],
  templateUrl: './tasks-page.component.html',
  styleUrl: './tasks-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPageComponent {
  private readonly usersRef = usersResource();

  protected readonly store = inject(TaskStore);
  protected readonly filters = inject(TaskFiltersService);
  protected readonly actions = inject(TaskActionsService);

  protected readonly statusLabel = (task: Task): string => STATUS_LABELS[task.status];
  protected readonly dueLabel = dueLabel;
  protected readonly isOverdue = isOverdue;
  protected readonly pageSizeOptions = [10, 25, 50];
  protected readonly skeletonRows = [1, 2, 3, 4, 5];

  private readonly isNarrow = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 767.98px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  protected readonly columns = computed(() => (this.isNarrow() ? NARROW_COLUMNS : ALL_COLUMNS));

  protected readonly users = computed(() =>
    this.usersRef.hasValue() ? this.usersRef.value() : [],
  );

  protected readonly loadError = computed(() => {
    const error = this.store.error();
    return error ? errorMessage(error) : null;
  });

  private readonly sort = signal<Sort>({ active: 'dueDate', direction: 'asc' });
  protected readonly pageSize = signal(10);
  private readonly requestedPage = signal(0);

  private readonly sortedTasks = computed(() => {
    const { active, direction } = this.sort();
    const key = SORT_KEYS[active];
    if (!key || !direction) {
      return this.store.filteredTasks();
    }

    const sign = direction === 'asc' ? 1 : -1;
    return [...this.store.filteredTasks()].sort((a, b) => {
      const [left, right] = [key(a), key(b)];
      return left < right ? -sign : left > right ? sign : 0;
    });
  });

  protected readonly totalTasks = computed(() => this.sortedTasks().length);

  // Clamped so that filtering or deleting can never strand the user on a page that is gone.
  protected readonly pageIndex = computed(() => {
    const lastPage = Math.max(Math.ceil(this.totalTasks() / this.pageSize()) - 1, 0);
    return Math.min(this.requestedPage(), lastPage);
  });

  protected readonly rows = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sortedTasks().slice(start, start + this.pageSize());
  });

  protected readonly trackById = (_: number, task: Task): string => task.id;

  protected onSort(sort: Sort): void {
    this.sort.set(sort);
  }

  protected onPage(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.requestedPage.set(event.pageIndex);
  }
}
