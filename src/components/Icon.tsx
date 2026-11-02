export interface IconProps {
  size?: number;
  className?: string;
}

const base = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconCalendar({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M3 8h14" />
      <path d="M7 2.5v3M13 2.5v3" />
    </svg>
  );
}

export function IconClock({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4l3 2" />
    </svg>
  );
}

export function IconMapPin({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M10 17.5s6-5.1 6-9.8A6 6 0 0 0 4 7.7c0 4.7 6 9.8 6 9.8Z" />
      <circle cx="10" cy="7.7" r="2.1" />
    </svg>
  );
}

export function IconCompass({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M12.8 7.2 11 11l-3.8 1.8L9 9Z" />
    </svg>
  );
}

export function IconPlus({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

export function IconBookmark({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M5 3.5h10a.5.5 0 0 1 .5.5v12.5l-5.5-3.3L4.5 16.5V4a.5.5 0 0 1 .5-.5Z" />
    </svg>
  );
}

export function IconUser({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <circle cx="10" cy="6.8" r="3.3" />
      <path d="M3.5 17c.9-3.4 3.6-5.3 6.5-5.3s5.6 1.9 6.5 5.3" />
    </svg>
  );
}

export function IconSparkle({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M10 2.5 11.4 7.6 16.5 9 11.4 10.4 10 15.5 8.6 10.4 3.5 9 8.6 7.6Z" />
    </svg>
  );
}

export function IconAccessibility({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <circle cx="10" cy="4" r="1.6" fill="currentColor" stroke="none" />
      <path d="M4.5 7h11M10 7v4l4.5 4M10 11l-4 4" />
      <path d="M8 9.5a4.2 4.2 0 1 0 6.8 3.3" />
    </svg>
  );
}

export function IconMegaphone({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M3 8.5v3a1 1 0 0 0 1 1h1.3L11 16v-11L5.3 7.5H4a1 1 0 0 0-1 1Z" />
      <path d="M11 5v10a3.5 3.5 0 0 0 3.5-3.5V8.5A3.5 3.5 0 0 0 11 5Z" />
      <path d="M5.5 12.5 6.7 16" />
    </svg>
  );
}

export function IconCheck({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M4 10.5 8 14.5 16 5.5" />
    </svg>
  );
}

export function IconX({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  );
}

export function IconArrowLeft({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M16 10H4M8.5 5 4 10l4.5 5" />
    </svg>
  );
}

export function IconChevronLeft({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" />
    </svg>
  );
}

export function IconChevronRight({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  );
}

export function IconBasketball({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 2.5v15M2.5 10h15M4.3 4.3c2 2 2 9.4 0 11.4M15.7 4.3c-2 2-2 9.4 0 11.4" />
    </svg>
  );
}

export function IconPalette({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M10 2.5a7.5 7.5 0 1 0 0 15c1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8h2c1.9 0 3.4-1.5 3.4-3.4C17.9 4.8 14.4 2.5 10 2.5Z" />
      <circle cx="6.3" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="5.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.2" cy="5.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconUtensils({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M5 2.5v6.5a1.5 1.5 0 0 0 3 0V2.5M6.5 9v8.5" />
      <path d="M14.5 2.5c-1.4 0-2.5 1.8-2.5 4s.8 3.6 2 4v7" />
    </svg>
  );
}

export function IconMountain({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M2.5 16 8 6l3 5 1.5-2 5 7Z" />
      <circle cx="14.5" cy="5.5" r="1.3" />
    </svg>
  );
}

export function IconGamepad({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M5.5 6.5h9a3.5 3.5 0 0 1 3.4 4.3l-.6 2.5a2 2 0 0 1-3.5.8L12.5 12h-5l-1.3 2.1a2 2 0 0 1-3.5-.8l-.6-2.5a3.5 3.5 0 0 1 3.4-4.3Z" />
      <path d="M6.5 8.5v3M5 10h3" />
      <circle cx="14" cy="9" r=".6" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10.5" r=".6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconBook({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M10 5.3c-1-1-2.8-1.8-6-1.8v11c3.2 0 5 .8 6 1.8 1-1 2.8-1.8 6-1.8v-11c-3.2 0-5 .8-6 1.8Z" />
      <path d="M10 5.3v11" />
    </svg>
  );
}

export function IconCamera({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M3 7a1 1 0 0 1 1-1h2l1.2-1.8h5.6L14 6h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <circle cx="10" cy="11" r="3" />
    </svg>
  );
}
