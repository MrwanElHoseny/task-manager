import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { makeActivity } from '../testing/task.fixtures';
import { ActivityStore } from './activity.store';

const SERVER_ERROR = { status: 500, statusText: 'Server Error' };

describe('ActivityStore', () => {
  let store: ActivityStore;
  let backend: HttpTestingController;

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ActivityStore);
    backend = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => backend.verify());

  async function load(activities = [makeActivity()]): Promise<void> {
    backend.expectOne('/api/activities').flush(activities);
    await settle();
  }

  it('sorts newest first and caps the feed', async () => {
    const activities = Array.from({ length: 15 }, (_, day) =>
      makeActivity({ createdAt: new Date(2025, 0, day + 1).toISOString() }),
    );
    await load(activities);

    expect(store.recent()).toHaveLength(10);
    expect(store.recent()[0]).toBe(activities[14]);
  });

  it('adds recorded activity to the top of the feed', async () => {
    await load();

    store.record(makeActivity({ taskTitle: 'Newest', createdAt: '2030-01-01T00:00:00Z' }));
    const request = backend.expectOne({ method: 'POST', url: '/api/activities' });
    request.flush({ ...request.request.body, id: 'saved' });

    expect(store.recent()[0].taskTitle).toBe('Newest');
  });

  it('swallows failures while recording, leaving the feed intact', async () => {
    await load();

    store.record(makeActivity());
    backend.expectOne({ method: 'POST', url: '/api/activities' }).flush(null, SERVER_ERROR);

    expect(store.recent()).toHaveLength(1);
  });

  it('can reload after a failed load', async () => {
    backend.expectOne('/api/activities').flush(null, SERVER_ERROR);
    await settle();
    expect(store.error()).toBeTruthy();
    expect(store.recent()).toEqual([]);

    store.reload();
    TestBed.tick();
    await load();

    expect(store.error()).toBeUndefined();
    expect(store.recent()).toHaveLength(1);
  });
});
