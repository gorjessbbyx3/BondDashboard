import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges multiple class strings', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('handles conditional classes with falsy values', () => {
    const isActive = false;
    const result = cn('base-class', isActive && 'active-class', undefined, null, 'another-class');
    expect(result).toBe('base-class another-class');
  });

  it('deduplicates tailwind classes keeping the last one', () => {
    const result = cn('p-4 p-2');
    expect(result).toBe('p-2');
  });

  it('handles arrays and objects', () => {
    const result = cn(['flex', 'items-center'], { 'font-bold': true, 'text-red-500': false });
    expect(result).toBe('flex items-center font-bold');
  });

  it('returns empty string for no inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });
});
