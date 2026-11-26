import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { PLACES } from '../data/places';
import { CORNELL_CENTER, reverseGeocode, searchPlaces, type GeocodeResult } from '../lib/geocode';
import type { LatLng } from '../types';
import { IconMapPin, IconX } from './Icon';
import { Sheet } from './Sheet';
import './LocationPicker.css';

export interface LocationValue {
  name: string;
  coords?: LatLng;
}

interface Props {
  open: boolean;
  value: LocationValue;
  onClose: () => void;
  onConfirm: (value: LocationValue) => void;
}

const SEARCH_DELAY_MS = 350;
const MIN_QUERY = 3;

/** Red pin drawn in CSS, so no marker image files are needed. */
const pinIcon = L.divIcon({
  className: 'location-picker__pin',
  html: '<span class="location-picker__pin-dot"></span>',
  iconSize: [28, 36],
  iconAnchor: [14, 34],
});

function cornellMatches(query: string): GeocodeResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PLACES.filter((p) => [p.name, ...(p.aliases ?? [])].some((n) => n.toLowerCase().includes(q))).map((p) => ({
    label: p.name,
    detail: 'Cornell',
    coords: { lat: p.lat, lng: p.lng },
  }));
}

/** Search an address or place, or tap/drag on the map, then name the spot. */
export default function LocationPicker({ open, value, onClose, onConfirm }: Props) {
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [pin, setPin] = useState<LatLng | undefined>(value.coords);
  const [name, setName] = useState(value.name);
  /** Once the host types their own name, moving the pin stops replacing it. */
  const [nameEdited, setNameEdited] = useState(false);
  const [flyTo, setFlyTo] = useState<LatLng | undefined>(value.coords);
  const reverseAbort = useRef<AbortController | null>(null);

  // Start fresh from the current value each time the picker opens.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setRemote([]);
    setPin(value.coords);
    setName(value.name);
    setNameEdited(false);
    setFlyTo(value.coords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Address search, once typing pauses. A newer search cancels the previous one.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setRemote([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    setSearchError(false);
    const timer = window.setTimeout(() => {
      searchPlaces(q, controller.signal)
        .then(setRemote)
        .catch((err: unknown) => {
          if ((err as Error).name !== 'AbortError') setSearchError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, SEARCH_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const results = useMemo(() => {
    const local = cornellMatches(query);
    const localNames = new Set(local.map((r) => r.label.toLowerCase()));
    return [...local, ...remote.filter((r) => !localNames.has(r.label.toLowerCase()))].slice(0, 8);
  }, [query, remote]);

  function choose(result: GeocodeResult) {
    setPin(result.coords);
    setFlyTo(result.coords);
    setName(result.label);
    setNameEdited(false);
    setQuery('');
  }

  /** Pin placed by tapping or dragging: suggest a name for that spot unless the host wrote one. */
  function placePin(coords: LatLng) {
    setPin(coords);
    if (nameEdited) return;
    reverseAbort.current?.abort();
    const controller = new AbortController();
    reverseAbort.current = controller;
    reverseGeocode(coords, controller.signal)
      .then((found) => {
        if (found?.label && !controller.signal.aborted) setName(found.label);
      })
      .catch(() => {});
  }

  const showResults = query.trim().length > 0;
  const trimmedName = name.trim();

  return (
    <Sheet open={open} title="Choose location" onClose={onClose}>
      <div className="location-picker__search">
        <input
          type="search"
          className="sheet-input"
          placeholder="Search a building, place or address"
          aria-label="Search a building, place or address"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {showResults && (
          <ul className="location-picker__results" role="listbox" aria-label="Search results">
            {results.map((r) => (
              <li key={`${r.label}-${r.coords.lat}-${r.coords.lng}`}>
                <button type="button" role="option" aria-selected={false} className="location-picker__result" onClick={() => choose(r)}>
                  <IconMapPin size={16} />
                  <span>
                    <span className="location-picker__result-label">{r.label}</span>
                    {r.detail && <span className="location-picker__result-detail">{r.detail}</span>}
                  </span>
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="location-picker__status">
                {query.trim().length < MIN_QUERY
                  ? 'Keep typing…'
                  : searching
                    ? 'Searching…'
                    : searchError
                      ? "Couldn't search right now. Tap the map to drop a pin instead."
                      : 'No matches nearby. Tap the map to drop a pin instead.'}
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="location-picker__map">
        <MapContainer
          center={[(value.coords ?? CORNELL_CENTER).lat, (value.coords ?? CORNELL_CENTER).lng]}
          zoom={value.coords ? 17 : 16}
          scrollWheelZoom
          attributionControl
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
          <MapBehaviour flyTo={flyTo} onTap={placePin} />
          {pin && (
            <Marker
              position={[pin.lat, pin.lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = (e.target as L.Marker).getLatLng();
                  placePin({ lat, lng });
                },
              }}
            />
          )}
        </MapContainer>
        <p className="location-picker__map-hint">{pin ? 'Drag the pin or tap to move it' : 'Tap the map to drop a pin'}</p>
      </div>

      <label className="sheet-field">
        Location name
        <input
          className="sheet-input"
          value={name}
          maxLength={120}
          placeholder="e.g. Mann Library, 2nd floor"
          onChange={(e) => {
            setName(e.target.value);
            setNameEdited(true);
          }}
        />
        <span className="sheet-hint">This is what people see. Add details like a floor or room.</span>
      </label>

      {pin && (
        <button type="button" className="location-picker__remove" onClick={() => setPin(undefined)}>
          <IconX size={12} /> Remove pin (no map on the event)
        </button>
      )}

      <div className="sheet-actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn"
          disabled={!trimmedName}
          onClick={() => onConfirm({ name: trimmedName, coords: pin })}
        >
          Use this location
        </button>
      </div>
    </Sheet>
  );
}

/** Taps on the map drop the pin; choosing a search result pans there. */
function MapBehaviour({ flyTo, onTap }: { flyTo?: LatLng; onTap: (coords: LatLng) => void }) {
  const map = useMap();
  useMapEvents({ click: (e) => onTap({ lat: e.latlng.lat, lng: e.latlng.lng }) });

  // The sheet slides in, so Leaflet measures its size once it has settled.
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 350);
    return () => window.clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (flyTo) map.flyTo([flyTo.lat, flyTo.lng], Math.max(map.getZoom(), 17), { duration: 0.6 });
  }, [flyTo, map]);

  return null;
}
