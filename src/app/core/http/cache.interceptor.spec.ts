import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { cacheInterceptor } from './cache.interceptor';

describe('cacheInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([cacheInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  function fetchTasks(): unknown[] {
    const received: unknown[] = [];
    http.get('/api/tasks').subscribe((body) => received.push(body));
    return received;
  }

  it('answers a repeat GET from memory', () => {
    fetchTasks();
    backend.expectOne('/api/tasks').flush(['first']);

    expect(fetchTasks()).toEqual([['first']]);
    backend.expectNone('/api/tasks');
  });

  it('goes back to the network once the entry has expired', () => {
    vi.useFakeTimers();
    fetchTasks();
    backend.expectOne('/api/tasks').flush(['stale']);

    vi.advanceTimersByTime(environment.cacheTtlMs + 1);
    const received = fetchTasks();
    backend.expectOne('/api/tasks').flush(['fresh']);

    expect(received).toEqual([['fresh']]);
  });

  it('does not cache failed responses', () => {
    http.get('/api/tasks').subscribe({ error: () => undefined });
    backend.expectOne('/api/tasks').flush(null, { status: 500, statusText: 'Server Error' });

    fetchTasks();
    backend.expectOne('/api/tasks').flush([]);
  });

  it('invalidates the collection when one of its items is written', () => {
    fetchTasks();
    backend.expectOne('/api/tasks').flush(['before']);

    http.patch('/api/tasks/42', {}).subscribe();
    backend.expectOne('/api/tasks/42').flush({});

    fetchTasks();
    backend.expectOne('/api/tasks').flush(['after']);
  });

  it('leaves unrelated collections cached', () => {
    http.get('/api/users').subscribe();
    backend.expectOne('/api/users').flush([]);

    http.post('/api/tasks', {}).subscribe();
    backend.expectOne('/api/tasks').flush({});

    http.get('/api/users').subscribe();
    backend.expectNone('/api/users');
  });

  it('keeps the cache when a write fails', () => {
    fetchTasks();
    backend.expectOne('/api/tasks').flush(['kept']);

    http.post('/api/tasks', {}).subscribe({ error: () => undefined });
    backend.expectOne('/api/tasks').flush(null, { status: 500, statusText: 'Server Error' });

    expect(fetchTasks()).toEqual([['kept']]);
  });
});
