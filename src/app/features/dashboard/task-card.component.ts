import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { STATUS_LABELS, Task, TASK_STATUSES, TaskStatus } from '../../core/models/task.model';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { PriorityBadgeComponent } from '../../shared/ui/priority-badge.component';
import { dueLabel, firstName, isOverdue } from '../../shared/utils/task.utils';

@Component({
  selector: 'app-task-card',
  imports: [MatButtonModule, MatMenuModule, AvatarComponent, PriorityBadgeComponent],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  readonly task = input.required<Task>();

  readonly edit = output();
  readonly remove = output();
  readonly moveTo = output<TaskStatus>();

  protected readonly statusLabels = STATUS_LABELS;

  protected readonly overdue = computed(() => isOverdue(this.task()));
  protected readonly due = computed(() => dueLabel(this.task()));
  protected readonly assigneeHandle = computed(() => `@${firstName(this.task().assignee.name)}`);
  protected readonly moveTargets = computed(() =>
    TASK_STATUSES.filter((status) => status !== this.task().status),
  );

  protected readonly dueIcon = computed(() => {
    if (this.task().status === 'done') {
      return '✅';
    }
    return this.overdue() ? '⚠️' : '📅';
  });
}
