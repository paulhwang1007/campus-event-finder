/**
 * Math for the square photo cropper. The photo sits behind a square viewport (shown as a circle);
 * the user pans and zooms it. "Offset" is where the photo's top-left corner is, relative to the
 * viewport's top-left, in screen pixels. The photo must always cover the whole viewport.
 */

export interface View {
  /** 1 = the photo just covers the viewport; higher zooms in. */
  zoom: number;
  x: number;
  y: number;
}

export interface SquareCrop {
  /** Top-left of the crop square and its side, in the photo's own pixels. */
  x: number;
  y: number;
  size: number;
}

export const MAX_ZOOM = 4;

/** Screen pixels per photo pixel at zoom 1: the shorter side fills the viewport. */
export function coverScale(imageW: number, imageH: number, viewport: number): number {
  return viewport / Math.min(imageW, imageH);
}

/** Keeps the photo covering the viewport: no empty gaps at any edge. */
export function clampView(view: View, imageW: number, imageH: number, viewport: number): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, view.zoom));
  const scale = coverScale(imageW, imageH, viewport) * zoom;
  const minX = viewport - imageW * scale;
  const minY = viewport - imageH * scale;
  return {
    zoom,
    x: Math.min(0, Math.max(minX, view.x)),
    y: Math.min(0, Math.max(minY, view.y)),
  };
}

/** The starting view: zoom 1, photo centered. */
export function centeredView(imageW: number, imageH: number, viewport: number): View {
  const scale = coverScale(imageW, imageH, viewport);
  return { zoom: 1, x: (viewport - imageW * scale) / 2, y: (viewport - imageH * scale) / 2 };
}

/** Changes zoom while keeping the point under (px, py) in the viewport fixed (the center by default). */
export function zoomTo(
  view: View,
  nextZoom: number,
  imageW: number,
  imageH: number,
  viewport: number,
  px = viewport / 2,
  py = viewport / 2,
): View {
  const base = coverScale(imageW, imageH, viewport);
  const zoom = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
  const before = base * view.zoom;
  const after = base * zoom;
  // The photo pixel under the focus point stays under it.
  const imgX = (px - view.x) / before;
  const imgY = (py - view.y) / before;
  return clampView({ zoom, x: px - imgX * after, y: py - imgY * after }, imageW, imageH, viewport);
}

/** What the viewport shows, as a square in the photo's own pixels. */
export function cropFromView(view: View, imageW: number, imageH: number, viewport: number): SquareCrop {
  const scale = coverScale(imageW, imageH, viewport) * view.zoom;
  // (0 - x) rather than -x, so an unpanned edge is 0, not -0.
  return { x: (0 - view.x) / scale, y: (0 - view.y) / scale, size: viewport / scale };
}
