import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CourtDateScraper, courtScraper } from './courtScraper';

describe('CourtDateScraper', () => {
  let scraper: CourtDateScraper;
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network disabled in tests'));
    scraper = new CourtDateScraper();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('searchCourtDates', () => {
    it('returns a result object with correct shape', async () => {
      const result = await scraper.searchCourtDates('John Smith');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('courtDates');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('sourcesSearched');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.courtDates)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.sourcesSearched)).toBe(true);
    });

    it('lists all enabled sources in sourcesSearched', async () => {
      const result = await scraper.searchCourtDates('Jane Doe');

      expect(result.sourcesSearched).toContain('Hawaii State Judiciary');
      expect(result.sourcesSearched).toContain('Hawaii Federal District Court');
      expect(result.sourcesSearched).toContain('Honolulu County Court');
      expect(result.sourcesSearched).toContain('Hawaii Criminal Cases');
      expect(result.sourcesSearched.length).toBe(4);
    });

    it('handles fetch errors gracefully without throwing', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Connection refused'));

      const result = await scraper.searchCourtDates('John Smith');

      // Should not throw, should return a result object
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('courtDates');
      expect(result).toHaveProperty('errors');
    });

    it('returns empty courtDates when no matches found', async () => {
      const result = await scraper.searchCourtDates('Nonexistent Person XYZ');

      expect(result.courtDates).toEqual([]);
    });

    it('works with single-word names', async () => {
      const result = await scraper.searchCourtDates('Madonna');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('courtDates');
      expect(Array.isArray(result.courtDates)).toBe(true);
      expect(result.sourcesSearched.length).toBeGreaterThan(0);
    });

    it('works with multi-word names', async () => {
      const result = await scraper.searchCourtDates('Mary Jane Watson Parker');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('courtDates');
      expect(Array.isArray(result.courtDates)).toBe(true);
      expect(result.sourcesSearched.length).toBeGreaterThan(0);
    });
  });

  describe('searchArrestLogs', () => {
    it('returns a result object with correct shape', async () => {
      const result = await scraper.searchArrestLogs('John Smith');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('arrests');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('sourcesSearched');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.arrests)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.sourcesSearched)).toBe(true);
    });

    it('includes sources in sourcesSearched', async () => {
      const result = await scraper.searchArrestLogs('Jane Doe');

      expect(result.sourcesSearched).toContain('Honolulu Police Department');
      expect(result.sourcesSearched).toContain('Hawaii Police Department');
      expect(result.sourcesSearched.length).toBe(2);
    });

    it('handles errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Timeout'));

      const result = await scraper.searchArrestLogs('John Smith');

      // Should not throw, should return a result object
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('arrests');
      expect(result).toHaveProperty('errors');
    });
  });
});
