export type ActivityType = 'created' | 'updated' | 'moved' | 'completed' | 'deleted';

export interface Activity {
  id: string;
  type: ActivityType;
  taskId: string;
  taskTitle: string;
  actor: string;
  /** Extra context for the event, e.g. the column a task moved to. */
  detail?: string;
  createdAt: string;
}
