import { compressReceiptImage, prepareReceiptImageForOcr } from './receiptOcrImage';
import {
  resetReceiptOcrPaddleService,
  runPaddleReceiptOcr,
  runTesseractReceiptOcr,
} from './receiptOcrProviders';
import type { CurrencyCode } from '../types';

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

export interface ReceiptOcrLineItem {
  description: string;
  amount: number;
}

export interface ReceiptOcrResult {
  text: string;
  amount?: number;
  currency?: CurrencyCode;
  baseAmount?: number;
  baseCurrency?: CurrencyCode;
  exchangeRate?: number;
  date?: string;
  merchant?: string;
  paymentMethod?: 'cash' | 'credit_card' | 'e_wallet' | 'bank';
  paymentMethodName?: string;
  lineItems?: ReceiptOcrLineItem[];
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
const DEFAULT_RECEIPT_OCR_MODE: ReceiptOcrMode = 'paddle';

export const getReceiptOcrMode = (): ReceiptOcrMode => {
  if (typeof window !== 'undefined') {
    const storedMode = window.localStorage.getItem(RECEIPT_OCR_MODE_STORAGE_KEY);
    if (storedMode && storedMode !== DEFAULT_RECEIPT_OCR_MODE) {
      window.localStorage.setItem(RECEIPT_OCR_MODE_STORAGE_KEY, DEFAULT_RECEIPT_OCR_MODE);
    }
    if (storedMode === DEFAULT_RECEIPT_OCR_MODE) {
      return storedMode;
    }
  }

  const envMode = import.meta.env.VITE_RECEIPT_OCR_PROVIDER;
  if (envMode === DEFAULT_RECEIPT_OCR_MODE) {
    return envMode;
  }

  return DEFAULT_RECEIPT_OCR_MODE;
};

export const setReceiptOcrMode = (mode: ReceiptOcrMode): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    RECEIPT_OCR_MODE_STORAGE_KEY,
    mode === DEFAULT_RECEIPT_OCR_MODE ? mode : DEFAULT_RECEIPT_OCR_MODE,
  );
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
    if (char === '＄') return '$';
    if (char === '％') return '%';
    if (char === '（') return '(';
    if (char === '）') return ')';
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
  } else if (lastDot > -1 && lastComma === -1 && /^\d{1,3}(?:\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '');
  } else if (lastComma > -1 && lastDot === -1) {
    const commaDecimal = cleaned.match(/^\d+,\d{1,2}$/);
    normalized = commaDecimal ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  } else {
    normalized = cleaned.replace(/,/g, '');
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

const currencyPattern = String.raw`(?:[$¥€£₩₫₹₱฿]|NT\$?|HK\$?|S\$|A\$|C\$|US\$|MYR|RM|SGD|RMB|CNY|USD|TWD|JPY|KRW|THB|VND|IDR|PHP|AUD|CAD|Rp|元|บาท)`;
const moneyNumberPattern = String.raw`(?:\d{1,3}(?:[,.]\d{3})+(?:[,.]\d{1,2})?|\d+(?:[,.]\d{1,2})?)`;
const amountValuePattern = new RegExp(`${currencyPattern}?\\s*(${moneyNumberPattern})`, 'gi');
const primaryAmountLabelPattern = /(?:\b(?:grand\s*total|net\s*total|invoice\s*total|final\s*(?:total|amount)|total\s*(?:due|paid|payable)?|amount\s*(?:due|paid)?|payable|payment|paid|sum|importe|montant|betrag|summe|valor\s*total|valor|jumlah(?:\s*(?:besar|keseluruhan|bayar|perlu\s*dibayar))?|total\s*(?:bayar|belanja)?|amaun|bayaran|harga|tong\s*cong|tổng\s*cộng|thanh\s*toán|thanh\s*toan|so\s*tien|số\s*tiền|phai\s*tra|phải\s*trả)\b|合\s*计|合\s*計|总\s*计|總\s*計|金\s*额|金\s*額|应\s*付|應\s*付|实\s*付|實\s*付|总\s*额|總\s*額|付款|收款|合計金額|總計|总计|本次\s*加值|票值|外幣金額|外币金额|繳納金額|缴纳金额|銷售額|销售额|総計|総額|お会計|ご請求額|お支払い|支払|税込合計|領収金額|합계|총액|총합계|결제\s*금액|결제금액|금액|지불|결제|청구금액|ยอด\s*รวม|รวม\s*ทั้ง\s*สิ้น|จำนวน\s*เงิน|ยอด\s*ชำระ|ชำระ|รวม|المجموع|الإجمالي)/i;
const secondaryAmountLabelPattern = /(?:\b(?:subtotal|sub\s*total|before\s*tax|pre\s*tax|taxable\s*amount|jumlah\s*kecil|subjumlah|subtotal\s*barang)\b|小\s*计|小\s*計|消费|消費|小計|소계|小計金額|ยอด\s*ก่อน\s*ภาษี)/i;
const labeledAmountPattern = new RegExp(`${primaryAmountLabelPattern.source}|${secondaryAmountLabelPattern.source}`, 'i');
const currencyOrDecimalPattern = new RegExp(`${currencyPattern}|\\d+[,.]\\d{1,2}`, 'i');
const ignoredAmountLinePattern = /(?:\b(?:change|balance|cash|cashier|card\s*no|card\s*number|payment\s*method|payment\s*received|received|tender|rounding|discount|service\s*charge|svr\s*charge|sst|gst|vat|tax(?:able)?|exchange\s*rate|points?)\b|找零|現金|现金|餘額|余额|加值前|加值後|缴费方法|繳費方法|費別|费别|稅|税|折扣|四捨五入|四舍五入|付款方式|卡片金額|匯率|汇率)/i;
const strongestAmountLabelPattern = /(?:\b(?:final\s*amount|final\s*total|net\s*total|grand\s*total|total\s*\([^)]*\)|total\s*(?:due|paid|payable)?|invoice\s*total)\b|本次\s*加值|票值|外幣金額|外币金额|繳納金額|缴纳金额|合\s*计|合\s*計|總\s*計|总\s*计|總計|总计|合計金額)/i;

