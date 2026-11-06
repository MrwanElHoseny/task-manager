import { httpResource } from '@angular/common/http';
import { inject } from '@angular/core';

import { User } from '../models/user.model';
import { API_BASE_URL } from './api-base-url.token';

/**
 * Must be called from an injection context. Each caller owns its resource; repeat
 * visits within the TTL are answered by the cache interceptor rather than the network.
 */
export function usersResource() {
  const baseUrl = inject(API_BASE_URL);
  return httpResource<User[]>(() => `${baseUrl}/users`);
}
