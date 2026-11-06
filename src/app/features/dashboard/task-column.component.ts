import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { STATUS_LABELS, Task, TaskStatus } from '../../core/models/task.model';
import { TaskMove } from '../task-form/task-actions.service';
import { TaskCardComponent } from './task-card.component';

export interface TaskStatusChange {
  task: Task;
  status: TaskStatus;
}

@Component({
  selector: 'app-task-column',
  imports: [CdkDrag, CdkDropList, TaskCardComponent],
  templateUrl: './task-column.component.html',
  styleUrl: './task-column.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskColumnComponent {
  readonly status = input.required<TaskStatus>();
  readonly tasks = input.required<Task[]>();

  readonly edit = output<Task>();
  readonly remove = output<Task>();
  readonly moved = output<TaskMove>();
  readonly statusChange = output<TaskStatusChange>();

  protected readonly heading = computed(() => STATUS_LABELS[this.status()]);
  protected readonly headingId = computed(() => `column-${this.status()}`);

  // A short press delay on touch keeps the board scrollable with a finger.
  protected readonly dragDelay = { touch: 200, mouse: 0 };

  protected onDrop(event: CdkDragDrop<TaskStatus, TaskStatus, Task>): void {
    const stayedInPlace =
      event.previousContainer === event.container && event.previousIndex === event.currentIndex;

    if (!stayedInPlace) {
      this.moved.emit({
        task: event.item.data,
        status: event.container.data,
        index: event.currentIndex,
      });
    }
  }
}
