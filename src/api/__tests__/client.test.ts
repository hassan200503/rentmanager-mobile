import { buildUrl, createApiClient } from '../client';
import { ApiError, userMessage } from '../errors';

type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit]>;

function response(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k: string) => headers[k] ?? null },
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

describe('api client', () => {
  let fetchMock: FetchMock;
  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('unwraps the ApiResponse envelope and sends the bearer token', async () => {
    fetchMock.mockResolvedValue(response(200, { success: true, message: 'ok', data: { a: 1 } }));
    const api = createApiClient(async () => 'tok', jest.fn());
    await expect(api.get('/x')).resolves.toEqual({ a: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test.invalid/api/v1/x');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('never sends a tenant or organisation header — the backend derives it from the token', async () => {
    fetchMock.mockResolvedValue(response(200, { success: true, data: null }));
    const api = createApiClient(async () => 'tok', jest.fn());
    await api.get('/x');
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('x-tenant-id');
  });

  it('retries a GET once with a fresh token after 401', async () => {
    fetchMock
      .mockResolvedValueOnce(response(401, { success: false }))
      .mockResolvedValueOnce(response(200, { success: true, data: 'fresh' }));
    const getToken = jest.fn(async (o?: { skipCache?: boolean }) => (o?.skipCache ? 'new' : 'old'));
    const onUnauthorized = jest.fn();
    const api = createApiClient(getToken, onUnauthorized);
    await expect(api.get('/x')).resolves.toBe('fresh');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does NOT resend a POST after 401, and reports the session rejected', async () => {
    fetchMock.mockResolvedValue(response(401, { success: false }));
    const onUnauthorized = jest.fn();
    const api = createApiClient(async () => 'tok', onUnauthorized);
    await expect(api.post('/tenant-portal/rent-payments/initiate', { amount: '1' })).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('maps backend business errors with their code and request id', async () => {
    fetchMock.mockResolvedValue(
      response(409, { success: false, message: 'This unit is no longer available.', errorCode: 'CONFLICT' }, { 'X-Request-Id': 'abc' }),
    );
    const api = createApiClient(async () => 'tok', jest.fn());
    const err = (await api.get('/x').catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ kind: 'conflict', code: 'CONFLICT', requestId: 'abc' });
    expect(userMessage(err)).toBe('This unit is no longer available.');
  });

  it('never shows a 5xx body to the user', async () => {
    fetchMock.mockResolvedValue(response(500, { success: false, message: 'org.postgresql.util.PSQLException: …' }));
    const api = createApiClient(async () => 'tok', jest.fn());
    const err = (await api.get('/x').catch((e: unknown) => e)) as ApiError;
    expect(err.kind).toBe('server');
    expect(userMessage(err)).not.toContain('PSQL');
  });

  it('turns a network failure into a typed, transient error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const api = createApiClient(async () => 'tok', jest.fn());
    const err = (await api.get('/x').catch((e: unknown) => e)) as ApiError;
    expect(err).toMatchObject({ kind: 'network' });
    expect(err.isTransient).toBe(true);
  });

  it('fails closed with no token and makes no request', async () => {
    const api = createApiClient(async () => null, jest.fn());
    await expect(api.get('/x')).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('supports the few bare (non-envelope) endpoints', async () => {
    fetchMock.mockResolvedValue(response(200, { tenantId: 't1', status: 'PENDING' }));
    const api = createApiClient(async () => 'tok', jest.fn());
    await expect(api.post('/onboarding/tenant', {}, { unwrapped: true })).resolves.toEqual({ tenantId: 't1', status: 'PENDING' });
  });

  it('encodes query parameters and drops empty ones', () => {
    expect(buildUrl('/leases', { keyword: 'Jane & Co', status: undefined, page: 0 })).toBe(
      'https://api.test.invalid/api/v1/leases?keyword=Jane%20%26%20Co&page=0',
    );
    expect(() => buildUrl('leases')).toThrow();
  });
});
