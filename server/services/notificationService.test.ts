import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../storage', () => ({
  storage: {
    createNotification: vi.fn().mockResolvedValue({ id: 1 }),
  }
}));

vi.mock('./sendgrid', () => ({
  sendGridService: {
    isReady: vi.fn().mockReturnValue(false),
    sendEmail: vi.fn().mockResolvedValue(true),
  }
}));

import { notificationService } from './notificationService';
import { storage } from '../storage';

const mockClient = {
  id: 1,
  clientId: 'CLT-001',
  fullName: 'John Doe',
  phoneNumber: '808-555-0123',
} as any;

const mockClientNoPhone = {
  id: 2,
  clientId: 'CLT-002',
  fullName: 'Jane Smith',
  phoneNumber: null,
} as any;

const mockCourtDate = {
  id: 1,
  courtDate: new Date('2026-03-15'),
  courtLocation: 'Honolulu District Court',
  caseNumber: 'CR-2026-001',
} as any;

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendCourtDateReminder', () => {
    it('does not throw when client has phone number', async () => {
      await expect(
        notificationService.sendCourtDateReminder(mockClient, mockCourtDate, 'initial')
      ).resolves.not.toThrow();
    });

    it('does not throw when client has no phone number', async () => {
      await expect(
        notificationService.sendCourtDateReminder(mockClientNoPhone, mockCourtDate, 'initial')
      ).resolves.not.toThrow();
    });
  });

  describe('sendPaymentReminder', () => {
    it('does not throw', async () => {
      await expect(
        notificationService.sendPaymentReminder(mockClient, '500.00')
      ).resolves.not.toThrow();
    });
  });

  describe('sendCheckInReminder', () => {
    it('does not throw', async () => {
      await expect(
        notificationService.sendCheckInReminder(mockClient)
      ).resolves.not.toThrow();
    });
  });

  describe('sendTestSMS', () => {
    it('returns boolean', async () => {
      const result = await notificationService.sendTestSMS('808-555-0199');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('createNotification (via sendPaymentReminder)', () => {
    it('calls storage.createNotification', async () => {
      await notificationService.sendPaymentReminder(mockClient, '250.00');

      expect(storage.createNotification).toHaveBeenCalled();
      expect(storage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'CLT-001',
          type: 'payment_reminder',
          read: false,
        })
      );
    });
  });
});
