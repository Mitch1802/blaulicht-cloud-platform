import { normalizeDateInput } from './date-normalization.util';

describe('normalizeDateInput', () => {
  it('returns empty string for null-like values', () => {
    expect(normalizeDateInput(undefined)).toBe('');
    expect(normalizeDateInput(null)).toBe('');
    expect(normalizeDateInput('')).toBe('');
    expect(normalizeDateInput('   ')).toBe('');
  });

  it('keeps YYYY-MM-DD values unchanged', () => {
    expect(normalizeDateInput('2026-03-19')).toBe('2026-03-19');
  });

  it('converts DD.MM.YYYY to YYYY-MM-DD', () => {
    expect(normalizeDateInput('19.03.2026')).toBe('2026-03-19');
  });

  it('extracts date from ISO datetime values', () => {
    expect(normalizeDateInput('2026-03-19T18:45:00.000Z')).toBe('2026-03-19');
  });

  it('returns empty string for invalid date inputs', () => {
    expect(normalizeDateInput('kein-datum')).toBe('');
  });
});
