import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSidenav } from '@angular/material/sidenav';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskActionsService } from '../../features/task-form/task-actions.service';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let breakpoint: BehaviorSubject<BreakpointState>;
  const actions = { create: vi.fn() };

  const element = (): HTMLElement => fixture.nativeElement;
  const sidenav = () =>
    fixture.debugElement.query(By.directive(MatSidenav)).componentInstance as MatSidenav;

  async function setNarrow(matches: boolean): Promise<void> {
    breakpoint.next({ matches, breakpoints: {} });
    await fixture.whenStable();
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    breakpoint = new BehaviorSubject<BreakpointState>({ matches: false, breakpoints: {} });

    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TaskActionsService, useValue: actions },
        { provide: BreakpointObserver, useValue: { observe: () => breakpoint } },
      ],
    });
    fixture = TestBed.createComponent(ShellComponent);
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('/api/activities').flush([]);
    await fixture.whenStable();
  });

  it('keeps the sidebar open on wide screens, with no menu button', () => {
    expect(sidenav().opened).toBe(true);
    expect(sidenav().mode).toBe('side');
    expect(element().querySelector('[aria-label="Toggle navigation"]')).toBeNull();
  });

  it('switches to a closed drawer on narrow screens', async () => {
    await setNarrow(true);

    expect(sidenav().opened).toBe(false);
    expect(sidenav().mode).toBe('over');
    expect(element().querySelector('[aria-label="Toggle navigation"]')).not.toBeNull();
  });

  it('toggles the drawer from the header', async () => {
    await setNarrow(true);

    element().querySelector<HTMLButtonElement>('[aria-label="Toggle navigation"]')?.click();
    await fixture.whenStable();

    expect(sidenav().opened).toBe(true);
  });

  it('closes the drawer after navigating on narrow screens only', async () => {
    const link = () => element().querySelector<HTMLAnchorElement>('.nav-link');

    link()?.click();
    await fixture.whenStable();
    expect(sidenav().opened).toBe(true);

    await setNarrow(true);
    // Not awaited: the returned promise follows the open animation, which jsdom doesn't run.
    sidenav().open();
    link()?.click();
    await fixture.whenStable();
    expect(sidenav().opened).toBe(false);
  });

  it('starts a new task from the sidebar', () => {
    element().querySelector<HTMLButtonElement>('.new-task')?.click();
    expect(actions.create).toHaveBeenCalledOnce();
  });

  it('moves focus to the main content from the skip link', () => {
    document.body.appendChild(element());

    element().querySelector<HTMLButtonElement>('.skip-link')?.click();

    expect(document.activeElement).toBe(element().querySelector('main'));
    element().remove();
  });
});
