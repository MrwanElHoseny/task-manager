import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../core/http/api-error';
import { Task, TaskDraft } from '../../core/models/task.model';
import { TaskStore } from '../../state/task.store';
import { JOHN, makeTask, SARAH } from '../../testing/task.fixtures';
import { TaskFormDialogComponent } from './task-form-dialog.component';

describe('TaskFormDialogComponent', () => {
  let fixture: ComponentFixture<TaskFormDialogComponent>;
  let component: TaskFormDialogComponent;
  let backend: HttpTestingController;

  const store = { create: vi.fn(), update: vi.fn() };
  const confirm = { open: vi.fn() };
  const dialogRef = {
    close: vi.fn(),
    backdropClick: () => backdrop$,
    keydownEvents: () => keydown$,
  };
  let backdrop$: Subject<MouseEvent>;
  let keydown$: Subject<KeyboardEvent>;

  async function setup(task?: Task, { loadUsers = true } = {}): Promise<void> {
    TestBed.configureTestingModule({
      imports: [TaskFormDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { task } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: TaskStore, useValue: store },
      ],
    });
    // MatDialogModule provides its own MatDialog to the component, so a plain provider loses.
    TestBed.overrideProvider(MatDialog, { useValue: confirm });

    fixture = TestBed.createComponent(TaskFormDialogComponent);
    component = fixture.componentInstance;
    backend = TestBed.inject(HttpTestingController);
    TestBed.tick();

    const users = backend.expectOne('/api/users');
    if (loadUsers) {
      users.flush([JOHN, SARAH]);
    } else {
      users.flush(null, { status: 404, statusText: 'Not Found' });
    }
    await fixture.whenStable();
  }

  const form = () => component['form'];

  function fillRequiredFields(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    form().patchValue({ title: '  Ship it  ', dueDate: tomorrow, assigneeId: SARAH.id });
  }

  const submitButton = () =>
    fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement;

  const errors = () =>
    [...fixture.nativeElement.querySelectorAll('mat-error')].map((el: Element) =>
      el.textContent?.trim(),
    );

  beforeEach(() => {
    vi.clearAllMocks();
    backdrop$ = new Subject();
    keydown$ = new Subject();
  });

  describe('creating', () => {
    beforeEach(() => setup());

    it('starts empty with sensible defaults', () => {
      expect(fixture.nativeElement.querySelector('h2').textContent).toContain('New task');
      expect(form().controls.status.value).toBe('todo');
      expect(form().controls.priority.value).toBe('medium');
    });

    it('shows errors and does not save when submitted invalid', async () => {
      submitButton().click();
      await fixture.whenStable();

      expect(store.create).not.toHaveBeenCalled();
      expect(errors()).toContain('Give the task a title.');
      expect(errors()).toContain('Choose a due date.');
      expect(errors()).toContain('Choose who this is assigned to.');
    });

    it('sends a trimmed draft and closes on success', () => {
      store.create.mockReturnValue(of(makeTask()));
      fillRequiredFields();

      submitButton().click();

      const draft: TaskDraft = store.create.mock.calls[0][0];
      expect(draft.title).toBe('Ship it');
      expect(draft.assignee).toEqual(SARAH);
      expect(draft.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(draft.completedAt).toBeNull();
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('stays open and shows the message when saving fails', async () => {
      store.create.mockReturnValue(
        throwError(() => new ApiError(409, 'Someone else changed this item.')),
      );
      fillRequiredFields();

      submitButton().click();
      await fixture.whenStable();

      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
        'Someone else changed',
      );
      expect(submitButton().disabled).toBe(false);
    });

    it('blocks a second submit while saving', async () => {
      const pending = new Subject<Task>();
      store.create.mockReturnValue(pending);
      fillRequiredFields();

      component['submit']();
      component['submit']();
      await fixture.whenStable();

      expect(store.create).toHaveBeenCalledOnce();
      expect(submitButton().disabled).toBe(true);
      expect(submitButton().textContent).toContain('Saving');
    });

    it('adds the completion date control only while the status is done', async () => {
      form().controls.status.setValue('done');
      await fixture.whenStable();
      expect(form().controls.completedAt).toBeDefined();
      expect(fixture.nativeElement.textContent).toContain('Completed on');

      form().controls.status.setValue('todo');
      await fixture.whenStable();
      expect(form().controls.completedAt).toBeUndefined();
      expect(fixture.nativeElement.textContent).not.toContain('Completed on');
    });

    it('includes the completion date in the draft for done tasks', () => {
      store.create.mockReturnValue(of(makeTask()));
      fillRequiredFields();
      form().controls.status.setValue('done');

      component['submit']();

      expect(store.create.mock.calls[0][0].completedAt).toEqual(expect.any(String));
    });

    it('adds trimmed tags, ignoring blanks and case-insensitive duplicates', () => {
      const add = (value: string) =>
        component['addTag']({ value, chipInput: { clear: vi.fn() } } as never);

      add(' Docs ');
      add('docs');
      add('   ');

      expect(form().controls.tags.value).toEqual(['Docs']);
      expect(form().controls.tags.dirty).toBe(true);

      component['removeTag'](0);
      expect(form().controls.tags.value).toEqual([]);
    });
  });

  describe('closing', () => {
    beforeEach(() => setup());

    it('closes straight away when nothing has changed', () => {
      backdrop$.next(new MouseEvent('click'));

      expect(confirm.open).not.toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith(false);
    });

    it('asks first when there are unsaved changes, and honours the answer', () => {
      form().markAsDirty();
      confirm.open.mockReturnValue({ afterClosed: () => of(false) });

      keydown$.next(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(dialogRef.close).not.toHaveBeenCalled();

      confirm.open.mockReturnValue({ afterClosed: () => of(true) });
      keydown$.next(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(dialogRef.close).toHaveBeenCalledWith(false);
    });

    it('ignores other keys', () => {
      keydown$.next(new KeyboardEvent('keydown', { key: 'a' }));
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('does not close while a save is in flight', () => {
      store.create.mockReturnValue(new Subject<Task>());
      fillRequiredFields();
      component['submit']();

      component['requestClose']();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('editing', () => {
    it('prefills the form from the task', async () => {
      await setup(makeTask({ title: 'Existing', assignee: SARAH, tags: ['A', 'B'] }));

      expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Edit task');
      expect(form().controls.title.value).toBe('Existing');
      expect(form().controls.assigneeId.value).toBe(SARAH.id);
      expect(form().controls.tags.value).toEqual(['A', 'B']);
    });

    it('can save an overdue task without changing its due date', async () => {
      const task = makeTask({ dueDate: '2000-01-01' });
      await setup(task);
      store.update.mockReturnValue(of(task));

      component['submit']();

      expect(store.update).toHaveBeenCalledWith(
        task,
        expect.objectContaining({ dueDate: '2000-01-01' }),
      );
    });

    it('starts with the completion date of a finished task', async () => {
      const completedAt = '2025-03-01T10:00:00.000Z';
      await setup(makeTask({ status: 'done', completedAt }));

      expect(form().controls.completedAt?.value?.toISOString()).toBe(completedAt);
    });

    it('keeps the current assignee selectable when the team list fails', async () => {
      const task = makeTask({ assignee: SARAH });
      await setup(task, { loadUsers: false });
      store.update.mockReturnValue(of(task));

      expect(component['usersFailed']()).toBe(true);
      expect(component['assignees']()).toEqual([SARAH]);

      component['submit']();
      expect(store.update.mock.calls[0][1].assignee).toEqual(SARAH);
    });
  });
});
