import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../../core/models/task.model';
import { User } from '../../core/models/user.model';
import { ALL, PriorityFilter, StatusFilter } from '../../state/task-filters.service';

@Component({
  selector: 'app-filter-bar',
  imports: [MatButtonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterBarComponent {
  readonly status = model.required<StatusFilter>();
  readonly priority = model.required<PriorityFilter>();
  readonly assigneeId = model.required<string>();
  readonly users = input<User[]>([]);
  readonly newTask = output();

  protected readonly all = ALL;
  protected readonly statusOptions: readonly { value: StatusFilter; label: string }[] = [
    { value: ALL, label: 'All' },
    ...TASK_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
  ];
  protected readonly priorities = TASK_PRIORITIES;
  protected readonly priorityLabels = PRIORITY_LABELS;

  protected assigneeName(id: string): string {
    return this.users().find((user) => user.id === id)?.name ?? 'Assignee';
  }

  protected priorityLabel(priority: PriorityFilter): string {
    return priority === ALL ? 'Priority' : PRIORITY_LABELS[priority];
  }
}
