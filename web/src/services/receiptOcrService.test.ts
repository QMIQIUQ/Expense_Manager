import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./receiptOcrProviders', () => ({
  resetReceiptOcrPaddleService: vi.fn(),
  runPaddleReceiptOcr: vi.fn(),
  runTesseractReceiptOcr: vi.fn(),
}));

import {
  parseReceiptText,
  recognizeReceiptText,
  type ReceiptOcrEngineResult,
} from './receiptOcrService';
import {
  runPaddleReceiptOcr,
  runTesseractReceiptOcr,
} from './receiptOcrProviders';

const mockedPaddle = vi.mocked(runPaddleReceiptOcr);
const mockedTesseract = vi.mocked(runTesseractReceiptOcr);
const sampleBlob = new Blob(['sample receipt image'], { type: 'image/png' });

describe('receiptOcrService parseReceiptText', () => {
  it('preserves line breaks when extracting merchant, amount, and date', () => {
    const result = parseReceiptText(`
STORE NAME
2026-04-25
TOTAL 12.34
Thank you
`);

    expect(result.text).toContain('STORE NAME');
    expect(result.text).toContain('TOTAL 12.34');
    expect(result.date).toBe('2026-04-25');
    expect(result.amount).toBe(12.34);
    expect(result.merchant).toBe('STORE NAME');
  });

  it('extracts integer totals from English receipts', () => {
    const result = parseReceiptText(`
COFFEE SHOP
Date: 04/25/2026
Subtotal 10.00
TOTAL NT$120
`);

    expect(result.date).toBe('2026-04-25');
    expect(result.amount).toBe(120);
    expect(result.currency).toBe('TWD');
    expect(result.merchant).toBe('COFFEE SHOP');
  });

  it('extracts Simplified Chinese receipt fields', () => {
    const result = parseReceiptText(`
便利店
日期：2026年4月25日
商品 15.00
合计：¥120
`);

    expect(result.date).toBe('2026-04-25');
    expect(result.amount).toBe(120);
    expect(result.currency).toBe('CNY');
    expect(result.merchant).toBe('便利店');
  });

  it('extracts Traditional Chinese receipt fields with ROC dates', () => {
    const result = parseReceiptText(`
咖啡館
日期 115/04/25
小計 80
總計 NT$120
`);

    expect(result.date).toBe('2026-04-25');
    expect(result.amount).toBe(120);
    expect(result.currency).toBe('TWD');
    expect(result.merchant).toBe('咖啡館');
  });

  it('does not treat ambiguous 2-digit years as ROC dates', () => {
    const result = parseReceiptText(`
STORE NAME
Date 26/04/25
TOTAL 12.34
`);

    expect(result.date).toBeUndefined();
    expect(result.amount).toBe(12.34);
  });

  it('normalizes full-width receipt digits before parsing', () => {
    const result = parseReceiptText(`
便利店
日期：２０２６年４月２５日
合計：＄１２０
`);

    expect(result.date).toBe('2026-04-25');
    expect(result.amount).toBe(120);
  });

  it('extracts Malay receipt fields with month names and RM currency', () => {
    const result = parseReceiptText(`
KEDAI RUNCIT
Tarikh: 25 Apr 2026
Jumlah: RM 123.45
Terima kasih
`);

    expect(result.date).toBe('2026-04-25');
    expect(result.amount).toBe(123.45);
    expect(result.currency).toBe('MYR');
    expect(result.merchant).toBe('KEDAI RUNCIT');
  });

  it('extracts Korean receipt fields with localized dates and currency', () => {
    const result = parseReceiptText(`
카페
2026년 4월 25일
총액 ₩12,300
`);

    expect(result.date).toBe('2026-04-25');
    expect(result.amount).toBe(12300);
    expect(result.currency).toBeUndefined();
    expect(result.merchant).toBe('카페');
  });

  it('extracts Thai receipt fields with baht currency', () => {
    const result = parseReceiptText(`
ร้านกาแฟ
วันที่ 25/04/2026
ยอดรวม ฿120.00
`);

    expect(result.date).toBe('2026-04-25');
    expect(result.amount).toBe(120);
    expect(result.currency).toBeUndefined();
    expect(result.merchant).toBe('ร้านกาแฟ');
  });

  it('extracts supported currency and receipt line items', () => {
    const result = parseReceiptText(`
BISTRO
Date: 04/25/2026
Latte S$4.50
Sandwich S$7.84
GST S$0.74
TOTAL SGD 12.34
`);

    expect(result.amount).toBe(12.34);
    expect(result.currency).toBe('SGD');
    expect(result.lineItems).toEqual([
      { description: 'Latte', amount: 4.5 },
      { description: 'Sandwich', amount: 7.84 },
    ]);
  });

  it('does not infer a currency from ambiguous dollar symbols', () => {
    const result = parseReceiptText(`
SHOP
TOTAL $12.34
`);

    expect(result.amount).toBe(12.34);
    expect(result.currency).toBeUndefined();
  });
});

