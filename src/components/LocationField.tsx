import { lazy, Suspense, useState } from 'react';
import type { LocationValue } from './LocationPicker';
import { EventMap } from './EventMap';
import { IconChevronRight, IconMapPin } from './Icon';
import './LocationField.css';

// The map library only loads when someone opens the picker.
const LocationPicker = lazy(() => import('./LocationPicker'));

interface Props {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}

/** Shows the chosen location (with a small map if it has a pin) and opens the picker. */
export function LocationField({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const hasName = value.name.trim() !== '';

  return (
    <>
      <button type="button" className="location-field" onClick={() => setOpen(true)}>
        <IconMapPin />
        <span className={`location-field__text${hasName ? '' : ' location-field__text--empty'}`}>
          {hasName ? value.name : 'Search or pick on a map'}
        </span>
        <IconChevronRight size={16} />
      </button>
      {hasName && value.coords && <EventMap locationName={value.name} coords={value.coords} compact />}

      {open && (
        <Suspense fallback={null}>
          <LocationPicker
            open={open}
            value={value}
            onClose={() => setOpen(false)}
            onConfirm={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
