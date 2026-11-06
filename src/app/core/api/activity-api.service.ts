import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Activity } from '../models/activity.model';
import { API_BASE_URL } from './api-base-url.token';

@Injectable({ providedIn: 'root' })
export class ActivityApiService {
  private readonly http = inject(HttpClient);

  readonly collectionUrl = `${inject(API_BASE_URL)}/activities`;

  create(activity: Omit<Activity, 'id'>): Observable<Activity> {
    return this.http.post<Activity>(this.collectionUrl, activity);
  }
}
