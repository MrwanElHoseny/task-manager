import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../core/http/api-error';
import { TaskStore } from '../../state/task.store';
import { makeTask } from '../../testing/task.fixtures';
import { TaskActionsService } from './task-actions.service';
import { TaskFormDialogComponent } from './task-form-dialog.component';

describe('TaskActionsService', () => {
  let actions: TaskActionsService;

  const dialog = { open: vi.fn() };
  const snackBar = { open: vi.fn() };
  const store = { remove: vi.fn(), move: vi.fn(), moveToEnd: vi.fn() };
  const failure = () => throwError(() => new ApiError(500, 'Server is down.'));

  const answerDialogWith = (result: boolean) =>
    dialog.open.mockReturnValue({ afterClosed: () => of(result) });
  const lastMessage = () => snackBar.open.mock.lastCall?.[0];

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: TaskStore, useValue: store },
      ],
    });
    actions = TestBed.inject(TaskActionsService);
  });

  it('opens an empty form to create a task and confirms when saved', async () => {
    answerDialogWith(true);

    await actions.create();

    const [component, config] = dialog.open.mock.calls[0];
    expect(component).toBe(TaskFormDialogComponent);
    expect(config.data.task).toBeUndefined();
    expect(lastMessage()).toBe('Task created');
  });

  it('opens the form with the task to edit it', async () => {
    const task = makeTask();
    answerDialogWith(true);

    await actions.edit(task);

    expect(dialog.open.mock.calls[0][1].data.task).toBe(task);
    expect(lastMessage()).toBe('Task updated');
  });

  it('stays quiet when the form is cancelled', async () => {
    answerDialogWith(false);

    await actions.create();

    expect(snackBar.open).not.toHaveBeenCalled();
  });

  describe('delete', () => {
    it('removes the task after confirmation', () => {
      const task = makeTask();
      answerDialogWith(true);
      store.remove.mockReturnValue(of(undefined));

      actions.delete(task);

      expect(store.remove).toHaveBeenCalledWith(task);
      expect(lastMessage()).toBe('Task deleted');
    });

    it('does nothing when the user keeps the task', () => {
      answerDialogWith(false);

      actions.delete(makeTask());

      expect(store.remove).not.toHaveBeenCalled();
    });

    it('reports a failed delete', () => {
      answerDialogWith(true);
      store.remove.mockReturnValue(failure());

      actions.delete(makeTask());

      expect(lastMessage()).toBe('Server is down.');
    });
  });

  describe('moving', () => {
    it('passes a dropped position through to the store', () => {
      const task = makeTask();
      store.move.mockReturnValue(of(task));

      actions.move({ task, status: 'done', index: 2 });

      expect(store.move).toHaveBeenCalledWith(task, 'done', 2);
      expect(snackBar.open).not.toHaveBeenCalled();
    });

    it('reports a failed drop', () => {
      store.move.mockReturnValue(failure());

      actions.move({ task: makeTask(), status: 'done', index: 0 });

      expect(lastMessage()).toContain("Couldn't move the task");
    });

    it('moves to the end of a column from the card menu', () => {
      const task = makeTask();
      store.moveToEnd.mockReturnValue(of(task));

      actions.moveToEnd(task, 'in_progress');

      expect(store.moveToEnd).toHaveBeenCalledWith(task, 'in_progress');
    });

    it('reports a failed menu move', () => {
      store.moveToEnd.mockReturnValue(failure());

      actions.moveToEnd(makeTask(), 'done');

      expect(lastMessage()).toContain('Server is down.');
    });
  });
});
