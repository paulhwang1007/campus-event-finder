import { useState } from 'react';
import { getCategory } from '../data/categories';
import type { CampusEvent } from '../types';
import './EventImage.css';

interface Props {
  event: Pick<CampusEvent, 'category' | 'photoUrl' | 'title'>;
  className?: string;
  iconSize?: number;
}

/** The event's photo, or the category placeholder when there's no photo or it fails to load. */
export function EventImage({ event, className, iconSize = 40 }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const category = getCategory(event.category);
  const CategoryIcon = category.icon;
  const showPhoto = event.photoUrl != null && failedUrl !== event.photoUrl;

  return (
    <div
      className={`event-image${className ? ` ${className}` : ''}`}
      style={showPhoto ? undefined : { background: category.gradient }}
    >
      {showPhoto ? (
        <img
          className="event-image__img"
          src={event.photoUrl}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(event.photoUrl ?? null)}
        />
      ) : (
        <CategoryIcon size={iconSize} className="event-image__icon" />
      )}
    </div>
  );
}
