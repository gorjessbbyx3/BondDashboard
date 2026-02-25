import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from './not-found';

describe('NotFound', () => {
  it('renders "404 Page Not Found" text', () => {
    render(<NotFound />);
    expect(screen.getByText('404 Page Not Found')).toBeInTheDocument();
  });

  it('renders question about adding page to router', () => {
    render(<NotFound />);
    expect(
      screen.getByText('Did you forget to add the page to the router?'),
    ).toBeInTheDocument();
  });

  it('renders within a Card component', () => {
    const { container } = render(<NotFound />);
    // Card renders a div with the class containing "max-w-md" wrapping the content
    const card = container.querySelector('.max-w-md');
    expect(card).toBeInTheDocument();
  });
});
