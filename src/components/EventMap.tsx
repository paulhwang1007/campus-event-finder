import { motion } from 'framer-motion';
import { useState } from 'react';
import { directionsUrl, findPlace, searchMapsUrl } from '../data/places';
import { IconMapPin } from './Icon';
import './EventMap.css';

/** About 300m across at Cornell's latitude: enough to recognize the buildings around the pin. */
const SPAN_LNG = 0.004;
const SPAN_LAT = 0.0018;

/** Small map for a known Cornell place, or just an "Open in Maps" link for anything else. */
export function EventMap({ locationName }: { locationName: string }) {
  const place = findPlace(locationName);
  const [loaded, setLoaded] = useState(false);

  if (!place) {
    return (
      <a className="event-map__link" href={searchMapsUrl(locationName)} target="_blank" rel="noreferrer">
        <IconMapPin size={14} /> Open in Maps
      </a>
    );
  }

  const bbox = [place.lng - SPAN_LNG, place.lat - SPAN_LAT, place.lng + SPAN_LNG, place.lat + SPAN_LAT].join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${place.lat},${place.lng}`;

  return (
    <div className="event-map">
      <div className="event-map__frame">
        <motion.iframe
          title={`Map showing ${place.name}`}
          src={src}
          loading="lazy"
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          onLoad={() => setLoaded(true)}
        />
      </div>
      <a className="event-map__directions btn btn--secondary btn--sm" href={directionsUrl(place)} target="_blank" rel="noreferrer">
        <IconMapPin size={14} /> Directions
      </a>
    </div>
  );
}