interface ReceiptAmountCandidate {
  amount: number;
  currency?: CurrencyCode;
  line: string;
  lineIndex: number;
  valueIndex: number;
  matchIndex: number;
}

const detectCurrencyFromLine = (line: string): CurrencyCode | undefined => {
  if (/\b(?:MYR|RM)\b/i.test(line) || /RM\s*\d/i.test(line)) return 'MYR';
  if (/\bUSD\b|US\$/i.test(line)) return 'USD';
  if (/\bTWD\b|NT\$|新臺幣|新台幣/i.test(line)) return 'TWD';
  if (/\bSGD\b|S\$/i.test(line)) return 'SGD';
  if (/\b(?:CNY|RMB)\b/i.test(line)) return 'CNY';
  if (/\bEUR\b|€/i.test(line)) return 'EUR';
  if (/\bGBP\b|£/i.test(line)) return 'GBP';
  if (/\bJPY\b|円/i.test(line)) return 'JPY';

  if (/¥/.test(line)) {
    if (/(?:人民币|人民幣|付款|合计|合計|总计|總計|实付|實付|应付|應付|元)/.test(line)) return 'CNY';
    if (/(?:税込|税抜|お会計|ご請求額|支払|領収|レシート|円)/.test(line) || /[\u3040-\u30ff]/.test(line)) return 'JPY';
  }

  return undefined;
};

const hasTaiwanCurrencySignal = (lines: string[]): boolean => {
  const combined = lines.join('\n');
  return /(?:台灣|臺灣|高雄|桃園|捷運|悠遊卡|一卡通|高鐵|台新銀行|發票|收據|銷售額|銷貨|民國|票值|新臺幣|新台幣|統一編號|企業|現金|服務費)/.test(combined);
};

