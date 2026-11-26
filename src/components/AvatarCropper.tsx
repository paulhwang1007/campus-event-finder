import { useEffect, useRef, useState } from 'react';
import { centeredView, clampView, cropFromView, coverScale, MAX_ZOOM, zoomTo, type View } from '../lib/crop';
import { photoSize, preparePhoto } from '../lib/image';
import { Sheet } from './Sheet';
import './AvatarCropper.css';

/** On-screen size of the square the photo is framed in (shown as a circle). */
const VIEWPORT = 260;
const KEY_PAN = 12;

interface Props {
  open: boolean;
  /** The full original photo to frame. */
  source: Blob | null;
  /** Framing to start from, e.g. what was chosen last time. */
  initialView?: View;
  onCancel: () => void;
  /** The cropped 400×400 photo, plus the framing (to reopen where the user left off). */
  onConfirm: (photo: Blob, view: View) => void;
}

/** Drag to choose what shows in the circle; pinch, scroll or use the slider to zoom. */
export function AvatarCropper({ open, source, initialView, onCancel, onConfirm }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const viewportRef = useRef<HTMLDivElement>(null);

  // Load the photo and its upright size whenever a new one comes in.
  useEffect(() => {
    if (!open || !source) return;
    const objectUrl = URL.createObjectURL(source);
    setUrl(objectUrl);
    setError(null);
    let cancelled = false;
    photoSize(source)
      .then((s) => {
        if (cancelled) return;
        setSize(s);
        setView(initialView ? clampView(initialView, s.width, s.height, VIEWPORT) : centeredView(s.width, s.height, VIEWPORT));
      })
      .catch(() => !cancelled && setError("Couldn't open that photo."));
    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
      setSize(null);
      setView(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source]);

  function update(next: (v: View, w: number, h: number) => View) {
    if (!size) return;
    setView((v) => (v ? next(v, size.width, size.height) : v));
  }

  function pointInViewport(clientX: number, clientY: number) {
    const rect = viewportRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: VIEWPORT / 2, y: VIEWPORT / 2 };
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId);
    if (others.length === 0) {
      // One finger or the mouse: pan.
      update((v, w, h) => clampView({ ...v, x: v.x + next.x - prev.x, y: v.y + next.y - prev.y }, w, h, VIEWPORT));
    } else {
      // Two fingers: pinch to zoom around their midpoint.
      const other = others[0][1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(next.x - other.x, next.y - other.y);
      if (before > 0) {
        const mid = pointInViewport((next.x + other.x) / 2, (next.y + other.y) / 2);
        update((v, w, h) => zoomTo(v, v.zoom * (after / before), w, h, VIEWPORT, mid.x, mid.y));
      }
    }
    pointers.current.set(e.pointerId, next);
  }

  function endPointer(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
  }

  async function confirm() {
    if (!source || !size || !view) return;
    setBusy(true);
    try {
      const photo = await preparePhoto(source, { square: true, crop: cropFromView(view, size.width, size.height, VIEWPORT) });
      onConfirm(photo, view);
    } catch {
      setError("Couldn't save that crop. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const scale = size && view ? coverScale(size.width, size.height, VIEWPORT) * view.zoom : 0;

  return (
    <Sheet open={open} title="Adjust photo" onClose={onCancel}>
      <p className="sheet-hint">Drag to choose what shows in the circle. Pinch or use the slider to zoom.</p>

      <div
        ref={viewportRef}
        className="avatar-cropper__viewport"
        style={{ width: VIEWPORT, height: VIEWPORT }}
        tabIndex={0}
        role="application"
        aria-label="Photo framing. Use arrow keys to move the photo, plus and minus to zoom."
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={(e) => {
          const p = pointInViewport(e.clientX, e.clientY);
          update((v, w, h) => zoomTo(v, v.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), w, h, VIEWPORT, p.x, p.y));
        }}
        onKeyDown={(e) => {
          const pan: Record<string, [number, number]> = {
            ArrowLeft: [KEY_PAN, 0],
            ArrowRight: [-KEY_PAN, 0],
            ArrowUp: [0, KEY_PAN],
            ArrowDown: [0, -KEY_PAN],
          };
          if (pan[e.key]) {
            e.preventDefault();
            const [dx, dy] = pan[e.key];
            update((v, w, h) => clampView({ ...v, x: v.x + dx, y: v.y + dy }, w, h, VIEWPORT));
          } else if (e.key === '+' || e.key === '=') {
            update((v, w, h) => zoomTo(v, v.zoom * 1.1, w, h, VIEWPORT));
          } else if (e.key === '-') {
            update((v, w, h) => zoomTo(v, v.zoom / 1.1, w, h, VIEWPORT));
          }
        }}
      >
        {url && size && view && (
          <img
            src={url}
            alt=""
            draggable={false}
            className="avatar-cropper__img"
            style={{ left: view.x, top: view.y, width: size.width * scale, height: size.height * scale }}
          />
        )}
        <span className="avatar-cropper__mask" aria-hidden="true" />
      </div>

      <label className="sheet-field avatar-cropper__zoom">
        Zoom
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={view?.zoom ?? 1}
          disabled={!view}
          onChange={(e) => update((v, w, h) => zoomTo(v, Number(e.target.value), w, h, VIEWPORT))}
        />
      </label>

      {error && (
        <p className="sheet-error" role="alert">
          {error}
        </p>
      )}

      <div className="sheet-actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn" disabled={!view || busy} onClick={() => void confirm()}>
          {busy ? 'Saving…' : 'Use photo'}
        </button>
      </div>
    </Sheet>
  );
}
