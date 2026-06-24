import { compressReceiptImage } from './receiptOcrImage';
import {
  resetReceiptOcrPaddleService,
  runPaddleReceiptOcr,
  runTesseractReceiptOcr,
} from './receiptOcrProviders';

export type ReceiptOcrProvider = 'tesseract' | 'paddle';
export type ReceiptOcrMode = ReceiptOcrProvider | 'compare';

export interface ReceiptOcrEngineResult {
  provider: ReceiptOcrProvider;
  text: string;
  confidence?: number;
  elapsedMs: number;
}

export interface ReceiptOcrComparisonResult {
  selectedProvider: ReceiptOcrProvider;
  paddle?: ReceiptOcrResult;
  tesseract?: ReceiptOcrResult;
}

export interface ReceiptOcrResult {
  text: string;
  amount?: number;
  date?: string;
  merchant?: string;
  confidence?: number;
  provider?: ReceiptOcrProvider;
  elapsedMs?: number;
  fallbackReason?: string;
  comparison?: ReceiptOcrComparisonResult;
}

export interface ReceiptOcrRecognitionOptions {
  mode?: ReceiptOcrMode;
}

const RECEIPT_OCR_MODE_STORAGE_KEY = 'expense-manager.receipt-ocr-mode';
const DEFAULT_RECEIPT_OCR_MODE: ReceiptOcrMode = 'tesseract';
const VALID_RECEIPT_OCR_MODES: ReceiptOcrMode[] = ['tesseract', 'paddle', 'compare'];

const isReceiptOcrMode = (value: unknown): value is ReceiptOcrMode => {
  return typeof value === 'string' && VALID_RECEIPT_OCR_MODES.includes(value as ReceiptOcrMode);
};

export const getReceiptOcrMode = (): ReceiptOcrMode => {
  if (typeof window !== 'undefined') {
    const storedMode = window.localStorage.getItem(RECEIPT_OCR_MODE_STORAGE_KEY);
    if (isReceiptOcrMode(storedMode)) {
      return storedMode;
    }
  }

  const envMode = import.meta.env.VITE_RECEIPT_OCR_PROVIDER;
  if (isReceiptOcrMode(envMode)) {
    return envMode;
  }

  return DEFAULT_RECEIPT_OCR_MODE;
};

export const setReceiptOcrMode = (mode: ReceiptOcrMode): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(RECEIPT_OCR_MODE_STORAGE_KEY, mode);
};

export const getReceiptOcrProviderLabel = (provider: ReceiptOcrProvider): string => {
  return provider === 'paddle' ? 'PaddleOCR' : 'Tesseract';
};

