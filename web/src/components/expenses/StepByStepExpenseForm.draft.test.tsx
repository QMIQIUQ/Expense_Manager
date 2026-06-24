import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import StepByStepExpenseForm from './StepByStepExpenseForm';
import type { Category, Expense } from '../../types';
import {
  compressReceiptImage,
  recognizeReceiptText,
  type ReceiptOcrResult,
} from '../../services/receiptOcrService';
import { resolveExpenseCurrencyFields } from '../../services/currencyRateService';
import { saveReceiptDraft } from '../../utils/receiptDraftStore';

vi.mock('../../services/receiptOcrService', () => ({
  compressReceiptImage: vi.fn(),
  getReceiptOcrMode: vi.fn(() => 'paddle'),
  getReceiptOcrProviderLabel: vi.fn((provider: string) => provider === 'paddle' ? 'PaddleOCR' : 'Tesseract'),
  recognizeReceiptText: vi.fn(),
  setReceiptOcrMode: vi.fn(),
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
const mockedRecognizeReceiptText = vi.mocked(recognizeReceiptText);
const mockedResolveExpenseCurrencyFields = vi.mocked(resolveExpenseCurrencyFields);
const mockedSaveReceiptDraft = vi.mocked(saveReceiptDraft);

const sampleOcrResult: ReceiptOcrResult = {
  text: 'COFFEE SHOP\n2026-04-25\nTOTAL 12.34',
  amount: 12.34,
  date: '2026-04-25',
  merchant: 'COFFEE SHOP',
  provider: 'paddle',
  elapsedMs: 100,
};

const sampleReceiptFile = () => new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });

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

    mockedCompressReceiptImage.mockResolvedValue(new Blob(['compressed'], { type: 'image/jpeg' }));
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

  it('shows the create from OCR action after OCR succeeds', async () => {
    render(
      <StepByStepExpenseForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[makeCategory('Other')]}
        initialReceiptFile={sampleReceiptFile()}
      />
    );

    expect(await screen.findByRole('button', { name: /create from ocr/i })).toBeInTheDocument();
    expect(mockedRecognizeReceiptText).toHaveBeenCalledTimes(1);
    expect(mockedSaveReceiptDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptText: sampleOcrResult.text,
        receiptMerchant: sampleOcrResult.merchant,
        receiptDate: sampleOcrResult.date,
        receiptAmount: sampleOcrResult.amount,
      }),
      expect.any(Blob),
    );
  });

  it('creates an expense from OCR using the Other category fallback', async () => {
    const onSubmit = vi.fn();

    render(
      <StepByStepExpenseForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        categories={[makeCategory('Food'), makeCategory('Other')]}
        initialReceiptFile={sampleReceiptFile()}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /create from ocr/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      amount: 12.34,
      date: '2026-04-25',
      description: 'COFFEE SHOP',
      category: 'Other',
      paymentMethod: 'cash',
    }));
  });

  it('does not create an OCR expense when no category exists', async () => {
    const onSubmit = vi.fn();

    render(
      <StepByStepExpenseForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        categories={[]}
        initialReceiptFile={sampleReceiptFile()}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /create from ocr/i }));

    await waitFor(() => {
      expect(screen.getByText(/select a category before creating this expense/i)).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /select a category/i })).toBeInTheDocument();
  });
});
