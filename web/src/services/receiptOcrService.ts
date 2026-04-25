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

const normalizeText = (value: string): string => value
  .split('')
  .map((char) => {
    const code = char.charCodeAt(0);
    if (code >= 0xff10 && code <= 0xff19) return String.fromCharCode(code - 0xff10 + 0x30);
    if (char === '，') return ',';
    if (char === '．' || char === '。') return '.';
    if (char === '：') return ':';
    if (char === '／') return '/';
    if (char === '－' || char === '—' || char === '–') return '-';
    if (code < 32) return ' ';
    return char;
  })
  .join('')
  .replace(/\s+/g, ' ')
  .trim();

const parseMoney = (raw: string): number | undefined => {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return undefined;

  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma > lastDot && /^\d{1,3}(?:\.\d{3})*,\d{1,2}$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastComma > -1 && lastDot === -1) {
    const commaDecimal = cleaned.match(/^\d+,\d{1,2}$/);
    normalized = commaDecimal ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  } else {
    normalized = cleaned.replace(/,/g, '');
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

const amountValuePattern = /(?:[$¥€£]|NT\$?|HK\$?|RMB|CNY|USD|TWD)?\s*(\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{1,2})?|\d+(?:[,.]\d{1,2})?)/gi;
const primaryAmountLabelPattern = /(?:\b(?:grand\s*total|net\s*total|total|amount|balance|payable)\b|合\s*计|合\s*計|总\s*计|總\s*計|金\s*额|金\s*額|应\s*付|應\s*付|实\s*付|實\s*付|总\s*额|總\s*額|付款|收款)/i;
const secondaryAmountLabelPattern = /(?:\bsubtotal\b|小\s*计|小\s*計|消费|消費)/i;
const labeledAmountPattern = new RegExp(`${primaryAmountLabelPattern.source}|${secondaryAmountLabelPattern.source}`, 'i');

const extractAmountsFromLine = (line: string): number[] => {
  const values: number[] = [];
  for (const match of line.matchAll(amountValuePattern)) {
    const value = parseMoney(match[1]);
    if (value !== undefined && value < 100000000) {
      values.push(value);
    }
  }
  return values;
};

const extractAmount = (lines: string[]): number | undefined => {
  for (const labelPattern of [primaryAmountLabelPattern, secondaryAmountLabelPattern]) {
    for (const line of lines) {
      if (!labelPattern.test(line)) continue;
      const values = extractAmountsFromLine(line);
      if (values.length > 0) {
        return values[values.length - 1];
      }
    }
  }

  const decimalOrCurrencyValues = lines
    .filter((line) => /[$¥€£]|NT\$?|HK\$?|RMB|CNY|USD|TWD|\d+[,.]\d{1,2}/i.test(line))
    .flatMap(extractAmountsFromLine);

  return decimalOrCurrencyValues.length > 0 ? Math.max(...decimalOrCurrencyValues) : undefined;
};

const extractDate = (lines: string[]): string | undefined => {
  const patterns = [
    /(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/,
    /(\d{3})[-/](\d{1,2})[-/](\d{1,2})/,
    /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match) continue;

      if (pattern === patterns[0]) {
        const [, year, month, day] = match;
        return formatDateParts(Number(year), Number(month), Number(day));
      }

      if (pattern === patterns[1]) {
        const [, rocYear, month, day] = match;
        const year = Number(rocYear) + 1911;
        const parsed = formatDateParts(year, Number(month), Number(day));
        if (parsed) return parsed;
        continue;
      }

      const [, first, second, year] = match;
      const firstNum = Number(first);
      const secondNum = Number(second);
      const month = firstNum > 12 ? secondNum : firstNum;
      const day = firstNum > 12 ? firstNum : secondNum;
      const parsed = formatDateParts(Number(year), month, day);
      if (parsed) return parsed;
    }
  }

  return undefined;
};

const formatDateParts = (year: number, month: number, day: number): string | undefined => {
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const extractMerchant = (lines: string[]): string | undefined => {
  const excluded = /(?:receipt|invoice|total|subtotal|tax|change|balance|thank you|cash|card|date|time|收据|收據|发票|發票|合\s*计|合\s*計|总\s*计|總\s*計|金\s*额|金\s*額|找零|现金|現金|日期|时间|時間)/i;
  const candidates = lines.filter((line) => {
    if (!line || line.length < 2 || line.length > 60) return false;
    if (excluded.test(line)) return false;
    if (extractDate([line])) return false;
    if (labeledAmountPattern.test(line)) return false;
    return true;
  });
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

  const result = await recognize(dataUrl, 'eng+chi_sim+chi_tra', {
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
