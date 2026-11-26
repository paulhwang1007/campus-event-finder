/**
 * Common Cornell event spots with approximate coordinates, used to show a map on Event Details
 * and to suggest locations in the Create/Edit form. Locations stay free text: anything not
 * listed here still works, it just gets an "Open in Maps" link instead of a map.
 */
export interface Place {
  name: string;
  /** Other ways people write it. Matching is case-insensitive. */
  aliases?: string[];
  lat: number;
  lng: number;
}

export const PLACES: Place[] = [
  { name: 'Mann Library', lat: 42.4487, lng: -76.4763 },
  { name: 'Duffield Atrium', aliases: ['Duffield Hall', 'Duffield'], lat: 42.4446, lng: -76.4826 },
  { name: 'Noyes', aliases: ['Noyes Community Center', 'Noyes Rec Center'], lat: 42.4462, lng: -76.488 },
  { name: 'Willard Straight', aliases: ['Willard Straight Hall', 'WSH', 'The Straight'], lat: 42.4465, lng: -76.4856 },
  { name: 'Appel Commons', aliases: ['Appel'], lat: 42.4536, lng: -76.4775 },
  { name: 'Arts Quad', lat: 42.449, lng: -76.484 },
  { name: 'Beebe Lake', lat: 42.451, lng: -76.477 },
  { name: 'Libe Slope', lat: 42.4475, lng: -76.486 },
  { name: 'Helen Newman', aliases: ['Helen Newman Hall'], lat: 42.4529, lng: -76.4777 },
  { name: 'Teagle', aliases: ['Teagle Hall'], lat: 42.446, lng: -76.479 },
  { name: 'Collegetown', lat: 42.441, lng: -76.485 },
  { name: 'Fall Creek Gorge Trail', aliases: ['Fall Creek Gorge', 'Fall Creek'], lat: 42.4525, lng: -76.4825 },
  { name: 'Statler Hall', aliases: ['Statler'], lat: 42.4459, lng: -76.4818 },
  { name: 'Schoellkopf Field', aliases: ['Schoellkopf'], lat: 42.4442, lng: -76.4775 },
  { name: 'Olin Library', aliases: ['Olin'], lat: 42.4478, lng: -76.4844 },
  { name: 'Klarman Hall', aliases: ['Klarman'], lat: 42.4493, lng: -76.4831 },
  { name: 'Uris Hall', lat: 42.4471, lng: -76.4819 },
  { name: 'Gates Hall', aliases: ['Gates'], lat: 42.445, lng: -76.481 },
];

function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

const INDEX = PLACES.flatMap((place) =>
  [place.name, ...(place.aliases ?? [])].map((alias) => ({ place, key: normalize(alias) })),
)
  // Longest names first, so "Fall Creek Gorge Trail" wins over "Fall Creek".
  .sort((a, b) => b.key.length - a.key.length);

/**
 * Finds the known place a free-text location refers to, e.g. "Mann Library, 2nd floor" or
 * "the Arts Quad". Only the part before a comma, dash or parenthesis is considered, so a
 * note like "meet by Olin" after a comma doesn't move the pin.
 */
export function findPlace(locationName: string): Place | null {
  const main = locationName.split(/[,(]| - | — | – /)[0];
  const text = normalize(main);
  if (text.trim() === '') return null;
  return INDEX.find(({ key }) => text.includes(key))?.place ?? null;
}

export function searchMapsUrl(locationName: string): string {
  const query = `${locationName}, Cornell University, Ithaca NY`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
