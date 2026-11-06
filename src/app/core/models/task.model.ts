import { User } from './user.model';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Calendar date in YYYY-MM-DD form, deliberately without a time zone. */
  dueDate: string;
  completedAt?: string | null;
  assignee: User;
  tags: string[];
  /** Position within a board column. Fractional values are expected, see orderBetween. */
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskDraft = Pick<
  Task,
  'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'completedAt' | 'assignee' | 'tags'
>;

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];
export const TASK_PRIORITIES: readonly TaskPriority[] = ['high', 'medium', 'low'];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
