import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { JOHN, makeTask, SARAH } from '../../testing/task.fixtures';
import { TeamPageComponent } from './team-page.component';

describe('TeamPageComponent', () => {
  let fixture: ComponentFixture<TeamPageComponent>;
  let backend: HttpTestingController;

  const element = (): HTMLElement => fixture.nativeElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TeamPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TeamPageComponent);
    TestBed.tick();
    backend.expectOne('/api/activities').flush([]);
  });

  afterEach(() => backend.verify());

  it('summarises the workload of each person', async () => {
    backend
      .expectOne('/api/tasks')
      .flush([
        makeTask({ assignee: JOHN, status: 'todo', dueDate: '2000-01-01' }),
        makeTask({ assignee: JOHN, status: 'in_progress' }),
        makeTask({ assignee: JOHN, status: 'done' }),
        makeTask({ assignee: SARAH, status: 'done' }),
      ]);
    backend.expectOne('/api/users').flush([JOHN, SARAH]);
    await fixture.whenStable();

    const [john, sarah] = element().querySelectorAll('.member');
    const numbers = (card: Element) =>
      [...card.querySelectorAll('dd')].map((value) => value.textContent);

    expect(john.textContent).toContain('john.doe@company.com');
    expect(numbers(john)).toEqual(['2', '1', '1']);
    expect(numbers(sarah)).toEqual(['0', '0', '1']);
    expect(john.querySelector('.overdue')).not.toBeNull();
    expect(sarah.querySelector('.overdue')).toBeNull();
  });

  it('handles an empty team', async () => {
    backend.expectOne('/api/tasks').flush([]);
    backend.expectOne('/api/users').flush([]);
    await fixture.whenStable();

    expect(element().textContent).toContain('Nobody on the team yet.');
  });

  it('shows the load error and can retry', async () => {
    backend.expectOne('/api/tasks').flush([]);
    backend.expectOne('/api/users').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(element().textContent).toContain("We couldn't load the team");

    element().querySelector<HTMLButtonElement>('app-state-message button')?.click();
    TestBed.tick();
    backend.expectOne('/api/users').flush([JOHN]);
    await fixture.whenStable();

    expect(element().querySelectorAll('.member')).toHaveLength(1);
  });
});
