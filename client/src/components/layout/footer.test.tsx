import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('wouter', () => ({
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

import Footer from './footer';

describe('Footer', () => {
  it('renders copyright text "© 2025 Aloha Bail Bond"', () => {
    render(<Footer />);
    expect(screen.getByText(/© 2025 Aloha Bail Bond/)).toBeInTheDocument();
  });

  it('renders "Privacy Policy" link', () => {
    render(<Footer />);
    const link = screen.getByText('Privacy Policy');
    expect(link).toBeInTheDocument();
    // The mock Link wraps the inner <a> in an outer <a href="...">, so traverse up
    const anchor = link.closest('a[href]');
    expect(anchor).toHaveAttribute('href', '/privacy-policy');
  });

  it('renders "Terms of Service" link', () => {
    render(<Footer />);
    const link = screen.getByText('Terms of Service');
    expect(link).toBeInTheDocument();
    const anchor = link.closest('a[href]');
    expect(anchor).toHaveAttribute('href', '/terms-of-service');
  });

  it('renders developer credit "GoJess & Co"', () => {
    render(<Footer />);
    const matches = screen.getAllByText(/GoJess & Co/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
