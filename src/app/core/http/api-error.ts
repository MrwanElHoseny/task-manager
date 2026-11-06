import { HttpErrorResponse } from '@angular/common/http';

const MESSAGES_BY_STATUS: Record<number, string> = {
  0: "We can't reach the server. Check your connection and try again.",
  400: 'The server rejected that request. Please review your input.',
  404: 'That item no longer exists. It may have been deleted.',
  409: 'Someone else changed this item. Reload and try again.',
};

const FALLBACK_MESSAGE = 'Something went wrong on our side. Please try again.';

/** Failure shape the app works with, so components never inspect HTTP responses. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApiError';
  }

  static from(response: HttpErrorResponse): ApiError {
    const message = MESSAGES_BY_STATUS[response.status] ?? FALLBACK_MESSAGE;
    return new ApiError(response.status, message, { cause: response });
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : FALLBACK_MESSAGE;
}
