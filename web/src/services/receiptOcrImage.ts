const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_JPEG_QUALITY = 0.78;

const toBlobFromCanvas = (canvas: HTMLCanvasElement, mimeType = 'image/jpeg', quality = DEFAULT_JPEG_QUALITY): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to compress receipt image'));
        return;
      }
      resolve(blob);
    }, mimeType, quality);
  });
};

export const loadImageFromBlob = async (blob: Blob): Promise<HTMLImageElement> => {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load receipt image'));
    });
    image.src = url;
    return await loaded;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
};

export const blobToDataUrl = async (blob: Blob): Promise<string> => {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read receipt image'));
    reader.readAsDataURL(blob);
  });
};

export const blobToCanvas = async (blob: Blob): Promise<HTMLCanvasElement> => {
  if (typeof document === 'undefined') {
    throw new Error('Receipt OCR requires a browser environment');
  }

  const image = await loadImageFromBlob(blob);
  const ratio = Math.min(1, DEFAULT_MAX_WIDTH / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to prepare receipt OCR canvas');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if ('filter' in ctx) {
    ctx.filter = 'contrast(1.08)';
  }
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
};

export const compressReceiptImage = async (
  input: Blob,
  options: { maxWidth?: number; quality?: number } = {},
): Promise<Blob> => {
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const quality = options.quality ?? DEFAULT_JPEG_QUALITY;

  if (typeof document === 'undefined') {
    return input;
  }

  const image = await loadImageFromBlob(input);
  const ratio = Math.min(1, maxWidth / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return input;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if ('filter' in ctx) {
    ctx.filter = 'contrast(1.08)';
  }
  ctx.drawImage(image, 0, 0, width, height);
  return toBlobFromCanvas(canvas, 'image/jpeg', quality);
};

