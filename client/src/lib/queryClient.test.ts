import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest, getQueryFn } from './queryClient';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockResponse(options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  text?: () => Promise<string>;
  json?: () => Promise<any>;
}): Response {
  const {
    ok = true,
    status = 200,
    statusText = 'OK',
    text = () => Promise.resolve(''),
    json = () => Promise.resolve({}),
  } = options;
  return {
    ok,
    status,
    statusText,
    text,
    json,
    headers: new Headers(),
  } as unknown as Response;
}

describe('apiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends correct method and URL', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}));

    await apiRequest('GET', '/api/bonds');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/bonds',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sends JSON body when data provided', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}));

    const data = { name: 'Bond', rate: 3.5 };
    await apiRequest('POST', '/api/bonds', data);

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.body).toBe(JSON.stringify(data));
    expect(callArgs.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('includes credentials', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}));

    await apiRequest('GET', '/api/bonds');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/bonds',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server exploded'),
      }),
    );

    await expect(apiRequest('GET', '/api/fail')).rejects.toThrow('500: Server exploded');
  });

  it('does not set Content-Type when no data', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}));

    await apiRequest('GET', '/api/bonds');

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers).toEqual({});
  });
});

describe('getQueryFn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null on 401 when on401 is returnNull', async () => {
    mockFetch.mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Unauthorized'),
      }),
    );

    const queryFn = getQueryFn<any>({ on401: 'returnNull' });
    const result = await queryFn({
      queryKey: ['/api/auth/user'],
      meta: undefined,
      signal: new AbortController().signal,
    } as any);

    expect(result).toBeNull();
  });

  it('throws on 401 when on401 is throw', async () => {
    mockFetch.mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Unauthorized'),
      }),
    );

    const queryFn = getQueryFn<any>({ on401: 'throw' });

    await expect(
      queryFn({
        queryKey: ['/api/auth/user'],
        meta: undefined,
        signal: new AbortController().signal,
      } as any),
    ).rejects.toThrow('401');
  });

  it('returns parsed JSON on success', async () => {
    const payload = { id: 1, name: 'US Treasury' };
    mockFetch.mockResolvedValue(
      createMockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve(payload),
      }),
    );

    const queryFn = getQueryFn<any>({ on401: 'throw' });
    const result = await queryFn({
      queryKey: ['/api/bonds'],
      meta: undefined,
      signal: new AbortController().signal,
    } as any);

    expect(result).toEqual(payload);
  });
});
