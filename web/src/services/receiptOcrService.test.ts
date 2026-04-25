import { describe, it, expect } from 'vitest';
import { parseReceiptText } from './receiptOcrService';

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
});
