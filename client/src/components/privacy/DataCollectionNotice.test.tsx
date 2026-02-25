import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DataCollectionNotice from './DataCollectionNotice';

describe('DataCollectionNotice', () => {
  const defaultProps = {
    onAccept: vi.fn(),
    onDecline: vi.fn(),
    userRole: 'client' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Data Collection & Privacy Notice" title', () => {
    render(<DataCollectionNotice {...defaultProps} />);

    expect(screen.getByText('Data Collection & Privacy Notice')).toBeInTheDocument();
  });

  it('shows user role with first letter capitalized', () => {
    render(<DataCollectionNotice {...defaultProps} userRole="client" />);

    expect(screen.getByText(/Client/)).toBeInTheDocument();
  });

  it('shows all 6 data collection items', () => {
    render(<DataCollectionNotice {...defaultProps} />);

    expect(screen.getByText('GPS Location Tracking')).toBeInTheDocument();
    expect(screen.getByText('Facial Recognition Data')).toBeInTheDocument();
    expect(screen.getByText('Personal & Legal Information')).toBeInTheDocument();
    expect(screen.getByText('Financial Transaction Data')).toBeInTheDocument();
    expect(screen.getByText('System Usage Analytics')).toBeInTheDocument();
    expect(screen.getByText('Communication Records')).toBeInTheDocument();
  });

  it('"Accept & Continue" button is initially disabled', () => {
    render(<DataCollectionNotice {...defaultProps} />);

    const acceptButton = screen.getByRole('button', { name: 'Accept & Continue' });
    expect(acceptButton).toBeDisabled();
  });

  it('"Decline & Exit" button is always enabled and calls onDecline when clicked', () => {
    render(<DataCollectionNotice {...defaultProps} />);

    const declineButton = screen.getByRole('button', { name: 'Decline & Exit' });
    expect(declineButton).toBeEnabled();

    fireEvent.click(declineButton);
    expect(defaultProps.onDecline).toHaveBeenCalledTimes(1);
  });

  it('enables "Accept & Continue" after checking all 5 required items', () => {
    render(<DataCollectionNotice {...defaultProps} />);

    const acceptButton = screen.getByRole('button', { name: 'Accept & Continue' });
    expect(acceptButton).toBeDisabled();

    // Check all 5 required items (location, biometric, personal, financial, communication)
    fireEvent.click(screen.getByRole('checkbox', { name: /GPS Location Tracking/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Facial Recognition Data/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Personal & Legal Information/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Financial Transaction Data/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Communication Records/i }));

    expect(acceptButton).toBeEnabled();
  });

  it('calls onAccept when "Accept & Continue" is clicked after checking required items', () => {
    render(<DataCollectionNotice {...defaultProps} />);

    // Check all required items
    fireEvent.click(screen.getByRole('checkbox', { name: /GPS Location Tracking/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Facial Recognition Data/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Personal & Legal Information/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Financial Transaction Data/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Communication Records/i }));

    const acceptButton = screen.getByRole('button', { name: 'Accept & Continue' });
    fireEvent.click(acceptButton);

    expect(defaultProps.onAccept).toHaveBeenCalledTimes(1);
  });

  it('"Show Details" button toggles to "Hide Details" and reveals detailed descriptions', () => {
    render(<DataCollectionNotice {...defaultProps} />);

    const detailsButton = screen.getByRole('button', { name: 'Show Details' });
    expect(detailsButton).toBeInTheDocument();

    // Details should not be visible initially
    expect(screen.queryByText(/Legal Basis:/)).not.toBeInTheDocument();

    // Click to show details
    fireEvent.click(detailsButton);

    expect(screen.getByRole('button', { name: 'Hide Details' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show Details' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Legal Basis:/).length).toBeGreaterThan(0);
  });

  it('shows "Your Data Rights" section', () => {
    render(<DataCollectionNotice {...defaultProps} />);

    expect(screen.getByText('Your Data Rights')).toBeInTheDocument();
    expect(screen.getByText(/Right to access your personal data/)).toBeInTheDocument();
  });

  it('shows "Data Sharing & Third Parties" section', () => {
    render(<DataCollectionNotice {...defaultProps} />);

    expect(screen.getByText('Data Sharing & Third Parties')).toBeInTheDocument();
    expect(screen.getByText(/No data sale to third parties/)).toBeInTheDocument();
  });
});
