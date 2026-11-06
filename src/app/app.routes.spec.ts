import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { routes } from './app.routes';

describe('app routes', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  it.each([
    ['/dashboard', 'app-dashboard-page'],
    ['/tasks', 'app-tasks-page'],
    ['/analytics', 'app-analytics-page'],
    ['/team', 'app-team-page'],
    ['/calendar', 'app-placeholder-page'],
    ['/settings', 'app-placeholder-page'],
  ])('lazily loads %s', async (url, selector) => {
    await harness.navigateByUrl(url);

    expect(harness.routeNativeElement?.querySelector(selector)).not.toBeNull();
  });

  it('passes the route heading to placeholder pages', async () => {
    await harness.navigateByUrl('/calendar');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Calendar');
  });

  it('keeps the analytics page empty for now', async () => {
    await harness.navigateByUrl('/analytics');

    expect(harness.routeNativeElement?.querySelector('app-analytics-page')?.textContent).toBe(
      'Analytics',
    );
  });

  it.each(['/', '/does-not-exist'])('redirects %s to the dashboard', async (url) => {
    await harness.navigateByUrl(url);

    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });
});
