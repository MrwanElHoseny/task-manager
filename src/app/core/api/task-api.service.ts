import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Task } from '../models/task.model';
import { API_BASE_URL } from './api-base-url.token';

/** Task writes. Reads go through httpResource in TaskStore. */
@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private readonly http = inject(HttpClient);

  readonly collectionUrl = `${inject(API_BASE_URL)}/tasks`;

  create(task: Omit<Task, 'id'>): Observable<Task> {
    return this.http.post<Task>(this.collectionUrl, task);
  }

  update(id: string, changes: Partial<Task>): Observable<Task> {
    return this.http.patch<Task>(`${this.collectionUrl}/${id}`, changes);
  }

  remove(id: string): Observable<void> {
    return this.http.delete(`${this.collectionUrl}/${id}`).pipe(map(() => undefined));
  }
}
