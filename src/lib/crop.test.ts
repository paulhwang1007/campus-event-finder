import { describe, expect, it } from 'vitest';
import { centeredView, clampView, cropFromView, zoomTo } from './crop';

// A 1200×800 landscape photo in a 200px viewport: zoom 1 shows the middle 800×800.
const W = 1200;
const H = 800;
const V = 200;

describe('photo cropper math', () => {
  it('starts centered, showing the middle square of the photo', () => {
    const view = centeredView(W, H, V);
    expect(cropFromView(view, W, H, V)).toEqual({ x: 200, y: 0, size: 800 });
  });

  it("won't pan past the photo's edges", () => {
    const view = clampView({ zoom: 1, x: 50, y: -40 }, W, H, V);
    expect(view).toEqual({ zoom: 1, x: 0, y: 0 });
    expect(clampView({ zoom: 1, x: -999, y: 0 }, W, H, V).x).toBe(-100); // right edge
  });

  it('zooms in around the center, showing a smaller part of the photo', () => {
    const view = zoomTo(centeredView(W, H, V), 2, W, H, V);
    expect(cropFromView(view, W, H, V)).toEqual({ x: 400, y: 200, size: 400 });
  });

  it('keeps zoom between 1x and 4x', () => {
    expect(zoomTo(centeredView(W, H, V), 0.5, W, H, V).zoom).toBe(1);
    expect(zoomTo(centeredView(W, H, V), 9, W, H, V).zoom).toBe(4);
  });

  it('crops exactly what was panned to', () => {
    const panned = clampView({ zoom: 1, x: 0, y: 0 }, W, H, V); // dragged fully right: left edge of photo
    expect(cropFromView(panned, W, H, V)).toEqual({ x: 0, y: 0, size: 800 });
  });
});
