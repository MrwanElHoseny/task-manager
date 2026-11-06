import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { cacheInterceptor } from './core/http/cache.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { retryInterceptor } from './core/http/retry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withFetch(),
      // Retry sits closest to the network so errorInterceptor only sees the final failure.
      withInterceptors([cacheInterceptor, errorInterceptor, retryInterceptor]),
    ),
  ],
};
