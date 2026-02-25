import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: async ({ queryKey }) => {
          const res = await fetch(queryKey[0] as string, { credentials: 'include' });
          if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
          return res.json();
        },
      },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function mockUserResponse(user: { id: string; role: string; email: string }) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(user),
  });
}

function mock401Response() {
  mockFetch.mockResolvedValue({
    ok: false,
    status: 401,
    text: () => Promise.resolve('401: Unauthorized'),
    statusText: 'Unauthorized',
  });
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns isLoading true initially', async () => {
    // Never resolve so the query stays loading
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { useAuth } = await import('./useAuth');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeUndefined();
  });

  it('returns user data when fetch succeeds', async () => {
    const adminUser = { id: 'admin-admin', role: 'admin', email: 'admin@test.com' };
    mockUserResponse(adminUser);

    const { useAuth } = await import('./useAuth');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(adminUser);
  });

  it('returns isAuthenticated true when user data is present', async () => {
    const adminUser = { id: 'admin-admin', role: 'admin', email: 'admin@test.com' };
    mockUserResponse(adminUser);

    const { useAuth } = await import('./useAuth');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns isAuthenticated false when fetch returns 401', async () => {
    mock401Response();

    const { useAuth } = await import('./useAuth');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeUndefined();
  });

  it('returns isAdmin true when user.role is admin', async () => {
    const adminUser = { id: 'admin-admin', role: 'admin', email: 'admin@test.com' };
    mockUserResponse(adminUser);

    const { useAuth } = await import('./useAuth');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isClient).toBe(false);
    expect(result.current.isMaintenance).toBe(false);
  });

  it('returns isClient true when user.role is client', async () => {
    const clientUser = { id: 'client-1', role: 'client', email: 'client@test.com' };
    mockUserResponse(clientUser);

    const { useAuth } = await import('./useAuth');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isClient).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isMaintenance).toBe(false);
  });

  it('returns isMaintenance true when user.role is maintenance', async () => {
    const maintenanceUser = { id: 'maint-1', role: 'maintenance', email: 'maint@test.com' };
    mockUserResponse(maintenanceUser);

    const { useAuth } = await import('./useAuth');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isMaintenance).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isClient).toBe(false);
  });

  it('returns isAdmin, isClient, and isMaintenance all false for an unrecognized role', async () => {
    const viewerUser = { id: 'viewer-1', role: 'viewer', email: 'viewer@test.com' };
    mockUserResponse(viewerUser);

    const { useAuth } = await import('./useAuth');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isClient).toBe(false);
    expect(result.current.isMaintenance).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
  });
});
