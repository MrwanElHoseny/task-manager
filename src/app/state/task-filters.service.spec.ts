import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { TASK_STATUSES } from '../core/models/task.model';
import { makeTask, SARAH } from '../testing/task.fixtures';
import { ALL, TaskFiltersService } from './task-filters.service';

describe('TaskFiltersService', () => {
  let filters: TaskFiltersService;

  beforeEach(() => {
    filters = TestBed.inject(TaskFiltersService);
  });

  it('lets everything through by default', () => {
    expect(filters.predicate()(makeTask())).toBe(true);
    expect(filters.hasActiveFilters()).toBe(false);
    expect(filters.visibleStatuses()).toEqual(TASK_STATUSES);
  });

  it('searches titles and descriptions, ignoring case and outer spaces', () => {
    filters.search.set('  BUDGET ');
    const matches = filters.predicate();

    expect(matches(makeTask({ title: 'Q4 budget report' }))).toBe(true);
    expect(matches(makeTask({ description: 'Prepare the budget' }))).toBe(true);
    expect(matches(makeTask({ title: 'Other', description: 'Other' }))).toBe(false);
  });

  it('treats whitespace-only search as no search', () => {
    filters.search.set('   ');
    expect(filters.hasActiveFilters()).toBe(false);
    expect(filters.predicate()(makeTask())).toBe(true);
  });

  it('combines status, priority and assignee', () => {
    filters.status.set('todo');
    filters.priority.set('high');
    filters.assigneeId.set('user-1');
    const matches = filters.predicate();

    expect(matches(makeTask({ status: 'todo', priority: 'high' }))).toBe(true);
    expect(matches(makeTask({ status: 'done', priority: 'high' }))).toBe(false);
    expect(matches(makeTask({ status: 'todo', priority: 'low' }))).toBe(false);
    expect(matches(makeTask({ status: 'todo', priority: 'high', assignee: SARAH }))).toBe(false);
  });

  it('shows only the selected status column', () => {
    filters.status.set('in_progress');
    expect(filters.visibleStatuses()).toEqual(['in_progress']);
  });

  it('clears every filter at once', () => {
    filters.search.set('x');
    filters.status.set('done');
    filters.priority.set('low');
    filters.assigneeId.set('user-1');

    filters.clear();

    expect(filters.search()).toBe('');
    expect(filters.status()).toBe(ALL);
    expect(filters.hasActiveFilters()).toBe(false);
  });
});
