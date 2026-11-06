import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { Task, TaskStatus } from '../../core/models/task.model';
import { makeTask } from '../../testing/task.fixtures';
import { TaskMove } from '../task-form/task-actions.service';
import { TaskBoardComponent } from './task-board.component';
import { TaskCardComponent } from './task-card.component';
import { TaskColumnComponent } from './task-column.component';

describe('TaskBoardComponent', () => {
  let fixture: ComponentFixture<TaskBoardComponent>;
  const task = makeTask({ title: 'First' });

  async function render(statuses: readonly TaskStatus[]): Promise<void> {
    fixture.componentRef.setInput('statuses', statuses);
    fixture.componentRef.setInput('columns', { todo: [task], in_progress: [], done: [] });
    await fixture.whenStable();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskBoardComponent);
  });

  const column = () =>
    fixture.debugElement.query(By.directive(TaskColumnComponent))
      .componentInstance as TaskColumnComponent;

  function drop(overrides: {
    sameContainer: boolean;
    previousIndex: number;
    currentIndex: number;
    target?: TaskStatus;
  }): void {
    const container = { data: overrides.target ?? 'todo' };
    const event = {
      item: { data: task },
      container,
      previousContainer: overrides.sameContainer ? container : { data: 'done' },
      previousIndex: overrides.previousIndex,
      currentIndex: overrides.currentIndex,
    } as unknown as CdkDragDrop<TaskStatus, TaskStatus, Task>;
    column()['onDrop'](event);
  }

  it('renders one column per visible status, with counts and headings', async () => {
    await render(['todo', 'in_progress', 'done']);
    const element: HTMLElement = fixture.nativeElement;

    const headings = [...element.querySelectorAll('.heading')].map((el) => el.textContent);
    const counts = [...element.querySelectorAll('.count')].map((el) => el.textContent);

    expect(headings).toEqual(['To Do', 'In Progress', 'Done']);
    expect(counts).toEqual(['1', '0', '0']);
    expect(element.querySelectorAll('.empty')).toHaveLength(2);
  });

  it('narrows to a single column when filtered by status', async () => {
    await render(['todo']);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelectorAll('app-task-column')).toHaveLength(1);
    expect(element.querySelector('.board--single')).not.toBeNull();
  });

  it('bubbles card actions up with the task attached', async () => {
    await render(['todo']);
    const edit = vi.fn();
    const remove = vi.fn();
    const statusChange = vi.fn();
    fixture.componentInstance.edit.subscribe(edit);
    fixture.componentInstance.remove.subscribe(remove);
    fixture.componentInstance.statusChange.subscribe(statusChange);

    const card = fixture.debugElement.query(By.directive(TaskCardComponent))
      .componentInstance as TaskCardComponent;
    card.edit.emit();
    card.remove.emit();
    card.moveTo.emit('done');

    expect(edit).toHaveBeenCalledWith(task);
    expect(remove).toHaveBeenCalledWith(task);
    expect(statusChange).toHaveBeenCalledWith({ task, status: 'done' });
  });

  describe('dropping', () => {
    let moved: Mock<(move: TaskMove) => void>;

    beforeEach(async () => {
      await render(['todo']);
      moved = vi.fn<(move: TaskMove) => void>();
      fixture.componentInstance.moved.subscribe(moved);
    });

    it('reports a move between columns', () => {
      drop({ sameContainer: false, previousIndex: 0, currentIndex: 0, target: 'in_progress' });
      expect(moved).toHaveBeenCalledWith({ task, status: 'in_progress', index: 0 });
    });

    it('reports a reorder inside a column', () => {
      drop({ sameContainer: true, previousIndex: 0, currentIndex: 2 });
      expect(moved).toHaveBeenCalledWith({ task, status: 'todo', index: 2 });
    });

    it('ignores a card dropped back where it started', () => {
      drop({ sameContainer: true, previousIndex: 1, currentIndex: 1 });
      expect(moved).not.toHaveBeenCalled();
    });
  });
});
