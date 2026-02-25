import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from './header';

describe('Header', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T14:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders default title "Aloha Bail Bond"', () => {
    render(<Header />);
    expect(screen.getByText('Aloha Bail Bond')).toBeInTheDocument();
  });

  it('renders default subtitle "Professional Bail Services"', () => {
    render(<Header />);
    expect(screen.getByText('Professional Bail Services')).toBeInTheDocument();
  });

  it('renders custom title when passed', () => {
    render(<Header title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.queryByText('Aloha Bail Bond')).not.toBeInTheDocument();
  });

  it('renders custom subtitle when passed', () => {
    render(<Header subtitle="Custom Subtitle" />);
    expect(screen.getByText('Custom Subtitle')).toBeInTheDocument();
    expect(screen.queryByText('Professional Bail Services')).not.toBeInTheDocument();
  });

  it('shows the current time display', () => {
    render(<Header />);
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
  });
});
