import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RETRY_BASE_DELAY_MS, retryInterceptor } from './retry.interceptor';

const SERVER_ERROR = { status: 503, statusText: 'Unavailable' };

describe('retryInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([retryInterceptor])),
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

  it('retries a failing GET with increasing delays until it succeeds', () => {
    const next = vi.fn();
    http.get('/api/tasks').subscribe(next);

    backend.expectOne('/api/tasks').flush(null, SERVER_ERROR);

    vi.advanceTimersByTime(RETRY_BASE_DELAY_MS - 1);
    backend.expectNone('/api/tasks');
    vi.advanceTimersByTime(1);
    backend.expectOne('/api/tasks').flush(null, SERVER_ERROR);

    vi.advanceTimersByTime(RETRY_BASE_DELAY_MS * 2);
    backend.expectOne('/api/tasks').flush(['ok']);

    expect(next).toHaveBeenCalledWith(['ok']);
  });

  it('gives up after the retry budget is spent', () => {
    const error = vi.fn();
    http.get('/api/tasks').subscribe({ error });

    backend.expectOne('/api/tasks').flush(null, SERVER_ERROR);
    vi.advanceTimersByTime(RETRY_BASE_DELAY_MS);
    backend.expectOne('/api/tasks').flush(null, SERVER_ERROR);
    vi.advanceTimersByTime(RETRY_BASE_DELAY_MS * 2);
    backend.expectOne('/api/tasks').flush(null, SERVER_ERROR);

    expect(error).toHaveBeenCalledOnce();
  });

  it('does not retry client errors', () => {
    const error = vi.fn();
    http.get('/api/tasks/missing').subscribe({ error });

    backend.expectOne('/api/tasks/missing').flush(null, { status: 404, statusText: 'Not Found' });

    expect(error).toHaveBeenCalledOnce();
  });

  it('never retries writes', () => {
    const error = vi.fn();
    http.post('/api/tasks', {}).subscribe({ error });

    backend.expectOne('/api/tasks').flush(null, SERVER_ERROR);
    vi.advanceTimersByTime(RETRY_BASE_DELAY_MS * 10);

    backend.expectNone('/api/tasks');
    expect(error).toHaveBeenCalledOnce();
  });
});
