import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockToast = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import NewClientForm from './new-client-form';

describe('NewClientForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders required field labels "Full Name *" and "Client ID *"', () => {
    render(<NewClientForm {...defaultProps} />);

    expect(screen.getByText('Full Name *')).toBeInTheDocument();
    expect(screen.getByText('Client ID *')).toBeInTheDocument();
  });

  it('renders all input fields', () => {
    render(<NewClientForm {...defaultProps} />);

    expect(screen.getByLabelText('Full Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Client ID *')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Date of Birth')).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Emergency Contact')).toBeInTheDocument();
    expect(screen.getByLabelText('Emergency Phone')).toBeInTheDocument();
    expect(screen.getByLabelText('Court Location')).toBeInTheDocument();
    expect(screen.getByLabelText('Charges')).toBeInTheDocument();
  });

  it('renders Active Status switch defaulting to checked', () => {
    render(<NewClientForm {...defaultProps} />);

    expect(screen.getByText('Active Status')).toBeInTheDocument();
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeChecked();
  });

  it('renders Cancel button that calls onCancel when clicked', () => {
    render(<NewClientForm {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders "Create Client" button when no editingClient is provided', () => {
    render(<NewClientForm {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Create Client' })).toBeInTheDocument();
  });

  it('renders "Update Client" button when editingClient is provided', () => {
    render(
      <NewClientForm
        {...defaultProps}
        editingClient={{ fullName: 'John Doe', clientId: 'SB123' }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Update Client' })).toBeInTheDocument();
  });

  it('shows "Creating..." when isLoading is true', () => {
    render(<NewClientForm {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument();
  });

  it('does not call onSubmit when fullName is empty', () => {
    render(<NewClientForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Client ID *'), { target: { value: 'SB123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Client' }));

    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Full name is required' }),
    );
  });

  it('does not call onSubmit when clientId is empty', () => {
    render(<NewClientForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Full Name *'), { target: { value: 'John Doe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Client' }));

    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Client ID is required' }),
    );
  });

  it('does not call onSubmit when clientId is less than 3 characters', () => {
    render(<NewClientForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Full Name *'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Client ID *'), { target: { value: 'AB' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Client' }));

    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Client ID must be at least 3 characters' }),
    );
  });

  it('calls onSubmit with form data when valid data is provided', () => {
    render(<NewClientForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Full Name *'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Client ID *'), { target: { value: 'SB123456' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '(808) 555-1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Client' }));

    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'John Doe',
        clientId: 'SB123456',
        phoneNumber: '(808) 555-1234',
        isActive: true,
      }),
    );
  });

  it('pre-fills form fields when editingClient is provided', () => {
    const editingClient = {
      fullName: 'Jane Smith',
      clientId: 'SB999',
      phoneNumber: '(808) 555-9999',
      address: '123 Main St',
      isActive: false,
    };

    render(<NewClientForm {...defaultProps} editingClient={editingClient} />);

    expect(screen.getByLabelText('Full Name *')).toHaveValue('Jane Smith');
    expect(screen.getByLabelText('Client ID *')).toHaveValue('SB999');
    expect(screen.getByLabelText('Phone Number')).toHaveValue('(808) 555-9999');
    expect(screen.getByLabelText('Address')).toHaveValue('123 Main St');
    expect(screen.getByRole('switch')).not.toBeChecked();
  });
});
