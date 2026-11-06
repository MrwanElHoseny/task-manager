import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { filter, merge } from 'rxjs';

import { usersResource } from '../../core/api/users.resource';
import { errorMessage } from '../../core/http/api-error';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  Task,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskDraft,
  TaskPriority,
  TaskStatus,
} from '../../core/models/task.model';
import { User } from '../../core/models/user.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/ui/confirm-dialog.component';
import { parseLocalDate, toIsoDate } from '../../shared/utils/date.utils';
import { TaskStore } from '../../state/task.store';
import { dueDateNotInPast, notBlank, notInFuture } from './task-form.validators';

export interface TaskFormDialogData {
  task?: Task;
}

interface TaskForm {
  title: FormControl<string>;
  description: FormControl<string>;
  priority: FormControl<TaskPriority>;
  status: FormControl<TaskStatus>;
  dueDate: FormControl<Date | null>;
  assigneeId: FormControl<string>;
  tags: FormArray<FormControl<string>>;
  /** Only present while the status is Done. */
  completedAt?: FormControl<Date | null>;
}

const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 1000;

@Component({
  selector: 'app-task-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './task-form-dialog.component.html',
  styleUrl: './task-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormDialogComponent {
  private readonly dialogRef = inject<MatDialogRef<TaskFormDialogComponent, boolean>>(MatDialogRef);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly store = inject(TaskStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly users = usersResource();

  protected readonly task = inject<TaskFormDialogData>(MAT_DIALOG_DATA).task;

  protected readonly form = this.buildForm(this.task);

  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly statuses = TASK_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly priorities = TASK_PRIORITIES;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly separatorKeys = [ENTER, COMMA];
  protected readonly titleMaxLength = TITLE_MAX_LENGTH;
  protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;

  private readonly status = toSignal(this.form.controls.status.valueChanges, {
    initialValue: this.form.controls.status.value,
  });
  protected readonly isDone = computed(() => this.status() === 'done');

  /** Keeps the current assignee selectable even if the user list fails to load. */
  protected readonly assignees = computed<User[]>(() => {
    if (this.users.hasValue()) {
      return this.users.value();
    }
    return this.task ? [this.task.assignee] : [];
  });
  protected readonly usersFailed = computed(() => Boolean(this.users.error()));

  constructor() {
    this.syncCompletedAtControl(this.form.controls.status.value);
    this.form.controls.status.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((status) => this.syncCompletedAtControl(status));

    merge(
      this.dialogRef.backdropClick(),
      this.dialogRef.keydownEvents().pipe(filter((event) => event.key === 'Escape')),
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.requestClose());
  }

  protected addTag(event: MatChipInputEvent): void {
    const tag = event.value.trim();
    const { tags } = this.form.controls;
    const isDuplicate = tags.value.some((existing) => existing.toLowerCase() === tag.toLowerCase());

    if (tag && !isDuplicate) {
      tags.push(this.fb.control(tag));
      tags.markAsDirty();
    }
    event.chipInput.clear();
  }

  protected removeTag(index: number): void {
    const { tags } = this.form.controls;
    tags.removeAt(index);
    tags.markAsDirty();
  }

  protected requestClose(): void {
    if (this.saving()) {
      return;
    }
    if (!this.form.dirty) {
      this.dialogRef.close(false);
      return;
    }

    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Discard changes?',
          message: 'Your changes to this task have not been saved.',
          confirmLabel: 'Discard',
        },
        role: 'alertdialog',
      })
      .afterClosed()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.dialogRef.close(false));
  }

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }

    this.saving.set(true);
    this.serverError.set(null);

    const draft = this.toDraft();
    const save$ = this.task ? this.store.update(this.task, draft) : this.store.create(draft);

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error: unknown) => {
        this.saving.set(false);
        this.serverError.set(errorMessage(error));
      },
    });
  }

  private buildForm(task?: Task): FormGroup<TaskForm> {
    return this.fb.group<TaskForm>({
      title: this.fb.control(task?.title ?? '', [
        Validators.required,
        notBlank,
        Validators.maxLength(TITLE_MAX_LENGTH),
      ]),
      description: this.fb.control(task?.description ?? '', [
        Validators.maxLength(DESCRIPTION_MAX_LENGTH),
      ]),
      priority: this.fb.control(task?.priority ?? 'medium'),
      status: this.fb.control(task?.status ?? 'todo'),
      dueDate: new FormControl(task ? parseLocalDate(task.dueDate) : null, [
        Validators.required,
        dueDateNotInPast(task?.dueDate),
      ]),
      assigneeId: this.fb.control(task?.assignee.id ?? '', [Validators.required]),
      tags: this.fb.array((task?.tags ?? []).map((tag) => this.fb.control(tag))),
    });
  }

  private syncCompletedAtControl(status: TaskStatus): void {
    const hasControl = Boolean(this.form.controls.completedAt);

    if (status === 'done' && !hasControl) {
      const initial = this.task?.completedAt ? new Date(this.task.completedAt) : new Date();
      this.form.addControl(
        'completedAt',
        new FormControl(initial, [Validators.required, notInFuture]),
      );
    } else if (status !== 'done' && hasControl) {
      this.form.removeControl('completedAt');
    }
  }

  private toDraft(): TaskDraft {
    const { title, description, priority, status, dueDate, assigneeId, tags, completedAt } =
      this.form.getRawValue();

    return {
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      // Non-null because the required validators have passed by the time this runs.
      dueDate: toIsoDate(dueDate as Date),
      completedAt: completedAt ? completedAt.toISOString() : null,
      assignee: this.assignees().find(({ id }) => id === assigneeId) as User,
      tags,
    };
  }

  private focusFirstInvalidField(): void {
    this.host.nativeElement.querySelector<HTMLElement>('[formControlName].ng-invalid')?.focus();
  }
}
