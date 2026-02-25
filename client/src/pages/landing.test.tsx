import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Radix UI Checkbox uses ResizeObserver which is not available in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockSetLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/layout/header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('@/components/layout/footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

// The vitest config does not resolve @assets, so mock the absolute path
vi.mock('/home/user/BondDashboard/attached_assets/ChatGPT Image Jun 9, 2025, 08_07_36 PM_1749535833870.png', () => ({
  default: 'test-logo.png',
}));

import Landing from './landing';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('Landing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "ALOHA BAIL BOND" heading', () => {
    render(<Landing />, { wrapper: createWrapper() });
    expect(screen.getByText('ALOHA BAIL BOND')).toBeInTheDocument();
  });

  it('renders "Client Portal" heading', () => {
    render(<Landing />, { wrapper: createWrapper() });
    expect(screen.getByText('Client Portal')).toBeInTheDocument();
  });

  it('has Client ID input field', () => {
    render(<Landing />, { wrapper: createWrapper() });
    expect(screen.getByLabelText('Client ID')).toBeInTheDocument();
  });

  it('has Password input field', () => {
    render(<Landing />, { wrapper: createWrapper() });
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('has "Remember me" checkbox', () => {
    render(<Landing />, { wrapper: createWrapper() });
    expect(screen.getByText('Remember me')).toBeInTheDocument();
  });

  it('has "Access My Account" button', () => {
    render(<Landing />, { wrapper: createWrapper() });
    expect(screen.getByText('Access My Account')).toBeInTheDocument();
  });

  it('has "Admin Access" section', () => {
    render(<Landing />, { wrapper: createWrapper() });
    expect(screen.getByText('Admin Access')).toBeInTheDocument();
  });

  it('has "Staff Access" section', () => {
    render(<Landing />, { wrapper: createWrapper() });
    expect(screen.getByText('Staff Access')).toBeInTheDocument();
  });

  it('has "System Maintenance" section', () => {
    render(<Landing />, { wrapper: createWrapper() });
    expect(screen.getByText('System Maintenance')).toBeInTheDocument();
  });

  it('shows "Secure Connection" notice', () => {
    render(<Landing />, { wrapper: createWrapper() });
    expect(screen.getByText('Secure Connection')).toBeInTheDocument();
  });
});
