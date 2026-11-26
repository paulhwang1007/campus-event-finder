import { describe, expect, it } from 'vitest';
import { formatFeature } from './geocode';

const at = (properties: object) => ({ geometry: { coordinates: [-76.48, 42.44] as [number, number] }, properties });

describe('formatFeature', () => {
  it('uses the place name, with its address and area underneath', () => {
    expect(formatFeature(at({ name: 'Statler Hall', housenumber: '7', street: 'East Avenue', city: 'Ithaca' }))).toEqual({
      label: 'Statler Hall',
      detail: '7 East Avenue, Ithaca',
      coords: { lat: 42.44, lng: -76.48 },
    });
  });

  it('falls back to the street address when there is no name', () => {
    expect(formatFeature(at({ housenumber: '120', street: 'Eddy Street', locality: 'Collegetown', city: 'Ithaca' }))).toEqual({
      label: '120 Eddy Street',
      detail: 'Collegetown',
      coords: { lat: 42.44, lng: -76.48 },
    });
  });

  it('skips results with nothing to call them', () => {
    expect(formatFeature(at({ city: 'Ithaca' }))).toBeNull();
  });
});
