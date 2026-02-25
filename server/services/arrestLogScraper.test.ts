import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArrestLogScraper, arrestLogScraper } from './arrestLogScraper';

describe('ArrestLogScraper', () => {
  let scraper: ArrestLogScraper;
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    scraper = new ArrestLogScraper();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('scrapeHonoluluPD', () => {
    it('returns empty array on HTTP error', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await scraper.scrapeHonoluluPD();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });

    it('returns empty array on network timeout', async () => {
      (global.fetch as any).mockRejectedValue(new Error('AbortError: signal timed out'));

      const result = await scraper.scrapeHonoluluPD();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });

    it('returns array (possibly empty) on success with HTML content', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><body><h1>Arrest Logs</h1><p>Honolulu Police Department</p></body></html>'),
      });

      const result = await scraper.scrapeHonoluluPD();

      expect(Array.isArray(result)).toBe(true);
    });

    it('handles fetch rejection gracefully and returns empty array instead of throwing', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network failure'));

      const result = await scraper.scrapeHonoluluPD();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });
  });

  describe('scrapeAllCounties', () => {
    it('returns an array', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><body></body></html>'),
      });

      const result = await scraper.scrapeAllCounties();

      expect(Array.isArray(result)).toBe(true);
    });

    it('includes results from scrapeHonoluluPD', async () => {
      const honoluluSpy = vi.spyOn(scraper, 'scrapeHonoluluPD');
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><body></body></html>'),
      });

      await scraper.scrapeAllCounties();

      expect(honoluluSpy).toHaveBeenCalledOnce();
    });
  });
});
