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

import { CourtDateNotifications } from './court-date-notifications';

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

describe('CourtDateNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows "Court Date Notifications" title', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<CourtDateNotifications clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Court Date Notifications')).toBeInTheDocument();
    });
  });

  it('shows "Loading notifications..." when loading', () => {
    // Make fetch hang so component stays in loading state
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<CourtDateNotifications clientId={1} />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
  });

  it('shows "All court dates acknowledged" when no unacknowledged court dates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<CourtDateNotifications clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('All court dates acknowledged')).toBeInTheDocument();
    });
  });

  it('shows unacknowledged court dates with "Acknowledge" button', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/client/court-dates')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              courtDate: '2026-04-15T09:00:00.000Z',
              courtLocation: 'Downtown Courthouse',
              courtType: 'Criminal',
              caseNumber: 'CR-2026-001',
              adminApproved: true,
              clientAcknowledged: false,
              notes: 'Bring identification',
              charges: 'Misdemeanor',
            },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });

    render(<CourtDateNotifications clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Acknowledge')).toBeInTheDocument();
    });
  });

  it('shows "Requires Acknowledgment" badge for pending dates', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/client/court-dates')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              courtDate: '2026-04-15T09:00:00.000Z',
              courtLocation: 'Downtown Courthouse',
              courtType: 'Criminal',
              caseNumber: 'CR-2026-001',
              adminApproved: true,
              clientAcknowledged: false,
            },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });

    render(<CourtDateNotifications clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Requires Acknowledgment')).toBeInTheDocument();
    });
  });

  it('shows court date details (location, court type, case number)', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/client/court-dates')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              courtDate: '2026-04-15T09:00:00.000Z',
              courtLocation: 'Central District Court',
              courtType: 'Family',
              caseNumber: 'FAM-2026-555',
              adminApproved: true,
              clientAcknowledged: false,
            },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });

    render(<CourtDateNotifications clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Central District Court')).toBeInTheDocument();
    });
    expect(screen.getByText(/Family/)).toBeInTheDocument();
    expect(screen.getByText(/FAM-2026-555/)).toBeInTheDocument();
  });

  it('shows "Pending" badge count when there are unacknowledged dates', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/client/court-dates')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              courtDate: '2026-04-15T09:00:00.000Z',
              courtType: 'Criminal',
              adminApproved: true,
              clientAcknowledged: false,
            },
            {
              id: 2,
              courtDate: '2026-05-20T10:00:00.000Z',
              courtType: 'Civil',
              adminApproved: true,
              clientAcknowledged: false,
            },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });

    render(<CourtDateNotifications clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('2 Pending')).toBeInTheDocument();
    });
  });

  it('does not show already-acknowledged court dates as requiring action', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/client/court-dates')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              courtDate: '2026-04-15T09:00:00.000Z',
              courtType: 'Criminal',
              adminApproved: true,
              clientAcknowledged: true,
            },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });

    render(<CourtDateNotifications clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('All court dates acknowledged')).toBeInTheDocument();
    });

    expect(screen.queryByText('Acknowledge')).not.toBeInTheDocument();
    expect(screen.queryByText('Requires Acknowledgment')).not.toBeInTheDocument();
  });
});