const hasMalaysiaCurrencySignal = (lines: string[]): boolean => {
  const combined = lines.join('\n');
  return /(?:\bMYR\b|\bRM\b|MALAYSIA|JOHOR|SDN\s+BHD|RESTORAN|TOUCH\s*'?N?\s*GO|TOUCHNGO|MAYBANK\s*QR|DUITNOW|E-WALLET|SERVICE\s*CHARGE|SST)/i.test(combined);
};

const extractCurrency = (lines: string[], preferredLine?: string): CurrencyCode | undefined => {
  const preferredCurrency = preferredLine ? detectCurrencyFromLine(preferredLine) : undefined;
  if (preferredCurrency) return preferredCurrency;

  const counts = new Map<CurrencyCode, number>();
  for (const line of lines) {
    const currency = detectCurrencyFromLine(line);
    if (!currency) continue;
    counts.set(currency, (counts.get(currency) || 0) + 1);
  }

  const counted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (counted) return counted;

  if (hasTaiwanCurrencySignal(lines) && lines.some((line) => /(?:\$\s*\d|\d+\s*元|票值|金額|金额|合計|總計|总计)/.test(line))) {
    return 'TWD';
  }

  if (hasMalaysiaCurrencySignal(lines) && lines.some((line) => /\d+[,.]\d{2}/.test(line))) {
    return 'MYR';
  }

  return undefined;
};

const extractAmountCandidatesFromLine = (line: string, lineIndex: number): ReceiptAmountCandidate[] => {
  const values: ReceiptAmountCandidate[] = [];
  const lineCurrency = detectCurrencyFromLine(line);
  for (const [matchIndex, match] of Array.from(line.matchAll(amountValuePattern)).entries()) {
    const value = parseMoney(match[1]);
    if (value === undefined || value >= 100000000) continue;
    values.push({
      amount: value,
      currency: detectCurrencyFromLine(match[0]) || lineCurrency,
      line,
      lineIndex,
      valueIndex: values.length,
      matchIndex,
    });
  }
  return values;
};

const scoreAmountLine = (line: string): number => {
  if (ignoredAmountLinePattern.test(line)) return -1;
  if (strongestAmountLabelPattern.test(line)) return 120;
  if (primaryAmountLabelPattern.test(line)) return 100;
  if (secondaryAmountLabelPattern.test(line)) return 40;
  if (currencyOrDecimalPattern.test(line)) return 10;
  return -1;
};

const extractAmountCandidate = (lines: string[]): ReceiptAmountCandidate | undefined => {
  const scored = lines.flatMap((line, lineIndex) => {
    const score = scoreAmountLine(line);
    if (score < 0) return [];
    const candidates = extractAmountCandidatesFromLine(line, lineIndex);
    if (candidates.length === 0) return [];
    return candidates.map((candidate, index) => ({
      candidate,
      score,
      index,
    }));
  });

  if (scored.length === 0) return undefined;

  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.candidate.lineIndex !== a.candidate.lineIndex) return b.candidate.lineIndex - a.candidate.lineIndex;
    if (b.index !== a.index) return b.index - a.index;
    return b.candidate.amount - a.candidate.amount;
  })[0].candidate;
};

const monthNameToNumber = (value: string): number | undefined => {
  const key = value.toLowerCase().replace(/\./g, '');
  const monthMap: Record<string, number> = {
    jan: 1,
    january: 1,
    januari: 1,
    feb: 2,
    february: 2,
    februari: 2,
    mar: 3,
    march: 3,
    mac: 3,
    maret: 3,
    apr: 4,
    april: 4,
    may: 5,
    mei: 5,
    jun: 6,
    june: 6,
    juni: 6,
    jul: 7,
    july: 7,
    juli: 7,
    aug: 8,
    august: 8,
    ogos: 8,
    agustus: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    okt: 10,
    oktober: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
    dis: 12,
    des: 12,
    desember: 12,
  };
  return monthMap[key];
};

