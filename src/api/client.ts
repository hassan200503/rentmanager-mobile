import { env } from '../config/env';
import { ApiError, kindForStatus } from './errors';

/**
 * The single HTTP path to the RentManager backend.
 *
 * Deliberate choices:
 * - Tenant identity is NEVER sent by the client. The backend derives the
 *   landlord organisation from the verified Clerk JWT; there is no
 *   X-Tenant-Id header here (the web sends one and the backend ignores it).
 * - No automatic retry of anything but reads, and reads are retried by React
 *   Query, not here. A timed-out POST has an UNKNOWN outcome — the STK push
 *   may already be on the renter's phone — so it is surfaced, never replayed.
 * - Timeouts are explicit. A hanging request on a bad mobile network must end.
 */

export type TokenProvider = (opts?: { skipCache?: boolean }) => Promise<string | null>;

/** Backend envelope: com.rentmanager.contract.common.ApiResponse */
interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
  errorCode?: string | null;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** For the few endpoints that return a bare object instead of the envelope. */
  unwrapped?: boolean;
  /** Extra headers, e.g. Idempotency-Key. Never Authorization or tenant identity. */
  headers?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export type OnUnauthorized = () => void;

export function buildUrl(path: string, query?: RequestOptions['query']): string {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with "/": ${path}`);
  }
  const url = `${env.apiBaseUrl}${path}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `${url}?${params.join('&')}` : url;
}

export function createApiClient(getToken: TokenProvider, onUnauthorized: OnUnauthorized) {
  async function send(path: string, options: RequestOptions, token: string | null): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('timeout')), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const onOuterAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', onOuterAbort);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-App-Name': 'rentmanager-mobile',
      'X-App-Version': env.appVersion,
      'X-App-Env': env.appEnv,
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    for (const [k, v] of Object.entries(options.headers ?? {})) {
      const lower = k.toLowerCase();
      if (lower !== 'authorization' && lower !== 'x-tenant-id') headers[k] = v;
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      return await fetch(buildUrl(path, options.query), {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (err) {
      if (options.signal?.aborted) {
        throw err; // caller cancelled (e.g. screen unmounted) — not an error to show
      }
      const timedOut = controller.signal.aborted;
      throw new ApiError({
        kind: timedOut ? 'timeout' : 'network',
        status: 0,
        message: timedOut ? 'timeout' : 'network',
      });
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', onOuterAbort);
    }
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const token = await getToken();
    if (!token) {
      onUnauthorized();
      throw new ApiError({ kind: 'unauthorized', status: 401, message: 'No session' });
    }

    let res = await send(path, options, token);

    // One refresh attempt, reads only. Clerk tokens are short-lived; a 401 on
    // a cached token usually just means it expired a moment ago. Mutations are
    // not re-sent — a 401 means the server did not act, but we still prefer to
    // let the user re-submit deliberately than to resend a write silently.
    if (res.status === 401 && (options.method ?? 'GET') === 'GET') {
      const fresh = await getToken({ skipCache: true });
      if (fresh) {
        res = await send(path, options, fresh);
      }
    }

    const requestId = res.headers.get('X-Request-Id') ?? undefined;

    let payload: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        if (res.ok) {
          throw new ApiError({ kind: 'invalid_response', status: res.status, message: 'invalid', requestId });
        }
      }
    }

    if (res.status === 401) {
      onUnauthorized();
    }

    const envelope = payload as Partial<Envelope<T>> | null;

    if (!res.ok || (!options.unwrapped && envelope && envelope.success === false)) {
      throw new ApiError({
        kind: res.ok ? 'validation' : kindForStatus(res.status),
        status: res.status,
        message: typeof envelope?.message === 'string' ? envelope.message : '',
        code: envelope?.errorCode ?? undefined,
        requestId,
      });
    }

    if (options.unwrapped) {
      return payload as T;
    }
    if (!envelope || !('data' in envelope)) {
      throw new ApiError({ kind: 'invalid_response', status: res.status, message: 'invalid', requestId });
    }
    return envelope.data as T;
  }

  /**
   * Multipart upload with progress. XMLHttpRequest rather than fetch because
   * fetch in React Native reports no upload progress, and a photo on a slow
   * network needs a visible bar. Like every mutation, never retried here.
   */
  async function upload<T>(
    path: string,
    file: { uri: string; name: string; type: string },
    onProgress?: (fraction: number) => void,
    signal?: AbortSignal,
  ): Promise<T> {
    const token = await getToken();
    if (!token) {
      onUnauthorized();
      throw new ApiError({ kind: 'unauthorized', status: 401, message: 'No session' });
    }
    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', buildUrl(path));
      xhr.timeout = 60_000;
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('X-App-Name', 'rentmanager-mobile');
      xhr.setRequestHeader('X-App-Version', env.appVersion);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        let payload: Partial<Envelope<T>> | null = null;
        try {
          payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          payload = null;
        }
        if (xhr.status === 401) onUnauthorized();
        if (xhr.status >= 200 && xhr.status < 300 && payload?.success !== false && payload && 'data' in payload) {
          resolve(payload.data as T);
          return;
        }
        reject(
          new ApiError({
            kind: xhr.status >= 200 && xhr.status < 300 ? 'invalid_response' : xhr.status === 413 ? 'validation' : kindForStatus(xhr.status),
            status: xhr.status,
            message: typeof payload?.message === 'string' ? payload.message : '',
            code: payload?.errorCode ?? undefined,
          }),
        );
      };
      xhr.onerror = () => reject(new ApiError({ kind: 'network', status: 0, message: 'network' }));
      xhr.ontimeout = () => reject(new ApiError({ kind: 'timeout', status: 0, message: 'timeout' }));
      signal?.addEventListener('abort', () => xhr.abort());
      const form = new FormData();
      // React Native's FormData accepts a { uri, name, type } file descriptor.
      form.append('file', file as unknown as Blob);
      xhr.send(form);
    });
  }

  return {
    upload,
    /** A current bearer token, for authorised image requests. */
    token: () => getToken(),
    get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...opts, method: 'GET' }),
    post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...opts, method: 'POST', body: body ?? {} }),
    put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...opts, method: 'PUT', body: body ?? {} }),
    patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...opts, method: 'PATCH', body: body ?? {} }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
