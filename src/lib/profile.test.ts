import { describe, expect, it } from 'vitest';
import { formatClassOf, validateGradYear } from './profile';

const now = new Date(2026, 10, 26);

describe('formatClassOf', () => {
  it("writes the year the Cornell way", () => {
    expect(formatClassOf(2028)).toBe("Class of '28");
    expect(formatClassOf(2030)).toBe("Class of '30");
  });
});

describe('validateGradYear', () => {
  it('accepts a 4-digit year in range', () => {
    expect(validateGradYear(' 2028 ', now)).toEqual({ year: 2028 });
  });

  it('asks for 4 digits', () => {
    expect(validateGradYear('28', now)).toEqual({ error: 'Enter a 4-digit year, like 2028.' });
    expect(validateGradYear('', now)).toEqual({ error: 'Enter a 4-digit year, like 2028.' });
  });

  it('refuses years far outside a student’s range', () => {
    expect(validateGradYear('2015', now)).toEqual({ error: 'Enter a year between 2022 and 2034.' });
    expect(validateGradYear('2040', now)).toEqual({ error: 'Enter a year between 2022 and 2034.' });
  });
});
