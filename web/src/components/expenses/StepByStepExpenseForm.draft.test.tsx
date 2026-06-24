import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import StepByStepExpenseForm from './StepByStepExpenseForm';
import type { Category, Expense } from '../../types';
import {
  compressReceiptImage,
  prepareReceiptImageForOcr,
  recognizeReceiptText,
  type ReceiptOcrResult,
} from '../../services/receiptOcrService';
import { resolveExpenseCurrencyFields } from '../../services/currencyRateService';
import { saveReceiptDraft } from '../../utils/receiptDraftStore';

vi.mock('../../services/receiptOcrService', () => ({
  compressReceiptImage: vi.fn(),
  getReceiptOcrMode: vi.fn(() => 'paddle'),
  getReceiptOcrProviderLabel: vi.fn((provider: string) => provider === 'paddle' ? 'PaddleOCR' : 'Tesseract'),
  prepareReceiptImageForOcr: vi.fn(),
  recognizeReceiptText: vi.fn(),
}));

vi.mock('../../services/currencyRateService', () => ({
  resolveExpenseCurrencyFields: vi.fn(),
}));

vi.mock('../../utils/receiptDraftStore', () => ({
  createReceiptDraftId: vi.fn(() => 'draft-1'),
  cleanupReceiptDrafts: vi.fn(() => Promise.resolve(0)),
  deleteReceiptDraft: vi.fn(() => Promise.resolve()),
  loadLatestReceiptDraft: vi.fn(() => Promise.resolve(null)),
  saveReceiptDraft: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'test-user' } }),
}));

const mockedCompressReceiptImage = vi.mocked(compressReceiptImage);
const mockedPrepareReceiptImageForOcr = vi.mocked(prepareReceiptImageForOcr);
const mockedRecognizeReceiptText = vi.mocked(recognizeReceiptText);
const mockedResolveExpenseCurrencyFields = vi.mocked(resolveExpenseCurrencyFields);
const mockedSaveReceiptDraft = vi.mocked(saveReceiptDraft);

const sampleOcrResult: ReceiptOcrResult = {
  text: 'COFFEE SHOP\n2026-04-25\nLatte S$4.50\nSandwich S$7.84\nTOTAL SGD 12.34',
  amount: 12.34,
  currency: 'SGD',
  date: '2026-04-25',
  merchant: 'COFFEE SHOP',
  lineItems: [
    { description: 'Latte', amount: 4.5 },
    { description: 'Sandwich', amount: 7.84 },
  ],
  provider: 'paddle',
  elapsedMs: 100,
};

const sampleReceiptFile = () => new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
const compressedReceiptBlob = new Blob(['compressed'], { type: 'image/jpeg' });
const ocrReceiptBlob = new Blob(['ocr-ready'], { type: 'image/jpeg' });

const makeCategory = (name: string): Category => ({
  id: name,
  userId: 'test-user',
  name,
  icon: 'x',
  color: '#95A5A6',
  isDefault: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
});

