import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JOHN, SARAH } from '../../testing/task.fixtures';
import { AvatarComponent } from './avatar.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { FilterBarComponent } from './filter-bar.component';
import { PriorityBadgeComponent } from './priority-badge.component';
import { StateMessageComponent } from './state-message.component';

describe('AvatarComponent', () => {
  it('renders initials and stays out of the accessibility tree', async () => {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('initials', 'JD');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toBe('JD');
    expect(fixture.nativeElement.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('PriorityBadgeComponent', () => {
  it('styles by priority and spells it out for screen readers', async () => {
    const fixture = TestBed.createComponent(PriorityBadgeComponent);
    fixture.componentRef.setInput('priority', 'high');
    await fixture.whenStable();

    expect(fixture.nativeElement.classList).toContain('high');
    expect(fixture.nativeElement.textContent).toBe('Priority: high');
  });
});

describe('StateMessageComponent', () => {
  it('only renders the detail when there is one', async () => {
    const fixture = TestBed.createComponent(StateMessageComponent);
    fixture.componentRef.setInput('title', 'Nothing here');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.detail')).toBeNull();

    fixture.componentRef.setInput('detail', 'Try again later');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.detail').textContent).toBe('Try again later');
  });
});

describe('ConfirmDialogComponent', () => {
  it('shows the supplied wording', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { title: 'Delete task?', message: 'Gone for good.', confirmLabel: 'Delete' },
        },
      ],
    });
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Delete task?');
    expect(text).toContain('Gone for good.');
    expect(fixture.nativeElement.querySelector('.confirm').textContent).toContain('Delete');
  });
});

describe('FilterBarComponent', () => {
  function create() {
    const fixture = TestBed.createComponent(FilterBarComponent);
    fixture.componentRef.setInput('status', 'all');
    fixture.componentRef.setInput('priority', 'all');
    fixture.componentRef.setInput('assigneeId', 'all');
    fixture.componentRef.setInput('users', [JOHN, SARAH]);
    return fixture;
  }

  let fixture: ReturnType<typeof create>;
  const element = (): HTMLElement => fixture.nativeElement;
  const statusButton = (label: string) =>
    [...element().querySelectorAll<HTMLButtonElement>('.status-option')].find(
      (button) => button.textContent?.trim() === label,
    );

  beforeEach(async () => {
    fixture = create();
    await fixture.whenStable();
  });

  it('marks the active status for assistive technology', () => {
    expect(statusButton('All')?.getAttribute('aria-pressed')).toBe('true');
    expect(statusButton('Done')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('updates the status model when a status is chosen', async () => {
    statusButton('Done')?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.status()).toBe('done');
    expect(statusButton('Done')?.classList).toContain('status-option--active');
  });

  it('labels the dropdowns with the selection or their name', async () => {
    const triggers = () =>
      [...element().querySelectorAll('.mat-mdc-select-value')].map((el) => el.textContent?.trim());
    expect(triggers()).toEqual(['Priority', 'Assignee']);

    fixture.componentRef.setInput('priority', 'high');
    fixture.componentRef.setInput('assigneeId', SARAH.id);
    await fixture.whenStable();

    expect(triggers()).toEqual(['High', 'Sarah Smith']);
  });

  it('emits when New Task is pressed', () => {
    const newTask = vi.fn();
    fixture.componentInstance.newTask.subscribe(newTask);

    element().querySelector<HTMLButtonElement>('.controls > button')?.click();

    expect(newTask).toHaveBeenCalledOnce();
  });
});
