import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Task } from '../../core/models/task.model';
import { makeTask } from '../../testing/task.fixtures';
import { TaskCardComponent } from './task-card.component';

describe('TaskCardComponent', () => {
  let fixture: ComponentFixture<TaskCardComponent>;

  async function render(overrides: Partial<Task> = {}): Promise<HTMLElement> {
    fixture.componentRef.setInput('task', makeTask(overrides));
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  async function openMenu(): Promise<HTMLButtonElement[]> {
    fixture.nativeElement.querySelector('.menu-button').click();
    await fixture.whenStable();
    return [...document.querySelectorAll<HTMLButtonElement>('[mat-menu-item]')];
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskCardComponent);
  });

  it('shows the task details', async () => {
    const element = await render({
      title: 'Fix login',
      description: 'On mobile',
      tags: ['Bug', 'Critical'],
    });

    expect(element.querySelector('.title')?.textContent).toBe('Fix login');
    expect(element.querySelector('.description')?.textContent).toBe('On mobile');
    expect(element.querySelector('.tags')?.textContent).toBe('Bug, Critical');
    expect(element.querySelector('.footer')?.textContent).toContain('@John');
  });

  it('leaves out the tags row when there are none', async () => {
    const element = await render({ tags: [] });
    expect(element.querySelector('.tags')).toBeNull();
  });

  it('highlights overdue tasks', async () => {
    const element = await render({ dueDate: '2000-01-01' });

    expect(element.querySelector('.card--overdue')).not.toBeNull();
    expect(element.querySelector('.due')?.textContent).toContain('⚠️');
    expect(element.querySelector('.due')?.textContent).toContain('Overdue by');
  });

  it('does not treat finished tasks as overdue', async () => {
    const element = await render({
      status: 'done',
      dueDate: '2000-01-01',
      completedAt: new Date().toISOString(),
    });

    expect(element.querySelector('.card--overdue')).toBeNull();
    expect(element.querySelector('.card--done')).not.toBeNull();
    expect(element.querySelector('.due')?.textContent).toContain('Completed today');
  });

  it('uses the accent for the current status', async () => {
    expect((await render({ status: 'todo' })).querySelector('.card--todo')).not.toBeNull();
    expect(
      (await render({ status: 'in_progress' })).querySelector('.card--in-progress'),
    ).not.toBeNull();
  });

  it('names the task on its menu button for screen readers', async () => {
    const element = await render({ title: 'Fix login' });
    expect(element.querySelector('.menu-button')?.getAttribute('aria-label')).toBe(
      'Actions for Fix login',
    );
  });

  it('offers moves to the other columns only', async () => {
    await render({ status: 'in_progress' });

    const labels = (await openMenu()).map((item) => item.textContent?.trim());

    expect(labels).toEqual(['Edit', 'Move to To Do', 'Move to Done', 'Delete']);
  });

  it('emits the chosen action', async () => {
    await render({ status: 'todo' });
    const edit = vi.fn();
    const remove = vi.fn();
    const moveTo = vi.fn();
    fixture.componentInstance.edit.subscribe(edit);
    fixture.componentInstance.remove.subscribe(remove);
    fixture.componentInstance.moveTo.subscribe(moveTo);

    const [editItem, moveItem, , deleteItem] = await openMenu();
    editItem.click();
    moveItem.click();
    deleteItem.click();

    expect(edit).toHaveBeenCalledOnce();
    expect(moveTo).toHaveBeenCalledWith('in_progress');
    expect(remove).toHaveBeenCalledOnce();
  });
});