describe('StepByStepExpenseForm draft controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:receipt-preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });

    mockedCompressReceiptImage.mockResolvedValue(compressedReceiptBlob);
    mockedPrepareReceiptImageForOcr.mockResolvedValue(ocrReceiptBlob);
    mockedRecognizeReceiptText.mockResolvedValue(sampleOcrResult);
    mockedSaveReceiptDraft.mockResolvedValue();
    mockedResolveExpenseCurrencyFields.mockImplementation(async ({ amount, currency, baseCurrency, date }) => ({
      currency,
      baseCurrency,
      exchangeRate: 1,
      exchangeRateDate: date,
      exchangeRateFetchedAt: new Date('2026-04-25T00:00:00.000Z'),
      exchangeRateProvider: 'test',
      baseAmount: amount,
    }));
  });

  it('does not show receipt draft controls when editing an existing expense', () => {
    const initialData = {
      id: 'expense-1',
      description: 'Coffee',
      amount: 5.5,
      category: 'Food',
      date: '2024-01-15',
      time: '10:30',
      notes: 'Morning coffee',
      paymentMethod: 'cash' as const,
      userId: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <StepByStepExpenseForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={initialData as Expense}
      />
    );

    expect(screen.queryByRole('button', { name: /scan receipt|拍照|上傳|上传/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/ocr/i)).not.toBeInTheDocument();
  });

  it('prefers the last used currency for a new expense and advances after selection', async () => {
    render(
      <StepByStepExpenseForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        lastUsedCurrency="USD"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /usd.*us dollar/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /usd.*us dollar/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/\$0\.00/)).toBeInTheDocument();
    });
  });

  it('shows PaddleOCR as the only normal OCR mode', () => {
    render(
      <StepByStepExpenseForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    expect(screen.getByText('PaddleOCR')).toBeInTheDocument();
    expect(screen.queryByText('Tesseract')).not.toBeInTheDocument();
    expect(screen.queryByText(/compare/i)).not.toBeInTheDocument();
  });

  it('shows receipt source choices before opening a receipt', async () => {
    render(
      <StepByStepExpenseForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /take photo \/ upload receipt|拍照 \/ 上傳收據|拍照 \/ 上传收据/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /file \/ album|文件 \/ 相簿|檔案 \/ 相簿/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /camera|相机|相機/i })).toBeInTheDocument();
    });
  });

  it('shows the OCR review action after OCR succeeds and saves structured draft fields', async () => {
    render(
      <StepByStepExpenseForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[makeCategory('Other')]}
        initialReceiptFile={sampleReceiptFile()}
      />
    );

    expect(await screen.findByRole('button', { name: /review ocr result/i })).toBeInTheDocument();
    expect(mockedCompressReceiptImage).toHaveBeenCalledWith(expect.any(File), { maxWidth: 1600, quality: 0.78 });
    expect(mockedPrepareReceiptImageForOcr).toHaveBeenCalledWith(expect.any(File), { maxWidth: 2200, quality: 0.92 });
    expect(mockedRecognizeReceiptText).toHaveBeenCalledTimes(1);
    expect(mockedRecognizeReceiptText).toHaveBeenCalledWith(ocrReceiptBlob, expect.any(Function), { mode: 'paddle' });
    expect(mockedSaveReceiptDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptText: sampleOcrResult.text,
        receiptMerchant: sampleOcrResult.merchant,
        receiptDate: sampleOcrResult.date,
        receiptAmount: sampleOcrResult.amount,
        receiptCurrency: sampleOcrResult.currency,
        receiptLineItems: [
          { amount: 4.5, description: 'Latte' },
          { amount: 7.84, description: 'Sandwich' },
        ],
      }),
      expect.any(Blob),
    );
  });

  it('reviews OCR fields without directly creating an expense', async () => {
    const onSubmit = vi.fn();

    render(
      <StepByStepExpenseForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        categories={[makeCategory('Food'), makeCategory('Other')]}
        initialReceiptFile={sampleReceiptFile()}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /review ocr result/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /date/i })).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sgd.*singapore dollar/i })).toHaveAttribute('aria-pressed', 'true');
    });

    fireEvent.click(screen.getByRole('button', { name: /sgd.*singapore dollar/i }));

    await waitFor(() => {
      expect(screen.getByText(/latte/i)).toBeInTheDocument();
      expect(screen.getByText(/sandwich/i)).toBeInTheDocument();
    });
  });

  it('uses localized category fallback while reviewing OCR fields', async () => {
    const onSubmit = vi.fn();

    render(
      <StepByStepExpenseForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        categories={[makeCategory('Food'), makeCategory('其他')]}
        initialReceiptFile={sampleReceiptFile()}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /review ocr result/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /date/i })).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(await screen.findByRole('button', { name: /sgd.*singapore dollar/i }));

    await waitFor(() => {
      expect(screen.getByText(/latte/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('其他')).toBeInTheDocument();
    });
  });

  it('does not submit when reviewing OCR fields without any category', async () => {
    const onSubmit = vi.fn();

    render(
      <StepByStepExpenseForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        categories={[]}
        initialReceiptFile={sampleReceiptFile()}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /review ocr result/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /date/i })).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(await screen.findByRole('button', { name: /sgd.*singapore dollar/i }));

    await waitFor(() => {
      expect(screen.getByText(/latte/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /select a category/i })).toBeInTheDocument();
    });
  });
});
