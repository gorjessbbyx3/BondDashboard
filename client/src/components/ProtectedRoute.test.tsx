import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from './ProtectedRoute';

const mockUseAuth = vi.mocked(useAuth);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading screen when isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: true,
      isAuthenticated: false,
      isAdmin: false,
      isClient: false,
      isMaintenance: false,
      logout: vi.fn(),
      refetch: vi.fn(),
      error: null,
    } as any);

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('shows children when authenticated with no role requirement', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'client' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: false,
      isClient: true,
      isMaintenance: false,
      logout: vi.fn(),
      refetch: vi.fn(),
      error: null,
    } as any);

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('shows "Access Denied" when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
      isClient: false,
      isMaintenance: false,
      logout: vi.fn(),
      refetch: vi.fn(),
      error: null,
    } as any);

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('shows "Go to Login" button when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
      isClient: false,
      isMaintenance: false,
      logout: vi.fn(),
      refetch: vi.fn(),
      error: null,
    } as any);

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Go to Login')).toBeInTheDocument();
  });

  it('shows "Retry Authentication" button when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
      isClient: false,
      isMaintenance: false,
      logout: vi.fn(),
      refetch: vi.fn(),
      error: null,
    } as any);

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Retry Authentication')).toBeInTheDocument();
  });

  it('shows custom fallback when not authenticated and fallback provided', () => {
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
      isClient: false,
      isMaintenance: false,
      logout: vi.fn(),
      refetch: vi.fn(),
      error: null,
    } as any);

    render(
      <ProtectedRoute fallback={<div>Custom fallback UI</div>}>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('shows "Insufficient Permissions" when authenticated but wrong role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'client' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: false,
      isClient: true,
      isMaintenance: false,
      logout: vi.fn(),
      refetch: vi.fn(),
      error: null,
    } as any);

    render(
      <ProtectedRoute requiredRole="admin">
        <div>Admin content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('shows required and actual role info in permissions message', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'client' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: false,
      isClient: true,
      isMaintenance: false,
      logout: vi.fn(),
      refetch: vi.fn(),
      error: null,
    } as any);

    render(
      <ProtectedRoute requiredRole="admin">
        <div>Admin content</div>
      </ProtectedRoute>,
    );

    const permissionsText = screen.getByText(/Required role:.*admin.*Your role:.*client/);
    expect(permissionsText).toBeInTheDocument();
  });

  it('shows children when authenticated with correct role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'admin' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: true,
      isClient: false,
      isMaintenance: false,
      logout: vi.fn(),
      refetch: vi.fn(),
      error: null,
    } as any);

    render(
      <ProtectedRoute requiredRole="admin">
        <div>Admin content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Admin content')).toBeInTheDocument();
    expect(screen.queryByText('Insufficient Permissions')).not.toBeInTheDocument();
  });

  it('shows children when no requiredRole is specified even with role mismatch', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'client' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: false,
      isClient: true,
      isMaintenance: false,
      logout: vi.fn(),
      refetch: vi.fn(),
      error: null,
    } as any);

    render(
      <ProtectedRoute>
        <div>Any authenticated user content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Any authenticated user content')).toBeInTheDocument();
    expect(screen.queryByText('Insufficient Permissions')).not.toBeInTheDocument();
  });
});