const extractMonthNameDate = (line: string): string | undefined => {
  const monthNamePattern = '(jan(?:uary|uari)?|feb(?:ruary|ruari)?|mar(?:ch|et)?|mac|apr(?:il)?|may|mei|jun(?:e|i)?|jul(?:y|i)?|aug(?:ust)?|ogos|agustus|sep(?:t|tember)?|oct(?:ober)?|okt(?:ober)?|nov(?:ember)?|dec(?:ember)?|dis|des(?:ember)?)';
  const dayMonthYear = new RegExp(`\\b(\\d{1,2})[\\s/-]+${monthNamePattern}\\.?[,]?[\\s/-]+(\\d{4})\\b`, 'i');
  const monthDayYear = new RegExp(`\\b${monthNamePattern}\\.?\\s+(\\d{1,2})[,]?\\s+(\\d{4})\\b`, 'i');

  const dayMonthMatch = line.match(dayMonthYear);
  if (dayMonthMatch) {
    const [, day, monthName, year] = dayMonthMatch;
    const month = monthNameToNumber(monthName);
    return month ? formatDateParts(Number(year), month, Number(day)) : undefined;
  }

  const monthDayMatch = line.match(monthDayYear);
  if (monthDayMatch) {
    const [, monthName, day, year] = monthDayMatch;
    const month = monthNameToNumber(monthName);
    return month ? formatDateParts(Number(year), month, Number(day)) : undefined;
  }

  return undefined;
};

