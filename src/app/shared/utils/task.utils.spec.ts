import { describe, expect, it } from 'vitest';

import {
  describeActivity,
  dueLabel,
  firstName,
  isOverdue,
  ORDER_STEP,
  orderBetween,
  statusChanges,
} from './task.utils';

const TODAY = new Date(2025, 5, 10, 15, 0);

describe('isOverdue', () => {
  it('flags open tasks with a past due date', () => {
    expect(isOverdue({ status: 'todo', dueDate: '2025-06-09' }, TODAY)).toBe(true);
  });

  it('does not flag a task due today, however late it is', () => {
    expect(isOverdue({ status: 'in_progress', dueDate: '2025-06-10' }, TODAY)).toBe(false);
  });

  it('never flags finished tasks', () => {
    expect(isOverdue({ status: 'done', dueDate: '2020-01-01' }, TODAY)).toBe(false);
  });
});

describe('dueLabel', () => {
  const label = (dueDate: string) => dueLabel({ status: 'todo', dueDate }, TODAY);

  it.each([
    ['2025-06-07', 'Overdue by 3 days'],
    ['2025-06-09', 'Overdue by 1 day'],
    ['2025-06-10', 'Due today'],
    ['2025-06-11', 'Due in 1 day'],
    ['2025-06-15', 'Due in 5 days'],
    ['2025-06-17', 'Due in 1 week'],
    ['2025-06-20', 'Due in 10 days'],
  ])('describes a due date of %s as "%s"', (dueDate, expected) => {
    expect(label(dueDate)).toBe(expected);
  });

  it.each([
    [new Date(2025, 5, 10, 9).toISOString(), 'Completed today'],
    [new Date(2025, 5, 9, 9).toISOString(), 'Completed yesterday'],
    [new Date(2025, 5, 6, 9).toISOString(), 'Completed 4 days ago'],
  ])('describes completion at %s as "%s"', (completedAt, expected) => {
    expect(dueLabel({ status: 'done', dueDate: '2025-01-01', completedAt }, TODAY)).toBe(expected);
  });

  it('handles done tasks that have no completion date', () => {
    expect(dueLabel({ status: 'done', dueDate: '2025-01-01' }, TODAY)).toBe('Completed');
  });
});

describe('orderBetween', () => {
  it('takes the midpoint between two neighbours', () => {
    expect(orderBetween(1000, 2000)).toBe(1500);
  });

  it('appends after the last card', () => {
    expect(orderBetween(3000)).toBe(3000 + ORDER_STEP);
  });

  it('prepends before the first card', () => {
    expect(orderBetween(undefined, 1000)).toBe(1000 - ORDER_STEP);
  });

  it('handles an empty column', () => {
    expect(orderBetween()).toBe(ORDER_STEP);
  });

  it('keeps ordering correct when a neighbour sits at zero', () => {
    const first = orderBetween(undefined, 0);
    expect(first).toBeLessThan(0);
    expect(orderBetween(first, 0)).toBeLessThan(0);
  });
});

describe('statusChanges', () => {
  const now = new Date('2025-06-10T12:00:00Z');

  it('stamps completion when a task reaches done', () => {
    expect(statusChanges({ status: 'todo' }, 'done', now)).toEqual({
      status: 'done',
      completedAt: now.toISOString(),
    });
  });

  it('keeps the original timestamp when reordering within done', () => {
    const completedAt = '2025-01-01T00:00:00Z';
    expect(statusChanges({ status: 'done', completedAt }, 'done', now).completedAt).toBe(
      completedAt,
    );
  });

  it('clears completion when a task is reopened', () => {
    const reopened = statusChanges({ status: 'done', completedAt: 'x' }, 'todo', now);
    expect(reopened).toEqual({ status: 'todo', completedAt: null });
  });
});

describe('small helpers', () => {
  it('extracts a first name', () => {
    expect(firstName('Sarah Smith')).toBe('Sarah');
    expect(firstName('Cher')).toBe('Cher');
  });

  it('describes activity for the feed', () => {
    expect(describeActivity({ type: 'created', taskTitle: 'Fix bug' })).toBe('created Fix bug');
    expect(describeActivity({ type: 'moved', taskTitle: 'Fix bug' })).toBe('moved Fix bug');
    expect(describeActivity({ type: 'moved', taskTitle: 'Fix bug', detail: 'Done' })).toBe(
      'moved Fix bug to Done',
    );
  });
});
