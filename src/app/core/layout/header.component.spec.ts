import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Activity } from '../models/activity.model';
import { TaskFiltersService } from '../../state/task-filters.service';
import { makeActivity } from '../../testing/task.fixtures';
import { HeaderComponent } from './header.component';
import { SearchBoxComponent } from './search-box.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let backend: HttpTestingController;
  let router: Router;

  const searchBox = () =>
    fixture.debugElement.query(By.directive(SearchBoxComponent))
      .componentInstance as SearchBoxComponent;
  const bell = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[aria-label="Recent activity"]',
    );
  const panel = () => document.querySelector('app-activity-panel');

  async function loadActivity(activities: Activity[] = []): Promise<void> {
    backend.expectOne('/api/activities').flush(activities);
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(HeaderComponent);
    TestBed.tick();
  });

  describe('search', () => {
    beforeEach(() => loadActivity());

    it('updates the filters without leaving a page that shows results', async () => {
      await router.navigateByUrl('/tasks');
      const navigate = vi.spyOn(router, 'navigateByUrl');

      searchBox().termChange.emit('budget');

      expect(TestBed.inject(TaskFiltersService).search()).toBe('budget');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('goes to the dashboard when searching from a page without results', async () => {
      await router.navigateByUrl('/team');

      searchBox().termChange.emit('budget');
      await fixture.whenStable();

      expect(router.url).toBe('/dashboard');
    });

    it('stays put when the search is cleared', async () => {
      await router.navigateByUrl('/team');

      searchBox().termChange.emit('');
      await fixture.whenStable();

      expect(router.url).toBe('/team');
    });
  });

  describe('activity panel', () => {
    function togglePanel(): void {
      bell()?.click();
      fixture.detectChanges();
    }

    it('opens from the bell and lists recent activity', async () => {
      await loadActivity([makeActivity({ taskTitle: 'Ship it' })]);

      togglePanel();

      expect(bell()?.getAttribute('aria-expanded')).toBe('true');
      expect(panel()?.textContent).toContain('John Doe');
      expect(panel()?.textContent).toContain('created Ship it');
    });

    it('closes when the bell is pressed again', async () => {
      await loadActivity();
      togglePanel();
      expect(panel()?.textContent).toContain('Nothing has happened yet.');

      togglePanel();

      expect(panel()).toBeNull();
    });

    it('shows a loading note before the feed arrives', async () => {
      togglePanel();
      expect(panel()?.textContent).toContain('Loading activity');

      await loadActivity();
    });

    it('shows failures and retries on request', async () => {
      backend.expectOne('/api/activities').flush(null, { status: 500, statusText: 'Server Error' });
      await fixture.whenStable();
      togglePanel();

      expect(panel()?.querySelector('[role=alert]')).not.toBeNull();

      panel()?.querySelector('button')?.click();
      TestBed.tick();
      await loadActivity([makeActivity()]);

      expect(panel()?.querySelectorAll('.entry')).toHaveLength(1);
    });
  });
});
