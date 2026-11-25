const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
/** Larger originals are refused before decoding, to avoid freezing low-end phones. */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

/**
 * Shrinks a photo so its longest side is at most 1600px and re-encodes it as JPEG.
 * Phone photos are often 4–8 MB; this brings them to a few hundred KB before upload.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Pick an image file.');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('That photo is too large. Pick one under 15 MB.');

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Couldn't process that photo.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process that photo."))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}
