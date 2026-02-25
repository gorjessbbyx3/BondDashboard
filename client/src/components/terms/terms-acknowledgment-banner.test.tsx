import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('wouter', () => ({
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import TermsAcknowledgmentBanner from './terms-acknowledgment-banner';

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

describe('TermsAcknowledgmentBanner', () => {
  const defaultProps = {
    onAcknowledge: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it('renders "Terms of Service Agreement Required" heading', () => {
    render(<TermsAcknowledgmentBanner {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByText('Terms of Service Agreement Required')).toBeInTheDocument();
  });

  it('shows key points about the application', () => {
    render(<TermsAcknowledgmentBanner {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByText('Key Points:')).toBeInTheDocument();
    expect(screen.getByText(/digital tool for licensed bail bond companies/)).toBeInTheDocument();
    expect(screen.getByText(/does not provide legal advice/)).toBeInTheDocument();
    expect(screen.getByText(/responsible for compliance/)).toBeInTheDocument();
  });

  it('has checkbox "I have read and understand the Terms of Service"', () => {
    render(<TermsAcknowledgmentBanner {...defaultProps} />, { wrapper: createWrapper() });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(screen.getByText(/I have read and understand the/)).toBeInTheDocument();
  });

  it('"I Accept the Terms" button is initially disabled', () => {
    render(<TermsAcknowledgmentBanner {...defaultProps} />, { wrapper: createWrapper() });

    const acceptButton = screen.getByRole('button', { name: 'I Accept the Terms' });
    expect(acceptButton).toBeDisabled();
  });

  it('enables "I Accept the Terms" button after checking the checkbox', () => {
    render(<TermsAcknowledgmentBanner {...defaultProps} />, { wrapper: createWrapper() });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const acceptButton = screen.getByRole('button', { name: 'I Accept the Terms' });
    expect(acceptButton).toBeEnabled();
  });

  it('shows "Read Full Terms" button', () => {
    render(<TermsAcknowledgmentBanner {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /Read Full Terms/ })).toBeInTheDocument();
  });

  it('shows explanatory text about accepting terms', () => {
    render(<TermsAcknowledgmentBanner {...defaultProps} />, { wrapper: createWrapper() });

    expect(
      screen.getByText(/By clicking "I Accept the Terms", you acknowledge that you have read/)
    ).toBeInTheDocument();
  });
});
