import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ApiError, errorMessage } from './api-error';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  function failWith(status: number): unknown {
    let received: unknown;
    http.get('/api/tasks').subscribe({ error: (error) => (received = error) });
    backend.expectOne('/api/tasks').flush(null, { status, statusText: 'Error' });
    return received;
  }

  it('converts HTTP failures into ApiError', () => {
    const error = failWith(404);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect(errorMessage(error)).toContain('no longer exists');
  });

  it('uses a generic message for unmapped statuses', () => {
    expect(errorMessage(failWith(503))).toContain('Something went wrong');
  });

  it('explains connection failures', () => {
    let received: unknown;
    http.get('/api/tasks').subscribe({ error: (error) => (received = error) });
    backend.expectOne('/api/tasks').error(new ProgressEvent('error'));

    expect(errorMessage(received)).toContain("can't reach the server");
  });

  it('never leaks the message of an unexpected error', () => {
    expect(errorMessage(new TypeError('x is undefined'))).toContain('Something went wrong');
  });
});
