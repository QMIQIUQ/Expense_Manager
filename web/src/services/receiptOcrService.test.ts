import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./receiptOcrProviders', () => ({
  resetReceiptOcrPaddleService: vi.fn(),
  runPaddleReceiptOcr: vi.fn(),
  runTesseractReceiptOcr: vi.fn(),
}));

import {
  getReceiptOcrMode,
  parseReceiptText,
  recognizeReceiptText,
  setReceiptOcrMode,
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

  it.each([
    {
      sample: '001',
      text: '富利達飲(股)公司 高雄後昌門市部\n2026/06/24 18:17\n青花(堡)B餐 $123TX\n無糖綠茶(中) $38TX\n合計 $493\nCASH $500\n找零 $7',
      amount: 493,
      currency: 'TWD',
      date: '2026-06-24',
      lineItems: 2,
    },
    {
      sample: '002',
      text: '靖成企業 J1\n日期 2026/6/22 下午 03:12:21\n1 速傳.30天 1 1000\n小計 1000\n服務費 0\n總計 1,000\n現金 1,000',
      amount: 1000,
      currency: 'TWD',
      date: '2026-06-22',
      lineItems: 1,
    },
    {
      sample: '003',
      text: '桃園捷運公司\nProof of travel\n交易時間 2026/06/22 15:36:12\n票值 35 元',
      amount: 35,
      currency: 'TWD',
      date: '2026-06-22',
    },
    {
      sample: '004',
      text: '台新銀行 台灣高鐵\n交易類別: 購票交易\n日期:20260622\n金額: NT $1290\n信用卡',
      amount: 1290,
      currency: 'TWD',
      date: '2026-06-22',
      paymentMethod: 'credit_card',
    },
    {
      sample: '005',
      text: '台灣高鐵\n2026/06/22\n桃園 -> 左營\nNT$1290 信用卡',
      amount: 1290,
      currency: 'TWD',
      date: '2026-06-22',
    },
    {
      sample: '006',
      text: '-RM169.34\n商家 Taiwan High Speed Rail CoTaoyuan\n外币金额 TWD 1290.00\n汇率 1 MYR = 7.61795 TWD\n日期/时间 22/06/2026 16:08:23\n交易类型 Visa Card',
      amount: 1290,
      currency: 'TWD',
      date: '2026-06-22',
      baseAmount: 169.34,
      baseCurrency: 'MYR',
      exchangeRate: 7.61795,
      paymentMethod: 'credit_card',
    },
    {
      sample: '007',
      text: '高雄捷運 加值收據\n車站名稱 R17 世運\n加值時間 2026/06/24 19:00:54\n加值前卡片金額 207元\n本次加值 500元\n加值後卡片金額 707元',
      amount: 500,
      currency: 'TWD',
      date: '2026-06-24',
    },
    {
      sample: '008',
      text: '高雄捷運 加值收據\n車站名稱 R17 世運\n加值時間 2026/06/24 19:00:02\n加值前卡片金額 60元\n本次加值 400元\n加值後卡片金額 460元',
      amount: 400,
      currency: 'TWD',
      date: '2026-06-24',
    },
    {
      sample: '009',
      text: 'RESTORAN HABIB SDN BHD\nDATE :18/Jun/2026 23:51:00\n1 Extra Joss Anggur 3.80-Z\n2 Teh O Limau Ais 5.00-Z\nTOTAL : RM 93.40\nSST 6% : RM 5.43\nROUNDING : RM -0.03\nNET TOTAL : RM 98.80\nCASH : RM 98.85',
      amount: 98.8,
      currency: 'MYR',
      date: '2026-06-18',
      lineItems: 2,
      paymentMethod: 'cash',
    },
    {
      sample: '010',
      text: '臺灣橋頭地方法院收款證明\n繳納金額 新臺幣 10 元整\n繳納日期 115.6.11',
      amount: 10,
      currency: 'TWD',
      date: '2026-06-11',
    },
    {
      sample: '011',
      text: '臺灣橋頭地方法院\n115年06月11日\n金額 NT$750.00\n繳費方法 現金',
      amount: 750,
      currency: 'TWD',
      date: '2026-06-11',
      paymentMethod: 'cash',
    },
    {
      sample: '012',
      text: 'THE TOAST\nDate 16/06/2026\n1 HONG KONG FRIED NOODLE 13.50\n1 FRIED NASI KAMPUNG 14.50\nSubTotal 77.50\nNet Total 77.50\nE-Wallet 77.50',
      amount: 77.5,
      currency: 'MYR',
      date: '2026-06-16',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '013',
      text: 'PANDAN NOODLES SDN BHD\nDATE: 12/06/2026\n101 WANTAN NOODLE NORMAL 9.90\n115 CURRY MEE 11.90\nSUB-TOTAL 93.30\nSVR CHARGE 9.33\nTOTAL 102.60\nTOUCHNGO 102.60',
      amount: 102.6,
      currency: 'MYR',
      date: '2026-06-12',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '014',
      text: 'CAM Tea & Ember Cafe\n81100 Johor Bahru, Johor\n2026-06-23 12:22:58\n8 滑蛋Beef益盖饭 54.40\n小计 54.40\nTax 0.00\n总计 54.40\nMAE 54.40',
      amount: 54.4,
      currency: 'MYR',
      date: '2026-06-23',
      lineItems: 1,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '015',
      text: 'Koi Thé\nPrinted : 2026-06-23 13:07:28\n1X M-Milk Tea 13.60 I\n1X M-Yuzu Honey Oolong T 15.30 I\nSST 6% 53.02 3.18\nTotal: 56.20\nDuitNow: 56.20',
      amount: 56.2,
      currency: 'MYR',
      date: '2026-06-23',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '016',
      text: 'XC MEE HUN KUIH SDN BHD\nDate: 18/06/2026 12:19\nF1 Traditional Dry Mee Hun Kuih 12.90\nMD01 KOPI 4.50\nSubtotal 70.00\nSERVICE CHARGE (6%) 4.20\nTotal (MYR) 74.20\nMAYBANK QR 74.20',
      amount: 74.2,
      currency: 'MYR',
      date: '2026-06-18',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '017',
      text: 'XC MEE HUN KUIH SDN BHD\nDate: 27/05/2026 12:21\nF1 Traditional Dry Mee Hun Kuih 12.90\nD9 Mineral Water 1.00\nSubtotal 84.20\nSERVICE CHARGE (6%) 4.99\nBill rounding 0.01\nTotal (MYR) 89.20\nMAYBANK QR 89.20',
      amount: 89.2,
      currency: 'MYR',
      date: '2026-05-27',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '018',
      text: 'THE TOAST\nDate 03/06/2026 12:52\nHONG KONG FRIED NOODLE 13.50\nTOMYAM FRIED SOH HOON 14.50\nSubTotal 87.40\nNet Total 87.40\nE-Wallet 87.40',
      amount: 87.4,
      currency: 'MYR',
      date: '2026-06-03',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '019',
      text: 'BGC NOODLE (JOHOR JAYA)\nDate 09/06/2026 12:16\nBuild ur own bowl 15.50\nSignature Pork Noodle 13.50\nSubtotal 104.40\nSERVICE CHARGE (10%) 10.44\nBill rounding -0.04\nTotal (MYR) 114.80\nTOUCH N GO 114.80',
      amount: 114.8,
      currency: 'MYR',
      date: '2026-06-09',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '020',
      text: 'Receipt No #76335\nClose at 04/06/2026 12:42 PM\nTOMYAM DRY YM (YOUMEE) 9.90\nDRY PM (PANMEE) 9.90\nSubtotal 82.80\nService Charge(6%) 4.96\nFinal Amount(MYR) 87.70\nPayment method E-Wallet',
      amount: 87.7,
      currency: 'MYR',
      date: '2026-06-04',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '021',
      text: 'Receipt No #73478\nClose at 30/04/2026 12:49 PM\nMALA DRY PM (PANMEE) 10.90\nCINCAO ICE 3.00\nSubTotal 115.00\nService Charge(6%) 6.90\nFinal Amount(MYR) 121.90\nPayment method E-Wallet',
      amount: 121.9,
      currency: 'MYR',
      date: '2026-04-30',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '022',
      text: 'RESTORAN SING TING\nDate: 21/05/2026\n面粉粿(汤) 12.00\n古早味卤肉饭 16.90\nSubTotal 106.90\nGrand SubTotal MYR106.90\nTOTAL MYR106.90\nCASH MYR106.90',
      amount: 106.9,
      currency: 'MYR',
      date: '2026-05-21',
      lineItems: 2,
      paymentMethod: 'cash',
    },
    {
      sample: '023',
      text: 'RESTORAN OSMAN JB SDN BHD\nDATE :15/May/2026 22:27:55\nLEMON ICE T 3.00-T\nMaggi Goreng Telur M 8.50-T\nTOTAL : RM 105.80\nSERV. TAX 6% : RM 6.35\nNET TOTAL : RM 112.15\nCASH : RM 112.15',
      amount: 112.15,
      currency: 'MYR',
      date: '2026-05-15',
      lineItems: 2,
      paymentMethod: 'cash',
    },
    {
      sample: '024',
      text: '取餐時間 2026/05/04 15:19\n士林站林家蔥抓餅加蛋 NT$110\n蜜芋頭豆花 NT$65\n小計 NT$520\n總計 NT$520\nLINE PAY (已付款)',
      amount: 520,
      currency: 'TWD',
      date: '2026-05-04',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '025',
      text: 'Receipt No #73478\nClose at 30/04/2026 12:49 PM\nMALA DRY PM (PANMEE) 10.90\nDRY CURRY CHICKEN YM 14.90\nSubTotal 115.00\nService Charge(6%) 6.90\nFinal Amount(MYR) 121.90\nPayment method E-Wallet',
      amount: 121.9,
      currency: 'MYR',
      date: '2026-04-30',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '026',
      text: 'Yit Foh Noodles House\nPrinted On: 2026.04.17 12:40:28\nCHAR SIU FRIED WANTAN 9.50\nDUMPLING NOODLES 23.00\nTotal Sales (Exc. Tax) RM 83.40\nTOTAL RM 83.40',
      amount: 83.4,
      currency: 'MYR',
      date: '2026-04-17',
      lineItems: 2,
    },
    {
      sample: '027',
      text: 'RESTORAN HABIB SDN BHD\nDATE :14/Apr/2026 12:47:35\nMaggi Goreng 7.00-T\nNasi Lemak Ayam 10.00-T\nTOTAL : RM 85.36\nSERV. TAX 6% : RM 5.12\nROUNDING : RM 0.02\nNET TOTAL : RM 90.50\nMOBILE PAY',
      amount: 90.5,
      currency: 'MYR',
      date: '2026-04-14',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
    {
      sample: '028',
      text: 'RESTORAN HABIB SDN BHD\nDATE :31/Mar/2026 12:46:14\nLimau Ais 2.40-T\nNasi Lemak Ayam 10.00-T\nTOTAL : RM 64.71\nSERV. TAX 6% : RM 3.88\nNET TOTAL : RM 68.60\nCASH RM 70.00',
      amount: 68.6,
      currency: 'MYR',
      date: '2026-03-31',
      lineItems: 2,
      paymentMethod: 'cash',
    },
    {
      sample: '029',
      text: 'RESTORAN HABIB SDN BHD\nDATE :13/Mar/2026 22:17:00\nMaggi Sup 5.50-Z\nRoti Canai 1.51-Z\nTOTAL : RM 101.02\nSST 6% : RM 6.06\nNET TOTAL : RM 107.10\nCASH RM 107.10',
      amount: 107.1,
      currency: 'MYR',
      date: '2026-03-13',
      lineItems: 2,
      paymentMethod: 'cash',
    },
    {
      sample: '030',
      text: '十口天 - 辣椒板面\nClose at: 06/03/2026 12:38 PM\nCHILLI PM (PANMEE) 21.80\nCINCAO ICE 1.50\nSubTotal 65.00\nService Charge(6%) 3.90\nFinal Amount(MYR) 68.90\nPayment method E-Wallet',
      amount: 68.9,
      currency: 'MYR',
      date: '2026-03-06',
      lineItems: 2,
      paymentMethod: 'e_wallet',
    },
  ])('parses receipt sample $sample core fields', ({ text, amount, currency, date, lineItems, baseAmount, baseCurrency, exchangeRate, paymentMethod }) => {
    const result = parseReceiptText(text);

    expect(result.amount).toBe(amount);
    expect(result.currency).toBe(currency);
    expect(result.date).toBe(date);
    if (lineItems) expect(result.lineItems?.length).toBeGreaterThanOrEqual(lineItems);
    if (baseAmount) expect(result.baseAmount).toBe(baseAmount);
    if (baseCurrency) expect(result.baseCurrency).toBe(baseCurrency);
    if (exchangeRate) expect(result.exchangeRate).toBe(exchangeRate);
    if (paymentMethod) expect(result.paymentMethod).toBe(paymentMethod);
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

  it('does not fall back to tesseract when the paddle result is weak', async () => {
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

    expect(result.provider).toBe('paddle');
    expect(result.fallbackReason).toBeUndefined();
    expect(result.amount).toBeUndefined();
    expect(result.merchant).toBe('COFFEE SHOP');
    expect(mockedPaddle).toHaveBeenCalledTimes(1);
    expect(mockedTesseract).not.toHaveBeenCalled();
  });

  it('surfaces paddle errors without falling back to tesseract', async () => {
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

    await expect(recognizeReceiptText(sampleBlob, undefined, { mode: 'paddle' })).rejects.toThrow('Paddle unavailable');
    expect(mockedPaddle).toHaveBeenCalledTimes(1);
    expect(mockedTesseract).not.toHaveBeenCalled();
  });

  it('normalizes persisted tesseract and compare modes back to paddle for the UI path', () => {
    localStorage.setItem('expense-manager.receipt-ocr-mode', 'tesseract');
    expect(getReceiptOcrMode()).toBe('paddle');
    expect(localStorage.getItem('expense-manager.receipt-ocr-mode')).toBe('paddle');

    setReceiptOcrMode('compare');
    expect(localStorage.getItem('expense-manager.receipt-ocr-mode')).toBe('paddle');
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
