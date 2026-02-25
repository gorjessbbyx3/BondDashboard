import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrandingProvider, useBranding } from './BrandingContext';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: async ({ queryKey }) => {
          const res = await fetch(queryKey[0] as string, { credentials: 'include' });
          if (!res.ok) throw new Error(`${res.status}`);
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

function createProviderWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: async ({ queryKey }) => {
          const res = await fetch(queryKey[0] as string, { credentials: 'include' });
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json();
        },
      },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(BrandingProvider, null, children)
    );
  };
}

describe('BrandingContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve(null),
      text: () => Promise.resolve('404'),
    });
    // Reset CSS custom properties
    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--secondary-color');
  });

  it('throws error when useBranding is used outside BrandingProvider', () => {
    // Suppress console.error from React error boundary
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useBranding(), { wrapper: createWrapper() });
    }).toThrow('useBranding must be used within a BrandingProvider');

    vi.restoreAllMocks();
  });

  it('renders children within BrandingProvider', () => {
    render(
      React.createElement(
        QueryClientProvider,
        { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        React.createElement(BrandingProvider, null, React.createElement('div', null, 'Child content'))
      )
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('provides default branding values', async () => {
    const { result } = renderHook(() => useBranding(), { wrapper: createProviderWrapper() });

    expect(result.current.branding.companyName).toBe('Bail Bond Services');
    expect(result.current.branding.primaryColor).toBe('#2563eb');
    expect(result.current.branding.secondaryColor).toBe('#64748b');
  });

  it('updates branding when fetch returns company config', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          companyName: 'Aloha Bail Bonds',
          logo: 'logo.png',
          customSettings: {
            branding: {
              primaryColor: '#ff0000',
              secondaryColor: '#00ff00',
              logoUrl: 'https://example.com/logo.png',
              favicon: 'favicon.ico',
            },
          },
        }),
    });

    const { result } = renderHook(() => useBranding(), { wrapper: createProviderWrapper() });

    await waitFor(() => {
      expect(result.current.branding.companyName).toBe('Aloha Bail Bonds');
    });

    expect(result.current.branding.primaryColor).toBe('#ff0000');
    expect(result.current.branding.secondaryColor).toBe('#00ff00');
  });

  it('updateBranding updates branding state and sets CSS variables', async () => {
    const { result } = renderHook(() => useBranding(), { wrapper: createProviderWrapper() });

    act(() => {
      result.current.updateBranding({
        primaryColor: '#123456',
        secondaryColor: '#654321',
      });
    });

    expect(result.current.branding.primaryColor).toBe('#123456');
    expect(result.current.branding.secondaryColor).toBe('#654321');
    expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#123456');
    expect(document.documentElement.style.getPropertyValue('--secondary-color')).toBe('#654321');
  });
});
