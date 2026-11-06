import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

interface CacheEntry {
  response: HttpResponse<unknown>;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class HttpCacheService {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly ttlMs = environment.cacheTtlMs;

  get(url: string): HttpResponse<unknown> | undefined {
    const entry = this.entries.get(url);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(url);
      return undefined;
    }
    return entry.response;
  }

  set(url: string, response: HttpResponse<unknown>): void {
    this.entries.set(url, { response, expiresAt: Date.now() + this.ttlMs });
  }

  /**
   * Drops everything the write to `url` could have made stale: a PATCH to /tasks/42
   * invalidates both /tasks/42 and the /tasks collection, including any query variants.
   */
  invalidate(url: string): void {
    const written = withoutQuery(url);
    for (const key of this.entries.keys()) {
      const cached = withoutQuery(key);
      if (isSameOrChild(cached, written) || isSameOrChild(written, cached)) {
        this.entries.delete(key);
      }
    }
  }
}

function withoutQuery(url: string): string {
  return url.split('?')[0];
}

function isSameOrChild(url: string, parent: string): boolean {
  return url === parent || url.startsWith(`${parent}/`);
}
