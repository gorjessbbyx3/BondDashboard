import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingScreen } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('LoadingScreen', () => {
  it('shows default "Loading..." message', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows custom message when provided', () => {
    render(<LoadingScreen message="Fetching data..." />);
    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders the spinner', () => {
    const { container } = render(<LoadingScreen />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
