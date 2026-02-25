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

import PaymentUpload from './payment-upload';

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

describe('PaymentUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: fetch returns empty payments array
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Submit Payment" title', async () => {
    render(<PaymentUpload clientId={1} />, { wrapper: createWrapper() });

    const headings = screen.getAllByText('Submit Payment');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    // The first match is the card title
    expect(headings[0]).toBeInTheDocument();
  });

  it('has payment amount input', async () => {
    render(<PaymentUpload clientId={1} />, { wrapper: createWrapper() });

    const amountInput = screen.getByPlaceholderText('0.00');
    expect(amountInput).toBeInTheDocument();
    expect(amountInput).toHaveAttribute('type', 'number');
  });

  it('has payment method select with placeholder', async () => {
    render(<PaymentUpload clientId={1} />, { wrapper: createWrapper() });

    expect(screen.getByText('Select payment method')).toBeInTheDocument();
  });

  it('has notes textarea', async () => {
    render(<PaymentUpload clientId={1} />, { wrapper: createWrapper() });

    expect(
      screen.getByPlaceholderText('Additional payment information...'),
    ).toBeInTheDocument();
  });

  it('has a file input for receipt upload', async () => {
    render(<PaymentUpload clientId={1} />, { wrapper: createWrapper() });

    const fileInput = document.getElementById('receipt') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  it('shows "Payment History" section', async () => {
    render(<PaymentUpload clientId={1} />, { wrapper: createWrapper() });

    expect(screen.getByText('Payment History')).toBeInTheDocument();
  });

  it('shows "No payments recorded yet." when no payments', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<PaymentUpload clientId={1} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No payments recorded yet.')).toBeInTheDocument();
    });
  });

  it('shows "Important" notice about payment confirmation', async () => {
    render(<PaymentUpload clientId={1} />, { wrapper: createWrapper() });

    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(
      screen.getByText(/Payments require confirmation by the bondsman/),
    ).toBeInTheDocument();
  });
});
