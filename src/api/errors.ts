/**
 * One error type for every failed request, carrying enough to decide the UX
 * without the UI ever seeing an HTTP library, a stack trace or a server
 * internal.
 */

export type ApiErrorKind =
  | 'offline' // no connectivity at all
  | 'timeout' // request did not complete in time; outcome UNKNOWN for mutations
  | 'network' // DNS/TLS/connection failure
  | 'unauthorized' // 401 — session missing, expired or revoked
  | 'forbidden' // 403 — authenticated but not allowed
  | 'not_found' // 404 — gone, or never visible to this caller
  | 'conflict' // 409 — business rule / stale state
  | 'validation' // 400 — input rejected
  | 'rate_limited' // 429
  | 'server' // 5xx
  | 'invalid_response';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  /** Backend `errorCode` when present — stable, prefer it over status. */
  readonly code?: string;
  /** Backend request correlation id (X-Request-Id) for support. */
  readonly requestId?: string;

  constructor(params: { kind: ApiErrorKind; status: number; message: string; code?: string; requestId?: string }) {
    super(params.message);
    this.name = 'ApiError';
    this.kind = params.kind;
    this.status = params.status;
    this.code = params.code;
    this.requestId = params.requestId;
  }

  /**
   * Whether a READ may be retried automatically. Mutations are never retried
   * automatically by the client — see api/client.ts.
   */
  get isTransient(): boolean {
    return (
      this.kind === 'offline' ||
      this.kind === 'timeout' ||
      this.kind === 'network' ||
      this.kind === 'server' ||
      this.kind === 'rate_limited'
    );
  }
}

export function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  if (status >= 400) return 'validation';
  return 'invalid_response';
}

const GENERIC: Record<ApiErrorKind, string> = {
  offline: "You're offline. Check your connection and try again.",
  timeout: 'The server took too long to respond. Try again.',
  network: "Couldn't reach RentManager. Check your connection and try again.",
  unauthorized: 'Your session has ended. Please sign in again.',
  forbidden: "You don't have permission to do this.",
  not_found: "This item isn't available. It may have been removed.",
  conflict: 'This changed since you opened it. Refresh and try again.',
  validation: 'Some details need attention.',
  rate_limited: 'Too many attempts. Wait a moment and try again.',
  server: 'Something went wrong on our side. Try again shortly.',
  invalid_response: 'Something went wrong. Try again.',
};

/**
 * Text safe to show a user. 4xx business messages are authored by the backend
 * as UI copy and are shown; 5xx bodies can contain internals and never are.
 */
export function userMessage(error: unknown, fallback?: string): string {
  if (error instanceof ApiError) {
    const backendAuthored =
      (error.kind === 'conflict' || error.kind === 'validation' || error.kind === 'not_found') &&
      error.message &&
      error.message !== 'success';
    return backendAuthored ? error.message : GENERIC[error.kind];
  }
  return fallback ?? GENERIC.invalid_response;
}
