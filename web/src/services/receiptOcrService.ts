export interface ReceiptOcrResult {
  text: string;
  amount?: number;
  date?: string;
  merchant?: string;
  confidence?: number;
}

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

const loadImageFromBlob = async (blob: Blob): Promise<HTMLImageElement> => {
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

const normalizeText = (value: string): string => value.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();

const extractAmount = (lines: string[]): number | undefined => {
  const amountPatterns = [
    /(?:total|amount|grand total|balance|payable|subtotal|net total)[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
    /(?:[$NTDHKD¥€£]|usd|twd|rmb|cny)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+\.\d{2})/i,
  ];

  for (const line of lines) {
    for (const pattern of amountPatterns) {
      const match = line.match(pattern);
      if (!match?.[1]) continue;
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (Number.isFinite(value) && value > 0) return value;
    }
  }

  return undefined;
};

const extractDate = (lines: string[]): string | undefined => {
  const patterns = [
    /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match) continue;

      if (pattern === patterns[0]) {
        const [, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }

      const [, first, second, year] = match;
      const firstNum = Number(first);
      const secondNum = Number(second);
      const month = firstNum > 12 ? secondNum : firstNum;
      const day = firstNum > 12 ? firstNum : secondNum;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return undefined;
};

const extractMerchant = (lines: string[]): string | undefined => {
  const excluded = /(?:receipt|invoice|total|subtotal|tax|change|balance|thank you|cash|card|date|time)/i;
  const candidates = lines.filter((line) => line && line.length >= 2 && line.length <= 60 && !excluded.test(line));
  return candidates[0];
};

export const parseReceiptText = (text: string): ReceiptOcrResult => {
  const lines = text
    .split(/\r?\n+/)
    .map((line) => normalizeText(line))
    .filter(Boolean);
  const normalized = lines.join('\n');

  return {
    text: normalized,
    amount: extractAmount(lines),
    date: extractDate(lines),
    merchant: extractMerchant(lines),
    confidence: undefined,
  };
};

export const recognizeReceiptText = async (
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<ReceiptOcrResult> => {
  const { recognize } = await import('tesseract.js');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read receipt image'));
    reader.readAsDataURL(image);
  });

  const result = await recognize(dataUrl, 'eng', {
    logger: (message: { status?: string; progress?: number }) => {
      if (typeof message.progress === 'number' && onProgress) {
        onProgress(Math.max(0, Math.min(1, message.progress)));
      }
    },
  });

  const text = result.data.text || '';
  const parsed = parseReceiptText(text);
  return {
    ...parsed,
    text: parsed.text,
    confidence: result.data.confidence,
  };
};
