import { motion } from 'framer-motion';
import { useState } from 'react';
import { findPlace, searchMapsUrl } from '../data/places';
import type { LatLng } from '../types';
import { IconMapPin } from './Icon';
import './EventMap.css';

/** About 300m across at Cornell's latitude: enough to recognize the buildings around the pin. */
const SPAN_LNG = 0.004;
const SPAN_LAT = 0.0018;

interface Props {
  locationName: string;
  /** The exact pin the host chose. Without one, a known Cornell place name is used if it matches. */
  coords?: LatLng;
  /** Preview inside a form: no Directions button or "Open in Maps" link. */
  compact?: boolean;
}

function directionsUrl({ lat, lng }: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
}

/** Small map of the event's spot, or just an "Open in Maps" link when there's no pin. */
export function EventMap({ locationName, coords, compact }: Props) {
  const known = findPlace(locationName);
  const pin = coords ?? (known ? { lat: known.lat, lng: known.lng } : undefined);
  const [loaded, setLoaded] = useState(false);

  if (!pin) {
    if (compact) return null;
    return (
      <a className="event-map__link" href={searchMapsUrl(locationName)} target="_blank" rel="noreferrer">
        <IconMapPin size={14} /> Open in Maps
      </a>
    );
  }

  const bbox = [pin.lng - SPAN_LNG, pin.lat - SPAN_LAT, pin.lng + SPAN_LNG, pin.lat + SPAN_LAT].join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${pin.lat},${pin.lng}`;

  return (
    <div className={`event-map${compact ? ' event-map--compact' : ''}`}>
      <div className="event-map__frame">
        <motion.iframe
          key={src}
          title={`Map showing ${locationName}`}
          src={src}
          loading="lazy"
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          onLoad={() => setLoaded(true)}
        />
      </div>
      {!compact && (
        <a
          className="event-map__directions btn btn--secondary btn--sm"
          href={directionsUrl(pin)}
          target="_blank"
          rel="noreferrer"
        >
          <IconMapPin size={14} /> Directions
        </a>
      )}
    </div>
  );
}
