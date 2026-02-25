import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    toasts: [],
    dismiss: vi.fn(),
  }),
}));

// Mock apiRequest
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

import { CheckInForm } from './check-in-form';
import { apiRequest } from '@/lib/queryClient';

const mockApiRequest = vi.mocked(apiRequest);
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

// Helper to mock navigator.geolocation
function mockGeolocation(options?: {
  shouldFail?: boolean;
  errorCode?: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}) {
  const {
    shouldFail = false,
    errorCode = 1,
    latitude = 33.448376,
    longitude = -112.074036,
    accuracy = 10,
  } = options || {};

  const getCurrentPosition = vi.fn((successCb, errorCb) => {
    if (shouldFail) {
      errorCb({
        code: errorCode,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'Geolocation error',
      });
    } else {
      successCb({
        coords: { latitude, longitude, accuracy },
        timestamp: Date.now(),
      });
    }
  });

  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    writable: true,
    configurable: true,
  });

  return getCurrentPosition;
}

describe('CheckInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Default: apiRequest for fetching check-ins returns [] (first check-in)
    mockApiRequest.mockResolvedValue([] as any);
    // Default: geolocation succeeds
    mockGeolocation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the "Secure Check-In Verification" title', async () => {
    render(<CheckInForm clientId={1} />, { wrapper: createWrapper() });

    expect(screen.getByText('Secure Check-In Verification')).toBeInTheDocument();
  });

  it('shows GPS Location Verification section with MANDATORY badge', async () => {
    render(<CheckInForm clientId={1} />, { wrapper: createWrapper() });

    expect(screen.getByText('GPS Location Verification')).toBeInTheDocument();
    expect(screen.getByText('MANDATORY')).toBeInTheDocument();
  });

  it('has a "Refresh GPS" button', async () => {
    render(<CheckInForm clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Refresh GPS')).toBeInTheDocument();
    });
  });

  it('shows location error alert when geolocation fails', async () => {
    mockGeolocation({ shouldFail: true, errorCode: 1 });

    render(<CheckInForm clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/Location access denied/),
      ).toBeInTheDocument();
    });
  });

  it('shows "GPS location verified:" when location is set', async () => {
    mockGeolocation({ latitude: 40.712776, longitude: -74.005974 });

    render(<CheckInForm clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/GPS location verified:/),
      ).toBeInTheDocument();
    });
  });

  it('has a "Submit Verified Check-In" button that is disabled when no location', async () => {
    // Remove geolocation so location stays empty
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(<CheckInForm clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const submitButton = screen.getByText('Submit Verified Check-In');
      expect(submitButton).toBeInTheDocument();
      expect(submitButton.closest('button')).toBeDisabled();
    });
  });

  it('shows "Identity Verification Required" badge for first check-in', async () => {
    // apiRequest returns [] meaning no existing check-ins
    mockApiRequest.mockResolvedValue([] as any);

    render(<CheckInForm clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Identity Verification Required')).toBeInTheDocument();
    });
  });

  it('does not show "Identity Verification Required" when there are existing check-ins', async () => {
    mockApiRequest.mockResolvedValue([{ id: 1, location: '33.0, -112.0' }] as any);

    render(<CheckInForm clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Secure Check-In Verification')).toBeInTheDocument();
    });

    expect(screen.queryByText('Identity Verification Required')).not.toBeInTheDocument();
  });

  it('calls navigator.geolocation.getCurrentPosition on mount', async () => {
    const getCurrentPosition = mockGeolocation();

    render(<CheckInForm clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getCurrentPosition).toHaveBeenCalled();
    });
  });

  it('shows GPS error when geolocation is not supported', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(<CheckInForm clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/This device does not support GPS/),
      ).toBeInTheDocument();
    });
  });
});
