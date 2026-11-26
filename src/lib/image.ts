const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
/** Larger originals are refused before decoding, to avoid freezing low-end phones. */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

/** Profile photos are cropped to a centered square this size. */
const AVATAR_SIZE = 400;

/**
 * Shrinks a photo so its longest side is at most 1600px and re-encodes it as JPEG.
 * Phone photos are often 4–8 MB; this brings them to a few hundred KB before upload.
 * With `square`, it's cropped to a centered 400×400 square instead (for profile photos).
 */
export async function preparePhoto(file: File, options?: { square?: boolean }): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Pick an image file.');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('That photo is too large. Pick one under 15 MB.');

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  // Source area to draw: the whole photo, or its centered square for avatars.
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = options?.square ? (bitmap.width - side) / 2 : 0;
  const sy = options?.square ? (bitmap.height - side) / 2 : 0;
  const sw = options?.square ? side : bitmap.width;
  const sh = options?.square ? side : bitmap.height;
  const scale = Math.min(1, (options?.square ? AVATAR_SIZE : MAX_DIMENSION) / Math.max(sw, sh));
  const width = Math.round(sw * scale);
  const height = Math.round(sh * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Couldn't process that photo.");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process that photo."))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}
