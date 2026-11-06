#!/usr/bin/env node
// Combines the generated task and statistics files into the database JSON Server
// runs against. The generated files stay read-only; only mock-api/db.json is mutated.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, 'mock-api', 'db.json');
const ORDER_STEP = 1000;
const SEEDED_ACTIVITY_COUNT = 12;

if (process.argv.includes('--if-missing') && existsSync(dbPath)) {
  process.exit(0);
}

const readJson = (file) => JSON.parse(readFileSync(join(root, 'data-fetching', file), 'utf8'));

const { tasks } = readJson('tasks.json');
const statistics = readJson('statistics.json');

const db = {
  tasks: withBoardOrder(tasks).map(({ isOverdue: _derivedOnTheClient, ...task }) => task),
  users: uniqueAssignees(tasks),
  activities: seedActivities(tasks),
  statistics,
};

mkdirSync(dirname(dbPath), { recursive: true });
writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log(`Wrote ${db.tasks.length} tasks and ${db.users.length} users to mock-api/db.json`);

function withBoardOrder(allTasks) {
  const ordered = [];
  for (const status of ['todo', 'in_progress', 'done']) {
    const column = allTasks.filter((task) => task.status === status).sort(boardComparator(status));
    column.forEach((task, index) => ordered.push({ ...task, order: (index + 1) * ORDER_STEP }));
  }
  return ordered;
}

function boardComparator(status) {
  return status === 'done'
    ? (a, b) => b.completedAt.localeCompare(a.completedAt)
    : (a, b) => a.dueDate.localeCompare(b.dueDate);
}

function uniqueAssignees(allTasks) {
  const users = new Map(allTasks.map(({ assignee }) => [assignee.id, assignee]));
  return [...users.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function seedActivities(allTasks) {
  const events = allTasks.flatMap((task) => {
    const base = { taskId: task.id, taskTitle: task.title, actor: task.assignee.name };
    const created = { ...base, type: 'created', createdAt: task.createdAt };
    return task.completedAt
      ? [created, { ...base, type: 'completed', createdAt: task.completedAt }]
      : [created];
  });

  return events
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, SEEDED_ACTIVITY_COUNT)
    .map((event, index) => ({ id: `activity-${index + 1}`, ...event }));
}
