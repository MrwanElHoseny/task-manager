import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Task, TaskStatus } from '../../core/models/task.model';
import { TaskColumns } from '../../state/task.store';
import { TaskMove } from '../task-form/task-actions.service';
import { TaskColumnComponent, TaskStatusChange } from './task-column.component';

@Component({
  selector: 'app-task-board',
  imports: [CdkDropListGroup, TaskColumnComponent],
  template: `
    <div class="board" cdkDropListGroup [class.board--single]="statuses().length === 1">
      @for (status of statuses(); track status) {
        <app-task-column
          [status]="status"
          [tasks]="columns()[status]"
          (edit)="edit.emit($event)"
          (remove)="remove.emit($event)"
          (moved)="moved.emit($event)"
          (statusChange)="statusChange.emit($event)"
        />
      }
    </div>
  `,
  styleUrl: './task-board.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskBoardComponent {
  readonly columns = input.required<TaskColumns>();
  readonly statuses = input.required<readonly TaskStatus[]>();

  readonly edit = output<Task>();
  readonly remove = output<Task>();
  readonly moved = output<TaskMove>();
  readonly statusChange = output<TaskStatusChange>();
}