const extractDate = (lines: string[]): string | undefined => {
  const patterns = [
    /(\d{4})\s*[-/.年년]\s*(\d{1,2})\s*[-/.月월]\s*(\d{1,2})\s*(?:日|일)?/,
    /(\d{4})(\d{2})(\d{2})/,
    /(?:民國|民国)?\s*(\d{3})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/,
    /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/,
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/,
  ];

  for (const line of lines) {
    const namedDate = extractMonthNameDate(line);
    if (namedDate) return namedDate;

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match) continue;

      if (pattern === patterns[0]) {
        const [, year, month, day] = match;
        return formatDateParts(Number(year), Number(month), Number(day));
      }

      if (pattern === patterns[1]) {
        const [, year, month, day] = match;
        return formatDateParts(Number(year), Number(month), Number(day));
      }

      if (pattern === patterns[2]) {
        const [, rocYear, month, day] = match;
        const year = Number(rocYear) + 1911;
        const parsed = formatDateParts(year, Number(month), Number(day));
        if (parsed) return parsed;
        continue;
      }

      const [, first, second, year] = match;
      const firstNum = Number(first);
      const secondNum = Number(second);
      const dayFirstContext = /(?:date|close|printed|tran|tarikh|取餐時間|下單時間|交易時間)/i.test(line);
      const month = firstNum > 12 ? secondNum : secondNum > 12 ? firstNum : dayFirstContext ? secondNum : firstNum;
      const day = firstNum > 12 ? firstNum : secondNum > 12 ? secondNum : dayFirstContext ? firstNum : secondNum;
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

const cleanMerchantLine = (line: string): string => line
  .replace(/^(?:merchant|store|shop|商家|店名|商店|公司|票卡公司)\s*[:：]\s*/i, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const extractMerchant = (lines: string[]): string | undefined => {
  const excluded = /(?:receipt|invoice|tax|vat|sst|gst|discount|change|balance|thank you|cash|card|visa|mastercard|date|time|resit|invois|faktur|struk|nota|pajak|ppn|terima\s*kasih|proof\s*of\s*travel|purchase\s*proof|收据|收據|发票|發票|銷貨明細|销售明细|加值收據|購票證明|单程票|單程票|找零|现金|現金|日期|时间|時間|領収書|レシート|請求書|税|釣銭|現金|カード|日付|時間|영수증|세금|거스름돈|현금|카드|날짜|시간|ใบเสร็จ|ภาษี|เงินทอน|เงินสด|บัตร|วันที่|เวลา)/i;
  const explicitMerchantLine = lines.find((line) => /^(?:商家|merchant)\s*[:：]?\s*|^(?:store|shop)\s*[:：]\s*/i.test(line));
  if (explicitMerchantLine) {
    const cleaned = explicitMerchantLine
      .replace(/^(?:商家|merchant)\s*[:：]?\s*|^(?:store|shop)\s*[:：]\s*/i, '')
      .trim();
    if (cleaned && cleaned.length >= 2 && cleaned.length <= 80 && !excluded.test(cleaned)) {
      return cleaned;
    }
  }

  const candidates = lines.map(cleanMerchantLine).filter((line) => {
    if (!line || line.length < 2 || line.length > 80) return false;
    if (excluded.test(line)) return false;
    if (extractDate([line])) return false;
    if (labeledAmountPattern.test(line)) return false;
    if (extractAmountCandidatesFromLine(line, 0).length > 0 && !/(?:sdn|bhd|corp|company|公司|企業|商店|restoran|restaurant|cafe|tea|noodles?|捷運|高鐵|法院)/i.test(line)) return false;
    return true;
  });
  return candidates[0];
};

const lineItemExclusionPattern = /(?:\b(?:total|subtotal|sub\s*total|tax|sst|gst|vat|service\s*charge|svr\s*charge|discount|change|balance|cash|card|visa|mastercard|amex|payment|paid|payable|tender|rounding|receipt|invoice|date|time|tel|phone|qty|quantity|item|price|amount|order|table|cashier|thank\s*you|terima\s*kasih|touchngo|duitnow|maybank\s*qr|mae)\b|合\s*计|合\s*計|总\s*计|總\s*計|小\s*计|小\s*計|税|稅|找零|现金|現金|日期|时间|時間|收据|收據|发票|發票|本次加值|加值前|加值後|卡片金額|総計|総額|小計|税|現金|カード|日付|時間|합계|총액|소계|세금|현금|카드|날짜|시간|ยอด\s*รวม|ภาษี|เงินทอน|เงินสด|บัตร|วันที่|เวลา)/i;
const terminalAmountPattern = /\d+(?:[,.]\d{1,2})?\s*(?:TX|[-\s]?[ZTI])?\s*$/i;

const cleanLineItemDescription = (value: string): string => value
  .replace(new RegExp(currencyPattern, 'gi'), ' ')
  .replace(/\b\d+\s*(?:x|×|\*)\s*/gi, '')
  .replace(/\s{2,}/g, ' ')
  .replace(/^[\s:;.,#\-*]+|[\s:;.,#\-*]+$/g, '')
  .trim();

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const extractLineItems = (lines: string[]): ReceiptOcrLineItem[] | undefined => {
  const items: ReceiptOcrLineItem[] = [];

  for (const [lineIndex, line] of lines.entries()) {
    if (!currencyOrDecimalPattern.test(line) && !terminalAmountPattern.test(line)) continue;
    if (lineItemExclusionPattern.test(line)) continue;
    if (extractDate([line])) continue;

    const candidates = extractAmountCandidatesFromLine(line, lineIndex);
    if (candidates.length === 0) continue;

    const lastCandidate = candidates[candidates.length - 1];
    const match = Array.from(line.matchAll(amountValuePattern))[lastCandidate.matchIndex];
    if (!match || typeof match.index !== 'number') continue;

    const description = cleanLineItemDescription(line.slice(0, match.index));
    if (description.length < 2) continue;
    if (/^[\d\sx×*./#-]+$/i.test(description)) continue;

    items.push({
      description,
      amount: roundMoney(lastCandidate.amount),
    });
  }

  return items.length > 0 ? items : undefined;
};

const extractExchangeRate = (lines: string[]): number | undefined => {
  for (const line of lines) {
    const match = line.match(/\b1\s*MYR\s*=\s*(\d+(?:[,.]\d+)?)\s*TWD\b/i);
    if (!match) continue;
    return parseMoney(match[1]);
  }
  return undefined;
};

const extractBaseAmount = (lines: string[], sourceCurrency?: CurrencyCode): { amount: number; currency: CurrencyCode } | undefined => {
  if (!sourceCurrency || sourceCurrency === 'MYR') return undefined;

  for (const [lineIndex, line] of lines.entries()) {
    if (/[=]|exchange\s*rate|匯率|汇率/i.test(line)) continue;
    if (detectCurrencyFromLine(line) !== 'MYR') continue;
    const candidates = extractAmountCandidatesFromLine(line, lineIndex);
    const value = candidates.find((candidate) => candidate.currency === 'MYR') || candidates[0];
    if (value?.amount) {
      return { amount: roundMoney(value.amount), currency: 'MYR' };
    }
  }

  return undefined;
};

const extractPaymentMetadata = (lines: string[]): Pick<ReceiptOcrResult, 'paymentMethod' | 'paymentMethodName'> => {
  const text = lines.join('\n');

  const cardMatch = text.match(/\b(visa|master\s*card|mastercard|bank\s*card)\b|信用卡|銀行卡|银行卡/i);
  if (cardMatch) {
    const brand = (cardMatch[1] || cardMatch[0]).replace(/\s+/g, ' ');
    return {
      paymentMethod: 'credit_card',
      paymentMethodName: brand.toLowerCase() === 'bank card' ? 'Bank Card' : brand.replace(/\b\w/g, (char) => char.toUpperCase()),
    };
  }

  const eWalletPatterns: Array<[RegExp, string]> = [
    [/\btouch\s*'?n\s*go\b|\btouchngo\b/i, "Touch 'n Go"],
    [/\bmaybank\s*qr\b/i, 'MAYBANK QR'],
    [/\bduitnow\b/i, 'DuitNow'],
    [/\bmae\b/i, 'MAE'],
    [/\bline\s*pay\b/i, 'LINE PAY'],
    [/\be-?wallet\b|電子錢包|电子钱包/i, 'E-Wallet'],
    [/\bmobile\s*pay\b/i, 'Mobile Pay'],
  ];
  const eWalletMatch = eWalletPatterns.find(([pattern]) => pattern.test(text));
  if (eWalletMatch) {
    return {
      paymentMethod: 'e_wallet',
      paymentMethodName: eWalletMatch[1],
    };
  }

  if (/\bcash\b|現金|现金/i.test(text)) {
    return { paymentMethod: 'cash' };
  }

  return {};
};

export const parseReceiptText = (text: string): ReceiptOcrResult => {
  const lines = text
    .split(/\r?\n+/)
    .map((line) => normalizeText(line))
    .filter(Boolean);
  const normalized = lines.join('\n');
  const amountCandidate = extractAmountCandidate(lines);
  const lineItems = extractLineItems(lines);
  const lineItemsTotal = lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const amount = amountCandidate?.amount || (lineItemsTotal > 0 ? roundMoney(lineItemsTotal) : undefined);
  const currency = extractCurrency(lines, amountCandidate?.line);
  const base = extractBaseAmount(lines, currency);
  const paymentMetadata = extractPaymentMetadata(lines);

  return {
    text: normalized,
    amount,
    currency,
    baseAmount: base?.amount,
    baseCurrency: base?.currency,
    exchangeRate: extractExchangeRate(lines),
    date: extractDate(lines),
    merchant: extractMerchant(lines),
    ...paymentMetadata,
    lineItems,
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
  if (result.currency) score += 1;
  if (result.lineItems?.length) score += 1;
  if (result.text.trim().length > 0) score += Math.min(result.text.trim().length / 80, 1);
  if (typeof result.confidence === 'number' && Number.isFinite(result.confidence)) {
    score += Math.min(result.confidence / 100, 1);
  }
  return score;
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

const recognizeWithPaddle = async (
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<ReceiptOcrResult> => {
  const engineResult = await runPaddleReceiptOcr(image, onProgress);
  return parseEngineResult(engineResult);
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
    return await recognizeWithPaddle(image, onProgress);
  }

  const tesseractEngineResult = await runTesseractReceiptOcr(image, onProgress);
  return parseEngineResult(tesseractEngineResult);
};

export const resetReceiptOcrServiceState = async (): Promise<void> => {
  await resetReceiptOcrPaddleService();
};

export { compressReceiptImage, prepareReceiptImageForOcr };
