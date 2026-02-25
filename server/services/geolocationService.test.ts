import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geolocationService } from './geolocationService';

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('GeolocationService', () => {
  describe('getLocationFromGPS', () => {
    it('returns correct format with GPS coordinates', async () => {
      const result = await geolocationService.getLocationFromGPS(21.3069, -157.8583);

      expect(result).toEqual({
        latitude: 21.3069,
        longitude: -157.8583,
        accuracy: 10,
        address: '21.3069, -157.8583',
      });
    });

    it('sets accuracy to 10', async () => {
      const result = await geolocationService.getLocationFromGPS(19.5, -155.5);

      expect(result.accuracy).toBe(10);
    });
  });

  describe('validateLocation', () => {
    it('returns true for Honolulu coordinates', async () => {
      const result = await geolocationService.validateLocation(21.3069, -157.8583);
      expect(result).toBe(true);
    });

    it('returns true for boundary coordinates', async () => {
      const result = await geolocationService.validateLocation(18.9, -161.0);
      expect(result).toBe(true);
    });

    it('returns false for mainland US coordinates', async () => {
      const result = await geolocationService.validateLocation(40.7128, -74.006);
      expect(result).toBe(false);
    });

    it('returns false for coordinates just outside Hawaii range', async () => {
      const tooFarNorth = await geolocationService.validateLocation(22.6, -157.0);
      expect(tooFarNorth).toBe(false);

      const tooFarSouth = await geolocationService.validateLocation(18.8, -157.0);
      expect(tooFarSouth).toBe(false);

      const tooFarWest = await geolocationService.validateLocation(21.0, -161.1);
      expect(tooFarWest).toBe(false);

      const tooFarEast = await geolocationService.validateLocation(21.0, -154.7);
      expect(tooFarEast).toBe(false);
    });
  });

  describe('trackClientLocation', () => {
    it('with GPS returns location with withinJurisdiction flag', async () => {
      const result = await geolocationService.trackClientLocation('CLT-001', {
        lat: 21.3069,
        lon: -157.8583,
      });

      expect(result).toEqual(
        expect.objectContaining({
          clientId: 'CLT-001',
          latitude: 21.3069,
          longitude: -157.8583,
          accuracy: 10,
          withinJurisdiction: true,
          source: 'gps',
        })
      );
      expect(result.timestamp).toBeDefined();
    });

    it('with GPS outside Hawaii sets withinJurisdiction to false', async () => {
      const result = await geolocationService.trackClientLocation('CLT-002', {
        lat: 40.7128,
        lon: -74.006,
      });

      expect(result.withinJurisdiction).toBe(false);
      expect(result.source).toBe('gps');
    });
  });

  describe('getCellTowerLocation', () => {
    it('handles API error (non-ok response)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      });

      const result = await geolocationService.getCellTowerLocation({
        mcc: 310,
        mnc: 260,
        lac: 7011,
        cid: 12345,
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('API request failed');
    });

    it('handles subscription-required error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue('You are not subscribed to this API'),
      });

      const result = await geolocationService.getCellTowerLocation({
        mcc: 310,
        mnc: 260,
        lac: 7011,
        cid: 12345,
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('subscription required');
    });
  });
});
