import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { catchError, EMPTY } from 'rxjs';

import { ActivityApiService } from '../core/api/activity-api.service';
import { Activity } from '../core/models/activity.model';

const FEED_LENGTH = 10;

@Injectable({ providedIn: 'root' })
export class ActivityStore {
  private readonly api = inject(ActivityApiService);
  private readonly resource = httpResource<Activity[]>(() => this.api.collectionUrl);

  readonly isLoading = this.resource.isLoading;
  readonly error = this.resource.error;

  readonly recent = computed<Activity[]>(() => {
    const activities = this.resource.hasValue() ? this.resource.value() : [];
    return [...activities]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, FEED_LENGTH);
  });

  /** The feed is secondary: losing an entry must not fail the change it describes. */
  record(activity: Omit<Activity, 'id'>): void {
    this.api
      .create(activity)
      .pipe(catchError(() => EMPTY))
      .subscribe((saved) => {
        const current = this.resource.hasValue() ? this.resource.value() : [];
        this.resource.set([saved, ...current]);
      });
  }

  reload(): void {
    this.resource.reload();
  }
}