export const getReceiptOcrModeLabel = (mode: ReceiptOcrMode): string => {
  switch (mode) {
    case 'paddle':
      return 'PaddleOCR';
    case 'compare':
      return 'Compare';
    default:
      return 'Tesseract';
  }
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

const parseEngineResult = (result: ReceiptOcrEngineResult, fallbackReason?: string): ReceiptOcrResult => {
  const parsed = parseReceiptText(result.text);
  return {
    ...parsed,
    confidence: result.confidence,
    provider: result.provider,
    elapsedMs: result.elapsedMs,
    fallbackReason,
  };
};

const scoreReceiptResult = (result: ReceiptOcrResult): number => {
  let score = 0;
  if (typeof result.amount === 'number' && Number.isFinite(result.amount)) score += 4;
  if (result.date) score += 3;
  if (result.merchant) score += 2;
  if (result.text.trim().length > 0) score += Math.min(result.text.trim().length / 80, 1);
  if (typeof result.confidence === 'number' && Number.isFinite(result.confidence)) {
    score += Math.min(result.confidence / 100, 1);
  }
  return score;
};

const shouldFallbackToTesseract = (result: ReceiptOcrResult): boolean => {
  const text = result.text.trim();
  if (!text) return true;
  if (typeof result.amount !== 'number') return true;
  if (result.date || result.merchant) return false;
  if (typeof result.confidence === 'number' && result.confidence < 50) return true;
  return text.length < 24;
};

const compareReceiptResults = (
  paddle: ReceiptOcrResult | null,
  tesseract: ReceiptOcrResult | null,
): { selected: ReceiptOcrResult; comparison: ReceiptOcrComparisonResult } => {
  if (!paddle && !tesseract) {
    throw new Error('Receipt OCR failed in both PaddleOCR and Tesseract');
  }

  if (paddle && !tesseract) {
    return {
      selected: paddle,
      comparison: { selectedProvider: 'paddle', paddle: paddle },
    };
  }

  if (!paddle && tesseract) {
    return {
      selected: tesseract,
      comparison: { selectedProvider: 'tesseract', tesseract: tesseract },
    };
  }

  const paddleScore = scoreReceiptResult(paddle as ReceiptOcrResult);
  const tesseractScore = scoreReceiptResult(tesseract as ReceiptOcrResult);
  const selected = paddleScore >= tesseractScore ? (paddle as ReceiptOcrResult) : (tesseract as ReceiptOcrResult);

  return {
    selected,
    comparison: {
      selectedProvider: selected.provider as ReceiptOcrProvider,
      paddle: paddle || undefined,
      tesseract: tesseract || undefined,
    },
  };
};

const recognizeWithTesseractFallback = async (
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<ReceiptOcrResult> => {
  try {
    const engineResult = await runPaddleReceiptOcr(image, onProgress);
    const parsed = parseEngineResult(engineResult);
    if (shouldFallbackToTesseract(parsed)) {
      const tesseractResult = await runTesseractReceiptOcr(image, onProgress);
      const parsedTesseract = parseEngineResult(tesseractResult, 'paddle_result_weak');
      return {
        ...parsedTesseract,
        fallbackReason: 'paddle_result_weak',
      };
    }

    return parsed;
  } catch (paddleError) {
    const tesseractResult = await runTesseractReceiptOcr(image, onProgress);
    return {
      ...parseEngineResult(tesseractResult, 'paddle_error'),
      fallbackReason: paddleError instanceof Error ? paddleError.message : 'paddle_error',
    };
  }
};

const recognizeWithCompare = async (
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<ReceiptOcrResult> => {
  let paddleParsed: ReceiptOcrResult | null = null;
  let tesseractParsed: ReceiptOcrResult | null = null;
  let paddleError: string | null = null;
  let tesseractError: string | null = null;

  try {
    const paddleEngineResult = await runPaddleReceiptOcr(image, (progress) => {
      if (onProgress) onProgress(Math.max(0, Math.min(1, progress * 0.5)));
    });
    paddleParsed = parseEngineResult(paddleEngineResult);
  } catch (error) {
    paddleError = error instanceof Error ? error.message : 'paddle_error';
  }

  try {
    const tesseractEngineResult = await runTesseractReceiptOcr(image, (progress) => {
      if (onProgress) onProgress(Math.max(0, Math.min(1, 0.5 + (progress * 0.5))));
    });
    tesseractParsed = parseEngineResult(tesseractEngineResult);
  } catch (error) {
    tesseractError = error instanceof Error ? error.message : 'tesseract_error';
  }

  if (!paddleParsed && !tesseractParsed) {
    throw new Error([
      paddleError ? `PaddleOCR: ${paddleError}` : 'PaddleOCR failed',
      tesseractError ? `Tesseract: ${tesseractError}` : 'Tesseract failed',
    ].join('; '));
  }

  const comparison = compareReceiptResults(paddleParsed, tesseractParsed);
  const fallbackReason = comparison.selected.provider === 'paddle'
    ? (tesseractParsed ? undefined : tesseractError || 'tesseract_error')
    : (paddleParsed ? undefined : paddleError || 'paddle_error');

  return {
    ...comparison.selected,
    fallbackReason,
    comparison: comparison.comparison,
  };
};

export const recognizeReceiptText = async (
  image: Blob,
  onProgress?: (progress: number) => void,
  options: ReceiptOcrRecognitionOptions = {},
): Promise<ReceiptOcrResult> => {
  const mode = options.mode || getReceiptOcrMode();

  if (mode === 'compare') {
    return await recognizeWithCompare(image, onProgress);
  }

  if (mode === 'paddle') {
    return await recognizeWithTesseractFallback(image, onProgress);
  }

  const tesseractEngineResult = await runTesseractReceiptOcr(image, onProgress);
  return parseEngineResult(tesseractEngineResult);
};

export const resetReceiptOcrServiceState = async (): Promise<void> => {
  await resetReceiptOcrPaddleService();
};

export { compressReceiptImage };
