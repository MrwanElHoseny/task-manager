import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, switchMap } from 'rxjs';

import { errorMessage } from '../../core/http/api-error';
import { Task, TaskStatus } from '../../core/models/task.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/ui/confirm-dialog.component';
import { TaskStore } from '../../state/task.store';

const SNACKBAR_DURATION_MS = 4000;

export interface TaskMove {
  task: Task;
  status: TaskStatus;
  index: number;
}

/**
 * The user-facing side of changing a task: dialogs, confirmations and feedback.
 * Pages call this so that the sidebar, the board and the table all behave the same.
 */
@Injectable({ providedIn: 'root' })
export class TaskActionsService {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly store = inject(TaskStore);

  create(): Promise<void> {
    return this.openForm();
  }

  edit(task: Task): Promise<void> {
    return this.openForm(task);
  }

  delete(task: Task): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Delete task?',
          message: `"${task.title}" will be permanently removed.`,
          confirmLabel: 'Delete',
        },
        role: 'alertdialog',
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.store.remove(task)),
      )
      .subscribe({
        next: () => this.notify('Task deleted'),
        error: (error: unknown) => this.notify(errorMessage(error)),
      });
  }

  move({ task, status, index }: TaskMove): void {
    this.store.move(task, status, index).subscribe({
      error: (error: unknown) => this.notifyMoveFailed(error),
    });
  }

  moveToEnd(task: Task, status: TaskStatus): void {
    this.store.moveToEnd(task, status).subscribe({
      error: (error: unknown) => this.notifyMoveFailed(error),
    });
  }

  private notifyMoveFailed(error: unknown): void {
    this.notify(`Couldn't move the task. ${errorMessage(error)}`);
  }

  // The form pulls in the datepicker and chips, so it only loads when first opened.
  private async openForm(task?: Task): Promise<void> {
    const { TaskFormDialogComponent } = await import('./task-form-dialog.component');

    this.dialog
      .open(TaskFormDialogComponent, {
        data: { task },
        width: '560px',
        panelClass: 'task-form-panel',
        // The dialog decides for itself, since closing may need to ask about unsaved changes.
        disableClose: true,
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.notify(task ? 'Task updated' : 'Task created'));
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: SNACKBAR_DURATION_MS });
  }
}
