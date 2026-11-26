import { useState } from 'react';
import './Avatar.css';

function initials(name: string | undefined): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

interface Props {
  name?: string;
  /** Photo URL; without one (or if it fails to load) the initials show on Cornell red. */
  url?: string | null;
  size?: number;
}

/** Round profile photo, or initials when there's no photo. */
export function Avatar({ name, url, size = 72 }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = url != null && url !== failedUrl;
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {showPhoto ? (
        <img className="avatar__img" src={url} alt="" onError={() => setFailedUrl(url)} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