describe('receiptOcrService recognizeReceiptText', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uses the paddle provider when requested', async () => {
    mockedPaddle.mockResolvedValueOnce({
      provider: 'paddle',
      text: `
COFFEE SHOP
2026-04-25
TOTAL 12.34
`,
      confidence: 96,
      elapsedMs: 150,
    } satisfies ReceiptOcrEngineResult);

    const result = await recognizeReceiptText(sampleBlob, undefined, { mode: 'paddle' });

    expect(result.provider).toBe('paddle');
    expect(result.amount).toBe(12.34);
    expect(result.date).toBe('2026-04-25');
    expect(result.merchant).toBe('COFFEE SHOP');
    expect(result.elapsedMs).toBe(150);
    expect(mockedPaddle).toHaveBeenCalledTimes(1);
    expect(mockedTesseract).not.toHaveBeenCalled();
  });

  it('falls back to tesseract when the paddle result is weak', async () => {
    mockedPaddle.mockResolvedValueOnce({
      provider: 'paddle',
      text: 'COFFEE SHOP',
      confidence: 18,
      elapsedMs: 110,
    } satisfies ReceiptOcrEngineResult);

    mockedTesseract.mockResolvedValueOnce({
      provider: 'tesseract',
      text: `
COFFEE SHOP
2026-04-25
TOTAL 12.34
`,
      confidence: 88,
      elapsedMs: 240,
    } satisfies ReceiptOcrEngineResult);

    const result = await recognizeReceiptText(sampleBlob, undefined, { mode: 'paddle' });

    expect(result.provider).toBe('tesseract');
    expect(result.fallbackReason).toBe('paddle_result_weak');
    expect(result.amount).toBe(12.34);
    expect(result.date).toBe('2026-04-25');
    expect(result.merchant).toBe('COFFEE SHOP');
    expect(mockedPaddle).toHaveBeenCalledTimes(1);
    expect(mockedTesseract).toHaveBeenCalledTimes(1);
  });

  it('falls back to tesseract when paddle throws', async () => {
    mockedPaddle.mockRejectedValueOnce(new Error('Paddle unavailable'));

    mockedTesseract.mockResolvedValueOnce({
      provider: 'tesseract',
      text: `
便利店
日期：2026年4月25日
合計：¥120
`,
      confidence: 90,
      elapsedMs: 210,
    } satisfies ReceiptOcrEngineResult);

    const result = await recognizeReceiptText(sampleBlob, undefined, { mode: 'paddle' });

    expect(result.provider).toBe('tesseract');
    expect(result.fallbackReason).toBe('Paddle unavailable');
    expect(result.amount).toBe(120);
    expect(result.date).toBe('2026-04-25');
    expect(mockedPaddle).toHaveBeenCalledTimes(1);
    expect(mockedTesseract).toHaveBeenCalledTimes(1);
  });

  it('compares both providers and selects the better result', async () => {
    mockedPaddle.mockResolvedValueOnce({
      provider: 'paddle',
      text: 'COFFEE SHOP',
      confidence: 52,
      elapsedMs: 140,
    } satisfies ReceiptOcrEngineResult);

    mockedTesseract.mockResolvedValueOnce({
      provider: 'tesseract',
      text: `
COFFEE SHOP
2026-04-25
TOTAL 12.34
`,
      confidence: 80,
      elapsedMs: 260,
    } satisfies ReceiptOcrEngineResult);

    const result = await recognizeReceiptText(sampleBlob, undefined, { mode: 'compare' });

    expect(result.provider).toBe('tesseract');
    expect(result.comparison?.selectedProvider).toBe('tesseract');
    expect(result.amount).toBe(12.34);
    expect(result.date).toBe('2026-04-25');
    expect(result.merchant).toBe('COFFEE SHOP');
    expect(mockedPaddle).toHaveBeenCalledTimes(1);
    expect(mockedTesseract).toHaveBeenCalledTimes(1);
  });

  it('uses tesseract mode without touching paddle', async () => {
    mockedTesseract.mockResolvedValueOnce({
      provider: 'tesseract',
      text: `
STORE NAME
2026-04-25
TOTAL 12.34
`,
      confidence: 83,
      elapsedMs: 190,
    } satisfies ReceiptOcrEngineResult);

    const result = await recognizeReceiptText(sampleBlob, undefined, { mode: 'tesseract' });

    expect(result.provider).toBe('tesseract');
    expect(result.amount).toBe(12.34);
    expect(mockedPaddle).not.toHaveBeenCalled();
    expect(mockedTesseract).toHaveBeenCalledTimes(1);
  });
});
