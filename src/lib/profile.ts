/** "Class of '28" for 2028, the way Cornell writes it. */
export function formatClassOf(gradYear: number): string {
  return `Class of '${String(gradYear).slice(-2)}`;
}

/** Earliest and latest graduation year accepted: covers late finishers and grad/PhD students. */
export function gradYearRange(now: Date): { min: number; max: number } {
  const year = now.getFullYear();
  return { min: year - 4, max: year + 8 };
}

/** Parses the graduation-year box. Returns the year, or a message to show. */
export function validateGradYear(text: string, now: Date): { year: number } | { error: string } {
  const trimmed = text.trim();
  if (!/^\d{4}$/.test(trimmed)) return { error: 'Enter a 4-digit year, like 2028.' };
  const year = Number(trimmed);
  const { min, max } = gradYearRange(now);
  if (year < min || year > max) return { error: `Enter a year between ${min} and ${max}.` };
  return { year };
}

export const BIO_MAX = 160;
