import { Activity } from '../../core/models/activity.model';
import { Task, TaskStatus } from '../../core/models/task.model';
import { daysBetween, parseLocalDate } from './date.utils';

export const ORDER_STEP = 1000;

export function isOverdue(task: Pick<Task, 'status' | 'dueDate'>, today = new Date()): boolean {
  return task.status !== 'done' && daysBetween(today, parseLocalDate(task.dueDate)) < 0;
}

export function firstName(fullName: string): string {
  return fullName.split(' ')[0];
}

function pluralizeDays(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function completedLabel(completedAt: string, today: Date): string {
  const daysAgo = daysBetween(new Date(completedAt), today);
  if (daysAgo <= 0) {
    return 'Completed today';
  }
  return daysAgo === 1 ? 'Completed yesterday' : `Completed ${daysAgo} days ago`;
}

export function dueLabel(
  task: Pick<Task, 'status' | 'dueDate' | 'completedAt'>,
  today = new Date(),
): string {
  if (task.status === 'done') {
    return task.completedAt ? completedLabel(task.completedAt, today) : 'Completed';
  }

  const daysLeft = daysBetween(today, parseLocalDate(task.dueDate));
  if (daysLeft < 0) {
    return `Overdue by ${pluralizeDays(-daysLeft)}`;
  }
  if (daysLeft === 0) {
    return 'Due today';
  }
  return daysLeft === 7 ? 'Due in 1 week' : `Due in ${pluralizeDays(daysLeft)}`;
}

/**
 * Sort key for a card dropped between two neighbours.
 *
 * Taking the midpoint means a move only ever touches the moved task, so reordering
 * costs one PATCH instead of rewriting the whole column. The trade-off is that repeated
 * drops into the same gap eventually run out of floating point precision; a real backend
 * would renumber the column when that happens.
 */
export function orderBetween(previous?: number, next?: number): number {
  if (previous !== undefined && next !== undefined) {
    return (previous + next) / 2;
  }
  if (previous !== undefined) {
    return previous + ORDER_STEP;
  }
  return next !== undefined ? next - ORDER_STEP : ORDER_STEP;
}

/** Fields that must change alongside a status, keeping completedAt consistent with it. */
export function statusChanges(
  task: Pick<Task, 'status' | 'completedAt'>,
  status: TaskStatus,
  now = new Date(),
): Pick<Task, 'status' | 'completedAt'> {
  if (status !== 'done') {
    return { status, completedAt: null };
  }
  return { status, completedAt: task.status === 'done' ? task.completedAt : now.toISOString() };
}

/** Sentence fragment that follows the actor's name in the activity feed. */
export function describeActivity(
  activity: Pick<Activity, 'type' | 'taskTitle' | 'detail'>,
): string {
  const { type, taskTitle, detail } = activity;
  return type === 'moved' && detail ? `moved ${taskTitle} to ${detail}` : `${type} ${taskTitle}`;
}
