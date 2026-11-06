import { Activity } from '../core/models/activity.model';
import { Task } from '../core/models/task.model';
import { User } from '../core/models/user.model';

export const JOHN: User = {
  id: 'user-1',
  name: 'John Doe',
  avatar: 'JD',
  email: 'john.doe@company.com',
};

export const SARAH: User = {
  id: 'user-2',
  name: 'Sarah Smith',
  avatar: 'SS',
  email: 'sarah.smith@company.com',
};

let nextId = 1;

export function makeTask(overrides: Partial<Task> = {}): Task {
  const id = nextId++;
  return {
    id: `task-${id}`,
    title: `Task ${id}`,
    description: 'Description',
    status: 'todo',
    priority: 'medium',
    dueDate: '2999-01-01',
    assignee: JOHN,
    tags: ['Design'],
    order: id * 1000,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: `activity-${nextId++}`,
    type: 'created',
    taskId: 'task-1',
    taskTitle: 'Task 1',
    actor: 'John Doe',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}
