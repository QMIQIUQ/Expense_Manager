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
});
