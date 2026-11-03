import { describe, expect, it } from 'vitest';
import { combineDateAndTime, validateEventForm, type EventDraft } from './validation';

// combineDateAndTime does its arithmetic in local time (setHours), so fixtures
// must be constructed as local dates too, not parsed from UTC ISO strings.
const now = new Date(2026, 10, 2, 12, 0, 0);

function makeDraft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    title: 'Pickup soccer',
    description: 'Casual game on the quad.',
    category: 'sports',
    date: new Date(2026, 10, 2),
    startTime: '14:00',
    endTime: '15:00',
    locationName: 'Arts Quad',
    capacityMode: 'unlimited',
    capacityValue: '',
    organizerType: 'student',
    clubName: '',
    policyAck: true,
    ...overrides,
  };
}

describe('validateEventForm', () => {
  it('returns no errors for a fully valid draft', () => {
    expect(validateEventForm(makeDraft(), now)).toEqual({});
  });

  it('requires a title', () => {
    expect(validateEventForm(makeDraft({ title: '' }), now)).toHaveProperty('title');
  });

  it('rejects a title over 60 characters', () => {
    expect(validateEventForm(makeDraft({ title: 'x'.repeat(61) }), now)).toHaveProperty('title');
  });

  it('requires end time after start time', () => {
    const errors = validateEventForm(makeDraft({ startTime: '15:00', endTime: '14:00' }), now);
    expect(errors.date).toMatch(/after start/);
  });

  it('rejects a start time more than an hour in the past', () => {
    const errors = validateEventForm(
      makeDraft({ date: new Date(2026, 10, 1), startTime: '06:00', endTime: '07:00' }),
      now,
    );
    expect(errors.date).toMatch(/past/);
  });

  it('requires a club name when posting as a club', () => {
    const errors = validateEventForm(makeDraft({ organizerType: 'club', clubName: '' }), now);
    expect(errors.clubName).toBeDefined();
  });

  it('requires capacity to be 2-500 when limited', () => {
    expect(
      validateEventForm(makeDraft({ capacityMode: 'limited', capacityValue: '1' }), now),
    ).toHaveProperty('capacity');
    expect(
      validateEventForm(makeDraft({ capacityMode: 'limited', capacityValue: '20' }), now),
    ).toEqual({});
  });

  it('requires the policy checkbox', () => {
    expect(validateEventForm(makeDraft({ policyAck: false }), now)).toHaveProperty('policy');
  });
});

describe('combineDateAndTime', () => {
  it('merges a date and HH:mm time into one Date', () => {
    const result = combineDateAndTime(new Date(2026, 10, 2), '14:30');
    expect(result?.getHours()).toBe(14);
    expect(result?.getMinutes()).toBe(30);
  });

  it('returns null for a malformed time string', () => {
    expect(combineDateAndTime(new Date(), 'not-a-time')).toBeNull();
  });
});
