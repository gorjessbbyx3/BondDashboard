import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import BondForm from './bond-form';

describe('BondForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    isLoading: false,
    clientId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the "Bond Amount *" label', () => {
    render(<BondForm {...defaultProps} />);

    expect(screen.getByText('Bond Amount *')).toBeInTheDocument();
  });

  it('renders all input fields', () => {
    render(<BondForm {...defaultProps} />);

    expect(screen.getByLabelText('Bond Amount *')).toBeInTheDocument();
    expect(screen.getByLabelText('Premium Rate (%)')).toBeInTheDocument();
    expect(screen.getByLabelText('Down Payment')).toBeInTheDocument();
    expect(screen.getByLabelText('Court Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Court Location')).toBeInTheDocument();
    expect(screen.getByLabelText('Case Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Charges')).toBeInTheDocument();
    expect(screen.getByLabelText('Collateral')).toBeInTheDocument();
    expect(screen.getByLabelText('Cosigner Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Cosigner Phone')).toBeInTheDocument();
    expect(screen.getByLabelText('Additional Notes')).toBeInTheDocument();
  });

  it('defaults Bond Type select to "surety"', () => {
    render(<BondForm {...defaultProps} />);

    const matches = screen.getAllByText('Surety Bond');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('defaults Risk Assessment select to "medium"', () => {
    render(<BondForm {...defaultProps} />);

    const matches = screen.getAllByText('Medium Risk');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows calculated premium when bondAmount is entered', () => {
    render(<BondForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Bond Amount *'), { target: { value: '50000' } });

    expect(screen.getByText('Calculated Premium:')).toBeInTheDocument();
    expect(screen.getByText('$5000.00')).toBeInTheDocument();
  });

  it('renders "Submit Bond" button', () => {
    render(<BondForm {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Submit Bond' })).toBeInTheDocument();
  });

  it('shows "Creating Bond..." when isLoading is true', () => {
    render(<BondForm {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('button', { name: 'Creating Bond...' })).toBeInTheDocument();
  });

  it('shows toast when submitting without bond amount', () => {
    render(<BondForm {...defaultProps} />);

    fireEvent.submit(screen.getByRole('button', { name: 'Submit Bond' }));

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Validation Error',
      description: 'Please enter a valid bond amount',
      variant: 'destructive',
    }));
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows toast when submitting with bond amount of 0', () => {
    render(<BondForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Bond Amount *'), { target: { value: '0' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Submit Bond' }));

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Validation Error',
      description: 'Please enter a valid bond amount',
      variant: 'destructive',
    }));
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with form data when valid bond amount is provided', () => {
    render(<BondForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Bond Amount *'), { target: { value: '25000' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Submit Bond' }));

    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 1,
        bondAmount: '25000',
        bondType: 'surety',
        premiumRate: '10',
        riskAssessment: 'medium',
      }),
    );
  });
});
