import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

import { apiCall, api, ApiError } from './api';
import { queryClient } from './queryClient';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockResponse(options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<any>;
}): Response {
  const {
    ok = true,
    status = 200,
    statusText = 'OK',
    json = () => Promise.resolve({}),
  } = options;
  return {
    ok,
    status,
    statusText,
    json,
    headers: new Headers(),
  } as unknown as Response;
}

describe('apiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes credentials in fetch call', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ json: () => Promise.resolve({ data: 1 }) }));

    await apiCall('/api/test');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('sets Content-Type to application/json', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ json: () => Promise.resolve({}) }));

    await apiCall('/api/test');

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers['Content-Type']).toBe('application/json');
  });

  it('returns parsed JSON on success', async () => {
    const payload = { id: 1, name: 'Bond' };
    mockFetch.mockResolvedValue(createMockResponse({ json: () => Promise.resolve(payload) }));

    const result = await apiCall('/api/bonds');

    expect(result).toEqual(payload);
  });

  it('throws ApiError on non-ok response', async () => {
    mockFetch.mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Server failure' }),
      }),
    );

    await expect(apiCall('/api/fail')).rejects.toThrow(ApiError);
  });

  it('ApiError contains status code and message', async () => {
    mockFetch.mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Resource not found' }),
      }),
    );

    try {
      await apiCall('/api/missing');
      expect.fail('Expected ApiError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.message).toBe('Resource not found');
    }
  });

  it('invalidates auth queries on 401', async () => {
    mockFetch.mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      }),
    );

    await expect(apiCall('/api/protected')).rejects.toThrow(ApiError);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['/api/auth/user'],
    });
  });

  it('returns null when response.json() fails', async () => {
    mockFetch.mockResolvedValue(
      createMockResponse({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
      }),
    );

    const result = await apiCall('/api/no-body');

    expect(result).toBeNull();
  });
});

describe('api convenience methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('api.post sends POST method with JSON body', async () => {
    const responseData = { id: 42 };
    mockFetch.mockResolvedValue(createMockResponse({ json: () => Promise.resolve(responseData) }));

    const data = { name: 'Treasury Bond', rate: 5.5 };
    const result = await api.post('/api/bonds', data);

    expect(result).toEqual(responseData);
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.method).toBe('POST');
    expect(callArgs.body).toBe(JSON.stringify(data));
  });

  it('api.delete sends DELETE method', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ json: () => Promise.resolve(null) }));

    await api.delete('/api/bonds/1');

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.method).toBe('DELETE');
  });
});
