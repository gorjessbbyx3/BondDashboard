import { describe, it, expect } from 'vitest';
import {
  insertClientSchema,
  insertBondSchema,
  insertCheckInSchema,
  insertPaymentSchema,
  insertMessageSchema,
  insertCourtDateSchema,
  insertNotificationSchema,
  insertAlertSchema,
  insertExpenseSchema,
} from './schema';

describe('insertClientSchema', () => {
  it('accepts valid client data', () => {
    const result = insertClientSchema.safeParse({
      companyId: 1,
      clientId: 'CLT-001',
      fullName: 'John Doe',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when fullName is missing', () => {
    const result = insertClientSchema.safeParse({
      companyId: 1,
      clientId: 'CLT-001',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields like email, phoneNumber, address, city, state, zipCode', () => {
    const result = insertClientSchema.safeParse({
      companyId: 1,
      clientId: 'CLT-002',
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      phoneNumber: '555-0100',
      address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62704',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('jane@example.com');
      expect(result.data.phoneNumber).toBe('555-0100');
      expect(result.data.address).toBe('123 Main St');
      expect(result.data.city).toBe('Springfield');
      expect(result.data.state).toBe('IL');
      expect(result.data.zipCode).toBe('62704');
    }
  });
});

describe('insertBondSchema', () => {
  it('accepts valid bond data', () => {
    const result = insertBondSchema.safeParse({
      clientId: 1,
      companyId: 1,
      bondAmount: '10000.00',
      totalOwed: '1000.00',
      remainingBalance: '500.00',
    });
    expect(result.success).toBe(true);
  });

  it('transforms courtDate string to Date object', () => {
    const result = insertBondSchema.safeParse({
      clientId: 1,
      companyId: 1,
      bondAmount: '10000.00',
      totalOwed: '1000.00',
      remainingBalance: '500.00',
      courtDate: '2026-06-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.courtDate).toBeInstanceOf(Date);
      expect(result.data.courtDate!.toISOString()).toBe('2026-06-15T10:00:00.000Z');
    }
  });

  it('rejects when bondAmount is missing', () => {
    const result = insertBondSchema.safeParse({
      clientId: 1,
      companyId: 1,
      totalOwed: '1000.00',
      remainingBalance: '500.00',
    });
    expect(result.success).toBe(false);
  });
});

describe('insertCheckInSchema', () => {
  it('accepts valid check-in data', () => {
    const result = insertCheckInSchema.safeParse({
      clientId: 1,
      location: 'Office',
      notes: 'Routine check-in',
    });
    expect(result.success).toBe(true);
  });

  it('transforms checkInTime string to Date', () => {
    const result = insertCheckInSchema.safeParse({
      clientId: 1,
      checkInTime: '2026-03-01T14:30:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.checkInTime).toBeInstanceOf(Date);
      expect(result.data.checkInTime!.toISOString()).toBe('2026-03-01T14:30:00.000Z');
    }
  });
});

describe('insertPaymentSchema', () => {
  it('accepts valid payment data with amount', () => {
    const result = insertPaymentSchema.safeParse({
      clientId: 1,
      amount: '250.00',
      paymentMethod: 'credit_card',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when amount is missing', () => {
    const result = insertPaymentSchema.safeParse({
      clientId: 1,
      paymentMethod: 'cash',
    });
    expect(result.success).toBe(false);
  });
});

describe('insertMessageSchema', () => {
  it('accepts valid message with defaults (senderType defaults to "admin")', () => {
    const result = insertMessageSchema.safeParse({
      clientId: 1,
      message: 'Please report to the office.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.senderType).toBe('admin');
    }
  });

  it('requires message field', () => {
    const result = insertMessageSchema.safeParse({
      clientId: 1,
      senderType: 'admin',
    });
    expect(result.success).toBe(false);
  });
});

describe('insertCourtDateSchema', () => {
  it('accepts valid court date and transforms string to Date', () => {
    const result = insertCourtDateSchema.safeParse({
      clientId: 1,
      courtDate: '2026-07-20T09:00:00.000Z',
      courtType: 'hearing',
      courtLocation: 'Springfield County Courthouse',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.courtDate).toBeInstanceOf(Date);
      expect(result.data.courtDate.toISOString()).toBe('2026-07-20T09:00:00.000Z');
    }
  });

  it('rejects when courtDate is missing', () => {
    const result = insertCourtDateSchema.safeParse({
      clientId: 1,
      courtType: 'hearing',
    });
    expect(result.success).toBe(false);
  });
});

describe('insertNotificationSchema', () => {
  it('accepts valid notification data', () => {
    const result = insertNotificationSchema.safeParse({
      userId: 'user-123',
      title: 'Court Reminder',
      message: 'Your court date is approaching.',
      type: 'court_reminder',
      priority: 'high',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when required fields are missing', () => {
    const result = insertNotificationSchema.safeParse({
      userId: 'user-123',
      title: 'Court Reminder',
      // missing message, type, priority
    });
    expect(result.success).toBe(false);
  });
});

describe('insertAlertSchema', () => {
  it('accepts valid alert data', () => {
    const result = insertAlertSchema.safeParse({
      clientId: 1,
      alertType: 'missed_checkin',
      severity: 'high',
      message: 'Client missed scheduled check-in.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when alertType is missing', () => {
    const result = insertAlertSchema.safeParse({
      clientId: 1,
      severity: 'high',
      message: 'Client missed scheduled check-in.',
    });
    expect(result.success).toBe(false);
  });
});
