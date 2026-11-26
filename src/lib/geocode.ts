import type { LatLng } from '../types';

/**
 * Address and place search using Photon (photon.komoot.io), a free OpenStreetMap geocoder that
 * allows search-as-you-type. Only the typed text or a pin's coordinates are sent.
 */
const PHOTON = 'https://photon.komoot.io';

/** Center of campus, used to rank nearby results first. */
export const CORNELL_CENTER: LatLng = { lat: 42.447, lng: -76.4832 };
/** Ithaca, Cornell and Collegetown: results outside this box are left out. minLng,minLat,maxLng,maxLat */
const ITHACA_BBOX = '-76.56,42.40,-76.42,42.49';

export interface GeocodeResult {
  /** Main line, e.g. "Statler Hall" or "120 Eddy Street". */
  label: string;
  /** Second line, e.g. "Cornell University, Ithaca". */
  detail: string;
  coords: LatLng;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    locality?: string;
    city?: string;
  };
}

/** Turns a Photon result into a short, readable label. Returns null if there's nothing to call it. */
export function formatFeature(feature: PhotonFeature): GeocodeResult | null {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const address = [p.housenumber, p.street].filter(Boolean).join(' ');
  const label = p.name || address;
  if (!label) return null;
  const area = p.locality || p.district || p.city;
  const detail = [p.name ? address : '', area].filter(Boolean).join(', ');
  return { label, detail, coords: { lat, lng } };
}

/** Same name at (almost) the same spot counts as a duplicate. */
function dedupe(results: GeocodeResult[]): GeocodeResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.label.toLowerCase()}|${r.coords.lat.toFixed(4)}|${r.coords.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '8',
    lang: 'en',
    lat: String(CORNELL_CENTER.lat),
    lon: String(CORNELL_CENTER.lng),
    bbox: ITHACA_BBOX,
  });
  const res = await fetch(`${PHOTON}/api/?${params}`, { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = (await res.json()) as { features: PhotonFeature[] };
  return dedupe(data.features.map(formatFeature).filter((r): r is GeocodeResult => r != null));
}

/** Suggests a name for a dropped pin, e.g. "Ho Plaza" or "120 Eddy Street". */
export async function reverseGeocode(coords: LatLng, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({ lat: String(coords.lat), lon: String(coords.lng), limit: '1', lang: 'en' });
  const res = await fetch(`${PHOTON}/reverse?${params}`, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as { features: PhotonFeature[] };
  const first = data.features[0];
  // Keep the exact pin the host dropped, not the matched building's center.
  return first ? { ...(formatFeature(first) ?? { label: '', detail: '' }), coords } : null;
}
