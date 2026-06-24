import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Expense, Category, Card, EWallet, Bank, Transfer, TimeFormat, DateFormat, AmountItem, PaymentMethodType } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { getTodayLocal, getCurrentTimeLocal, formatDateWithUserFormat } from '../../utils/dateUtils';
import {
  DEFAULT_BASE_CURRENCY,
  CURRENCIES,
  formatMoney,
} from '../../utils/currencyUtils';
import { resolveExpenseCurrencyFields } from '../../services/currencyRateService';
import DatePicker from '../common/DatePicker';
import TimePicker from '../common/TimePicker';
import PaymentMethodSelector from '../common/PaymentMethodSelector';
import { CheckIcon } from '../icons';
import {
  compressReceiptImage,
  getReceiptOcrMode,
  getReceiptOcrProviderLabel,
  recognizeReceiptText,
  setReceiptOcrMode,
  type ReceiptOcrMode,
  type ReceiptOcrResult,
} from '../../services/receiptOcrService';
import { createReceiptDraftId, cleanupReceiptDrafts, deleteReceiptDraft, loadLatestReceiptDraft, saveReceiptDraft, type LoadedReceiptDraft, type ReceiptDraftSnapshot, type ReceiptDraftFormState, type ReceiptPaymentMethod } from '../../utils/receiptDraftStore';

const formatOcrDuration = (elapsedMs?: number): string => {
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs) || elapsedMs < 0) return '';
  if (elapsedMs < 1000) return `${Math.round(elapsedMs)}ms`;
  return `${(elapsedMs / 1000).toFixed(1)}s`;
};

// Step type definition
type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_DATE: Step = 1;
const STEP_CURRENCY: Step = 2;
const STEP_AMOUNT: Step = 3;
const STEP_CATEGORY: Step = 4;
const STEP_DESCRIPTION: Step = 5;
const STEP_PAYMENT: Step = 6;
const CURRENT_DRAFT_FLOW_VERSION = 2;
const OCR_CATEGORY_FALLBACK_NAMES = [
  'other',
  'others',
  'uncategorized',
  'uncategorised',
  'misc',
  'miscellaneous',
  '其他',
  '其它',
  '未分類',
  '未分类',
  '其他類別',
  '其他分类',
  'lain-lain',
  'lain lain',
  'lainnya',
  'lain',
  'その他',
  '기타',
  'อื่นๆ',
  'อื่น ๆ',
];

const normalizeCategoryFallbackName = (value: string): string => {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
};

const mapReceiptLineItemsToAmountItems = (lineItems?: ReceiptOcrResult['lineItems']): AmountItem[] => {
  if (!lineItems?.length) return [];
  return lineItems
    .filter((item) => typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount > 0)
    .map((item) => ({
      amount: Math.round(item.amount * 100) / 100,
      description: item.description?.trim() || undefined,
    }));
};

interface StepByStepExpenseFormProps {
  onSubmit: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel?: () => void;
  onSubmitAndAddAnother?: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  initialData?: Expense;
  initialTransfer?: Transfer;
  initialReceiptFile?: File | null;
  categories: Category[];
  cards?: Card[];
  ewallets?: EWallet[];
  banks?: Bank[];
  onCreateEWallet?: () => void;
  onCreateCard?: () => void;
  onAddTransfer?: (transfer: Omit<Transfer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, silent?: boolean) => Promise<void>;
  initialDate?: string;
  timeFormat?: TimeFormat;
  dateFormat?: DateFormat;
  lastUsedCurrency?: string;
  lastUsedPaymentMethod?: string;
}

const StepByStepExpenseForm: React.FC<StepByStepExpenseFormProps> = ({
  onSubmit,
  onCancel,
  onSubmitAndAddAnother,
  initialData,
  initialTransfer,
  initialReceiptFile = null,
  categories,
  cards = [],
  ewallets = [],
  banks = [],
  onAddTransfer,
  onCreateEWallet,
  onCreateCard,
  initialDate,
  timeFormat = '24h',
  dateFormat = 'YYYY-MM-DD',
  lastUsedCurrency,
  lastUsedPaymentMethod,
}) => {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const initialReceiptProcessedRef = useRef<File | null>(null);
  const [receiptDraftId, setReceiptDraftId] = useState<string | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptOcrBusy, setReceiptOcrBusy] = useState(false);
  const [receiptOcrStatus, setReceiptOcrStatus] = useState<string>('');
  const [receiptOcrError, setReceiptOcrError] = useState<string>('');
  const [receiptOcrText, setReceiptOcrText] = useState<string>('');
  const [receiptOcrResult, setReceiptOcrResult] = useState<ReceiptOcrResult | null>(null);
  const [receiptOcrSummary, setReceiptOcrSummary] = useState<string>('');
  const [receiptOcrMode, setReceiptOcrModeState] = useState<ReceiptOcrMode>(() => getReceiptOcrMode());
  
  // Delay for focusing input after state updates
  const FOCUS_DELAY_MS = 50;
  const RECEIPT_DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const isEnglish = language === 'en';
  const isSimplifiedChinese = language === 'zh-CN';
  const receiptTexts = useMemo(() => ({
    scan: isEnglish ? 'Take photo / Upload receipt' : isSimplifiedChinese ? '拍照 / 上传收据' : '拍照 / 上傳收據',
    scanning: isEnglish ? 'Scanning...' : isSimplifiedChinese ? '扫描中...' : '掃描中...',
    saveDraft: isEnglish ? 'Save draft' : isSimplifiedChinese ? '保存草稿' : '儲存草稿',
    clearDraft: isEnglish ? 'Clear draft' : isSimplifiedChinese ? '清除草稿' : '清除草稿',
    modeLabel: isEnglish ? 'OCR mode' : isSimplifiedChinese ? 'OCR 模式' : 'OCR 模式',
    modeTesseract: 'Tesseract',
    modePaddle: 'PaddleOCR',
    modeCompare: isEnglish ? 'Compare both' : isSimplifiedChinese ? '比较两个引擎' : '比較兩個引擎',
    preparing: isEnglish ? 'Preparing receipt image...' : isSimplifiedChinese ? '正在准备收据图片...' : '正在準備收據圖片...',
    runningLocal: isEnglish ? 'Running OCR on this device...' : isSimplifiedChinese ? '正在本机进行 OCR...' : '正在本機進行 OCR...',
    runningPaddle: isEnglish ? 'Running PaddleOCR on this device...' : isSimplifiedChinese ? '正在本机进行 PaddleOCR...' : '正在本機進行 PaddleOCR...',
    runningCompare: isEnglish ? 'Comparing PaddleOCR and Tesseract...' : isSimplifiedChinese ? '正在比较 PaddleOCR 和 Tesseract...' : '正在比較 PaddleOCR 和 Tesseract...',
    runningProgress: (progress: number) => isEnglish ? `Running OCR... ${progress}%` : isSimplifiedChinese ? `正在进行 OCR... ${progress}%` : `正在進行 OCR... ${progress}%`,
    complete: isEnglish ? 'OCR complete. Review the prefilled fields.' : isSimplifiedChinese ? 'OCR 完成，请检查预填栏位。' : 'OCR 完成，請檢查預填欄位。',
    savedOnly: isEnglish ? 'Saved as draft. You can finish it later.' : isSimplifiedChinese ? '已保存为草稿，稍后可继续完成。' : '已儲存為草稿，稍後可繼續完成。',
    draftSaved: isEnglish ? 'Draft saved. You can come back later.' : isSimplifiedChinese ? '草稿已保存，之后可以继续。' : '草稿已儲存，之後可以繼續。',
    draftRestored: isEnglish ? 'Draft restored' : isSimplifiedChinese ? '已恢复草稿' : '已恢復草稿',
    previewSaved: isEnglish ? 'Receipt saved as draft' : isSimplifiedChinese ? '收据已保存为草稿' : '收據已儲存為草稿',
    originalText: isEnglish ? 'OCR text' : isSimplifiedChinese ? 'OCR 原文' : 'OCR 原文',
    reviewOcrResult: isEnglish ? 'Review OCR result' : isSimplifiedChinese ? '检查 OCR 结果' : '檢查 OCR 結果',
    reviewReady: isEnglish ? 'OCR fields are ready to review.' : isSimplifiedChinese ? 'OCR 栏位已准备好检查。' : 'OCR 欄位已準備好檢查。',
    missingCategory: isEnglish ? 'Select a category before creating this expense.' : isSimplifiedChinese ? '请先选择分类再建立支出。' : '請先選擇分類再建立支出。',
    missingAmount: isEnglish ? 'OCR did not find a valid amount.' : isSimplifiedChinese ? 'OCR 没有识别到有效金额。' : 'OCR 沒有辨識到有效金額。',
    receiptFallbackDescription: isEnglish ? 'Receipt' : isSimplifiedChinese ? '收据' : '收據',
    restoreHint: isEnglish ? 'A saved receipt draft was restored automatically.' : isSimplifiedChinese ? '已自动恢复之前保存的收据草稿。' : '已自動恢復先前儲存的收據草稿。',
    entryHint: isEnglish ? 'Scan a receipt here to prefill amount, date, and merchant, then finish later if needed.' : isSimplifiedChinese ? '可先扫描收据，自动预填金额、日期与商家，稍后再继续填写。' : '可先掃描收據，自動預填金額、日期與商家，稍後再繼續填寫。',
  }), [isEnglish, isSimplifiedChinese]);

  const buildReceiptOcrSummary = useCallback((result: ReceiptOcrResult): string => {
    const parts = [
      getReceiptOcrProviderLabel(result.provider || 'tesseract'),
      formatOcrDuration(result.elapsedMs),
      result.currency || '',
      result.lineItems?.length
        ? (isEnglish ? `${result.lineItems.length} items` : isSimplifiedChinese ? `${result.lineItems.length} 个项目` : `${result.lineItems.length} 個項目`)
        : '',
      result.comparison ? (isEnglish ? 'compare mode' : isSimplifiedChinese ? '比较模式' : '比較模式') : '',
    ].filter(Boolean);

    return parts.join(' · ');
  }, [isEnglish, isSimplifiedChinese]);

  // Sort categories by recent usage (stored in localStorage)
  const getSortedCategories = (): Category[] => {
    try {
      const recentUsage = JSON.parse(localStorage.getItem('categoryUsage') || '{}');
      return [...categories].sort((a, b) => {
        const aCount = recentUsage[a.name] || 0;
        const bCount = recentUsage[b.name] || 0;
        return bCount - aCount;
      });
    } catch {
      return categories;
    }
  };

  const updateCategoryUsage = (categoryName: string) => {
    try {
      const recentUsage = JSON.parse(localStorage.getItem('categoryUsage') || '{}');
      recentUsage[categoryName] = (recentUsage[categoryName] || 0) + 1;
      localStorage.setItem('categoryUsage', JSON.stringify(recentUsage));
    } catch {
      // Ignore localStorage errors
    }
  };

  const [formData, setFormData] = useState<ReceiptDraftFormState>({
    date: initialDate || initialData?.date || getTodayLocal(),
    time: initialData?.time || getCurrentTimeLocal(),
    amount: initialData?.amount ? Math.round(initialData.amount * 100) : 0,
    currency: initialData?.currency || lastUsedCurrency || DEFAULT_BASE_CURRENCY,
    category: initialData?.category || '',
    description: initialData?.description || '',
    notes: initialData?.notes || '',
    paymentMethod: (initialData?.paymentMethod || lastUsedPaymentMethod || 'cash') as ReceiptPaymentMethod,
    paymentMethodName: initialData?.paymentMethodName || '',
    cardId: initialData?.cardId || '',
    bankId: initialData?.bankId || '',
    needsRepaymentTracking: initialData?.needsRepaymentTracking || false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currencyError, setCurrencyError] = useState('');

  // Multi-amount and tax state
  const [amountItems, setAmountItems] = useState<AmountItem[]>(
    initialData?.amountItems || []
  );
  const [currentAmountInput, setCurrentAmountInput] = useState<number>(0);
  const [enableTax, setEnableTax] = useState(!!initialData?.taxRate);
  const [taxRate, setTaxRate] = useState<number>(initialData?.taxRate || 6);

  const [enableTransfer, setEnableTransfer] = useState(!!initialTransfer);
  const [transferToPaymentMethod, setTransferToPaymentMethod] = useState<'cash' | 'credit_card' | 'e_wallet' | 'bank'>(
    initialTransfer?.toPaymentMethod || 'cash'
  );
  const [transferToCardId, setTransferToCardId] = useState(initialTransfer?.toCardId || '');
  const [transferToEWalletName, setTransferToEWalletName] = useState(initialTransfer?.toPaymentMethodName || '');
  const [transferToBankId, setTransferToBankId] = useState(initialTransfer?.toBankId || '');

  useEffect(() => {
    let timeoutId: number | undefined;
    if (currentStep === STEP_AMOUNT && amountInputRef.current) {
      timeoutId = window.setTimeout(() => amountInputRef.current?.focus(), 100);
    } else if (currentStep === STEP_DESCRIPTION && descriptionInputRef.current) {
      timeoutId = window.setTimeout(() => descriptionInputRef.current?.focus(), 100);
    }
    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === STEP_PAYMENT) {
      if (formData.paymentMethod === 'credit_card' && cards.length > 0 && !formData.cardId) {
        setFormData(prev => ({ ...prev, cardId: cards[0].id || '' }));
      } else if (formData.paymentMethod === 'e_wallet' && ewallets.length > 0 && !formData.paymentMethodName) {
        setFormData(prev => ({ ...prev, paymentMethodName: ewallets[0].name }));
      } else if (formData.paymentMethod === 'bank' && banks.length > 0 && !formData.bankId) {
        setFormData(prev => ({ ...prev, bankId: banks[0].id || '' }));
      }
    }
  }, [formData.paymentMethod, formData.cardId, formData.paymentMethodName, formData.bankId, currentStep, cards, ewallets, banks]);

  useEffect(() => {
    if (initialReceiptFile) return;
    if (!currentUser || initialData || receiptDraftId) return;
    let cancelled = false;

    const restore = async () => {
      await cleanupReceiptDrafts(currentUser.uid);
      const latest = await loadLatestReceiptDraft(currentUser.uid);
      if (cancelled || !latest) return;
      await restoreDraft(latest);
    };

    void restore();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, initialData, initialReceiptFile, receiptDraftId]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  const handleNext = () => {
    if (currentStep < STEP_PAYMENT) setCurrentStep((prev) => (prev + 1) as Step);
  };

  const buildDraftSnapshot = useCallback((
    overrides: Partial<ReceiptDraftSnapshot> = {},
    draftIdOverride = receiptDraftId,
  ): ReceiptDraftSnapshot | null => {
    if (!currentUser) return null;
    if (!draftIdOverride) return null;

    return {
      draftId: draftIdOverride,
      userId: currentUser.uid,
      updatedAt: Date.now(),
      expiresAt: Date.now() + RECEIPT_DRAFT_TTL_MS,
      flowVersion: CURRENT_DRAFT_FLOW_VERSION,
      currentStep,
      formData,
      amountItems,
      currentAmountInput,
      enableTax,
      taxRate,
      enableTransfer,
      transferToPaymentMethod,
      transferToCardId,
      transferToEWalletName,
      transferToBankId,
      receiptText: receiptOcrText,
      imageName: undefined,
      imageType: undefined,
      imageSize: undefined,
      ...overrides,
    };
  }, [
    amountItems,
    currentAmountInput,
    currentStep,
    currentUser,
    enableTax,
    enableTransfer,
    formData,
    receiptDraftId,
    receiptOcrText,
    taxRate,
    transferToBankId,
    transferToCardId,
    transferToEWalletName,
    transferToPaymentMethod,
    RECEIPT_DRAFT_TTL_MS,
  ]);

  const applyReceiptResult = useCallback((result: ReceiptOcrResult) => {
    const receiptAmountItems = mapReceiptLineItemsToAmountItems(result.lineItems);
    const amountInCents = typeof result.amount === 'number' && Number.isFinite(result.amount) && result.amount > 0
      ? Math.round(result.amount * 100)
      : receiptAmountItems.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);

    setFormData((prev) => ({
      ...prev,
      date: result.date || prev.date,
      amount: amountInCents > 0 ? amountInCents : prev.amount,
      currency: result.currency || prev.currency,
      description: prev.description.trim() ? prev.description : result.merchant || prev.description,
    }));

    if (receiptAmountItems.length > 0) {
      setAmountItems(receiptAmountItems);
      setCurrentAmountInput(0);
      return;
    }

    if (amountInCents > 0) {
      setCurrentAmountInput(amountInCents);
    }
  }, []);

  const saveCurrentDraft = useCallback(async (
    imageBlob?: Blob | null,
    receiptResult?: ReceiptOcrResult | null,
    draftIdOverride = receiptDraftId,
  ) => {
    if (!currentUser) return;
    if (!draftIdOverride) return;

    const snapshot = buildDraftSnapshot({
      receiptText: receiptResult?.text || '',
      receiptMerchant: receiptResult?.merchant,
      receiptDate: receiptResult?.date,
      receiptAmount: receiptResult?.amount,
      receiptCurrency: receiptResult?.currency,
      receiptLineItems: mapReceiptLineItemsToAmountItems(receiptResult?.lineItems),
    }, draftIdOverride);
    if (!snapshot) return;

    const imageName = imageBlob ? `${draftIdOverride}.jpg` : undefined;
    await saveReceiptDraft({
      ...snapshot,
      imageName,
      imageType: imageBlob?.type,
      imageSize: imageBlob?.size,
    }, imageBlob || null);
  }, [buildDraftSnapshot, currentUser, receiptDraftId]);

  const normalizeDraftStep = (draft: ReceiptDraftSnapshot): Step => {
    const rawStep = draft.currentStep as Step | number | undefined;
    if (draft.flowVersion === CURRENT_DRAFT_FLOW_VERSION) {
      return (rawStep as Step) || STEP_DATE;
    }
    if (typeof rawStep !== 'number' || rawStep < STEP_DATE) {
      return STEP_DATE;
    }
    if (rawStep >= STEP_CURRENCY && rawStep <= STEP_DESCRIPTION) {
      return Math.min(rawStep + 1, STEP_PAYMENT) as Step;
    }
    if (rawStep >= STEP_DATE && rawStep <= STEP_PAYMENT) {
      return rawStep as Step;
    }
    return STEP_DATE;
  };

  const restoreDraft = async (loaded: LoadedReceiptDraft | null) => {
    if (!loaded) return;
    const { draft } = loaded;
    setReceiptDraftId(draft.draftId);
    setCurrentStep(normalizeDraftStep(draft));
    setFormData({
      ...draft.formData,
      currency: draft.formData.currency || DEFAULT_BASE_CURRENCY,
    });
    setAmountItems(draft.amountItems || []);
    setCurrentAmountInput(draft.currentAmountInput || 0);
    setEnableTax(!!draft.enableTax);
    setTaxRate(draft.taxRate || 6);
    setEnableTransfer(!!draft.enableTransfer);
    setTransferToPaymentMethod(draft.transferToPaymentMethod || 'cash');
    setTransferToCardId(draft.transferToCardId || '');
    setTransferToEWalletName(draft.transferToEWalletName || '');
    setTransferToBankId(draft.transferToBankId || '');
    setReceiptOcrText(draft.receiptText || '');
    setReceiptOcrResult(null);
    setReceiptOcrStatus(draft.receiptText ? receiptTexts.draftRestored : '');
    setReceiptOcrSummary('');
    if (loaded.imageBlob) {
      const objectUrl = URL.createObjectURL(loaded.imageBlob);
      setReceiptPreviewUrl(objectUrl);
    }
  };

  const resetReceiptDraftState = async () => {
    if (receiptDraftId) {
      await deleteReceiptDraft(receiptDraftId, currentUser?.uid);
    }
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }
    setReceiptDraftId(null);
    setReceiptPreviewUrl(null);
    setReceiptOcrBusy(false);
    setReceiptOcrStatus('');
    setReceiptOcrError('');
    setReceiptOcrText('');
    setReceiptOcrResult(null);
    setReceiptOcrSummary('');
  };

  const handleDraftedReceiptImage = useCallback(async (file: File) => {
    if (!currentUser) return;
    setReceiptOcrError('');
    setReceiptOcrResult(null);
    setReceiptOcrSummary('');
    setReceiptOcrBusy(true);
    setReceiptOcrStatus(receiptTexts.preparing);

    const draftId = receiptDraftId || createReceiptDraftId();
    setReceiptDraftId(draftId);
    const compressed = await compressReceiptImage(file, { maxWidth: 1600, quality: 0.78 });
    const previewUrl = URL.createObjectURL(compressed);
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    setReceiptPreviewUrl(previewUrl);
    setReceiptOcrStatus(
      receiptOcrMode === 'compare'
        ? receiptTexts.runningCompare
        : receiptOcrMode === 'paddle'
          ? receiptTexts.runningPaddle
          : receiptTexts.runningLocal,
    );

    try {
      const getProgressStatus = (progress: number): string => {
        const percent = Math.round(progress * 100);
        if (receiptOcrMode === 'compare') {
          return `${receiptTexts.runningCompare} ${percent}%`;
        }
        if (receiptOcrMode === 'paddle') {
          return `${receiptTexts.runningPaddle} ${percent}%`;
        }
        return receiptTexts.runningProgress(percent);
      };

      const ocr = await recognizeReceiptText(compressed, (progress) => {
        setReceiptOcrStatus(getProgressStatus(progress));
      }, { mode: receiptOcrMode });
      setReceiptOcrResult(ocr);
      setReceiptOcrText(ocr.text);
      applyReceiptResult(ocr);
      setReceiptOcrStatus(receiptTexts.complete);
      setReceiptOcrSummary(buildReceiptOcrSummary(ocr));
      await saveCurrentDraft(compressed, ocr, draftId);
    } catch (error) {
      console.warn('Receipt OCR failed, saving draft only:', error);
      setReceiptOcrResult(null);
      setReceiptOcrStatus(receiptTexts.savedOnly);
      setReceiptOcrError(error instanceof Error ? error.message : 'OCR failed');
      await saveCurrentDraft(compressed, null, draftId);
    } finally {
      setReceiptOcrBusy(false);
    }
  }, [
    applyReceiptResult,
    currentUser,
    receiptDraftId,
    receiptPreviewUrl,
    receiptOcrMode,
    receiptTexts,
    saveCurrentDraft,
    buildReceiptOcrSummary,
  ]);

  useEffect(() => {
    if (!initialReceiptFile || !currentUser) return;
    if (initialReceiptProcessedRef.current === initialReceiptFile) return;
    initialReceiptProcessedRef.current = initialReceiptFile;
    void handleDraftedReceiptImage(initialReceiptFile);
  }, [initialReceiptFile, currentUser, handleDraftedReceiptImage]);

  const handleReceiptInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleDraftedReceiptImage(file);
    event.target.value = '';
  };

  const handleOpenReceiptPicker = () => {
    receiptInputRef.current?.click();
  };

  const handleSaveDraftOnly = async () => {
    if (!currentUser) return;

    let nextDraftId = receiptDraftId;
    if (!nextDraftId) {
      nextDraftId = createReceiptDraftId();
      setReceiptDraftId(nextDraftId);
    }

    const snapshot: ReceiptDraftSnapshot = {
      draftId: nextDraftId,
      userId: currentUser.uid,
      updatedAt: Date.now(),
      expiresAt: Date.now() + RECEIPT_DRAFT_TTL_MS,
      currentStep,
      formData,
      amountItems,
      currentAmountInput,
      enableTax,
      taxRate,
      enableTransfer,
      transferToPaymentMethod,
      transferToCardId,
      transferToEWalletName,
      transferToBankId,
      receiptText: receiptOcrText || receiptOcrStatus || receiptOcrError,
      receiptMerchant: receiptOcrResult?.merchant,
      receiptDate: receiptOcrResult?.date,
      receiptAmount: receiptOcrResult?.amount,
      receiptCurrency: receiptOcrResult?.currency,
      receiptLineItems: mapReceiptLineItemsToAmountItems(receiptOcrResult?.lineItems),
      imageName: undefined,
      imageType: undefined,
      imageSize: undefined,
    };

    await saveReceiptDraft(snapshot, null);
    setReceiptOcrStatus(receiptTexts.draftSaved);
  };

  const handleClearDraft = async () => {
    await resetReceiptDraftState();
    setFormData({
      date: initialDate || getTodayLocal(),
      time: getCurrentTimeLocal(),
      amount: 0,
      currency: lastUsedCurrency || DEFAULT_BASE_CURRENCY,
      category: '',
      description: '',
      notes: '',
      paymentMethod: (lastUsedPaymentMethod || 'cash') as ReceiptPaymentMethod,
      paymentMethodName: '',
      cardId: '',
      bankId: '',
      needsRepaymentTracking: false,
    });
    setAmountItems([]);
    setCurrentAmountInput(0);
    setEnableTax(false);
    setEnableTransfer(false);
    setCurrentStep(STEP_DATE);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as Step);
  };

  // Handle Enter key to go to next step
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentStep === STEP_PAYMENT) {
        if (isStep6Valid()) handleSubmit();
      } else if (currentStep === STEP_AMOUNT && formData.amount > 0) {
        handleNext();
      } else if (currentStep === STEP_DESCRIPTION && formData.description.trim()) {
        handleNext();
      } else if (currentStep === STEP_DATE) {
        handleNext();
      }
    }
  };

  const handleStepClick = (step: Step) => {
    setCurrentStep(step);
  };

  const resolveOcrExpenseCategory = (): string => {
    if (formData.category) return formData.category;

    const fallbackNames = new Set(OCR_CATEGORY_FALLBACK_NAMES.map(normalizeCategoryFallbackName));
    const fallbackCategory = categories.find((category) => fallbackNames.has(normalizeCategoryFallbackName(category.name)));
    if (fallbackCategory) return fallbackCategory.name;

    return categories[0]?.name || '';
  };

  // Helper to build submit data
  const buildSubmitData = async (
    sourceFormData: ReceiptDraftFormState = formData,
  ): Promise<Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>> => {
    const resolvedCurrency = await resolveExpenseCurrencyFields({
      amount: sourceFormData.amount / 100,
      currency: sourceFormData.currency,
      baseCurrency: DEFAULT_BASE_CURRENCY,
      date: sourceFormData.date,
      existing: initialData,
      forceRefresh: !!initialData && (
        initialData.currency !== sourceFormData.currency ||
        initialData.date !== sourceFormData.date
      ),
    });

    const submitData: Record<string, unknown> = {
      ...sourceFormData,
      amount: sourceFormData.amount / 100,
      ...resolvedCurrency,
    };

    // Add multi-amount data if applicable
    if (amountItems.length > 0) {
      submitData.amountItems = amountItems;
      submitData.subtotal = Math.round(subtotal * 100) / 100;
      if (enableTax) {
        submitData.taxRate = taxRate;
        submitData.taxAmount = Math.round(taxAmount * 100) / 100;
      }
    }

    if (sourceFormData.paymentMethod === 'cash') {
      delete submitData.cardId;
      delete submitData.paymentMethodName;
      delete submitData.bankId;
    } else if (sourceFormData.paymentMethod === 'credit_card') {
      delete submitData.paymentMethodName;
      delete submitData.bankId;
    } else if (sourceFormData.paymentMethod === 'e_wallet') {
      delete submitData.cardId;
      delete submitData.bankId;
    } else if (sourceFormData.paymentMethod === 'bank') {
      delete submitData.cardId;
      delete submitData.paymentMethodName;
    }

    return submitData as Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;
  };

  // Helper to handle transfer logic
  const handleTransferIfNeeded = (
    transferAmount: number,
    sourceFormData: ReceiptDraftFormState = formData,
  ) => {
    if (enableTransfer && onAddTransfer) {
      const fromPaymentMethod = sourceFormData.paymentMethod as 'cash' | 'credit_card' | 'e_wallet' | 'bank';
      const toPaymentMethod = transferToPaymentMethod;
      
      const isSamePaymentSource = (
        fromMethod: 'cash' | 'credit_card' | 'e_wallet' | 'bank',
        toMethod: 'cash' | 'credit_card' | 'e_wallet' | 'bank'
      ): boolean => {
        if (fromMethod !== toMethod) return false;
        switch (toMethod) {
          case 'cash': return true;
          case 'credit_card': return transferToCardId === sourceFormData.cardId;
          case 'e_wallet': return transferToEWalletName === sourceFormData.paymentMethodName;
          case 'bank': return transferToBankId === sourceFormData.bankId;
        }
      };

      if (!isSamePaymentSource(fromPaymentMethod, toPaymentMethod)) {
        const transferData: Omit<Transfer, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
          amount: transferAmount,
          date: sourceFormData.date,
          time: sourceFormData.time,
          note: `${t('transfer')} - ${sourceFormData.description}`,
          fromPaymentMethod: fromPaymentMethod,
          fromPaymentMethodName: fromPaymentMethod === 'e_wallet' ? sourceFormData.paymentMethodName : '',
          toPaymentMethod: toPaymentMethod,
          toPaymentMethodName: toPaymentMethod === 'e_wallet' ? transferToEWalletName : '',
        };
        
        if (fromPaymentMethod === 'credit_card' && sourceFormData.cardId) transferData.fromCardId = sourceFormData.cardId;
        if (fromPaymentMethod === 'bank' && sourceFormData.bankId) transferData.fromBankId = sourceFormData.bankId;
        if (toPaymentMethod === 'credit_card' && transferToCardId) transferData.toCardId = transferToCardId;
        if (toPaymentMethod === 'bank' && transferToBankId) transferData.toBankId = transferToBankId;
        
        onAddTransfer(transferData, true).catch((err) => console.error('Failed to create transfer:', err));
      }
    }
  };

  const handleReviewReceiptOcrResult = () => {
    if (!receiptOcrResult || receiptOcrBusy) return;

    const receiptAmountItems = mapReceiptLineItemsToAmountItems(receiptOcrResult.lineItems);
    const itemTotalInCents = receiptAmountItems.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
    const ocrAmountInCents = typeof receiptOcrResult.amount === 'number' && Number.isFinite(receiptOcrResult.amount)
      ? Math.round(receiptOcrResult.amount * 100)
      : 0;

    const amountInCents = formData.amount > 0
      ? formData.amount
      : ocrAmountInCents > 0
        ? ocrAmountInCents
        : itemTotalInCents;

    const nextFormData: ReceiptDraftFormState = {
      ...formData,
      amount: amountInCents,
      date: formData.date || receiptOcrResult.date || getTodayLocal(),
      currency: receiptOcrResult.currency || formData.currency,
      category: formData.category || resolveOcrExpenseCategory(),
      description: formData.description.trim() || receiptOcrResult.merchant?.trim() || receiptTexts.receiptFallbackDescription,
    };

    setFormData(nextFormData);
    if (receiptAmountItems.length > 0) {
      setAmountItems(receiptAmountItems);
      setCurrentAmountInput(0);
    } else if (amountInCents > 0) {
      setCurrentAmountInput(amountInCents);
    }

    setReceiptOcrError(amountInCents > 0 ? '' : receiptTexts.missingAmount);
    setReceiptOcrStatus(amountInCents > 0 ? receiptTexts.reviewReady : receiptTexts.missingAmount);
    setCurrencyError('');
    setCurrentStep(amountInCents > 0 ? STEP_DATE : STEP_AMOUNT);
  };

  // Reset form for adding another expense
  const resetFormForNewExpense = () => {
    setFormData({
      date: initialDate || getTodayLocal(),
      time: getCurrentTimeLocal(),
      amount: 0,
      currency: formData.currency,
      category: '', // Keep category for quick re-entry
      description: '',
      notes: '',
      paymentMethod: formData.paymentMethod, // Keep payment method
      paymentMethodName: formData.paymentMethodName,
      cardId: formData.cardId,
      bankId: formData.bankId,
      needsRepaymentTracking: false,
    });
    setAmountItems([]);
    setCurrentAmountInput(0);
    setEnableTax(false);
    setEnableTransfer(false);
    setCurrentStep(STEP_AMOUNT); // Go back to amount step for quick entry
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setCurrencyError('');
    // Update category usage for sorting
    if (formData.category) {
      updateCategoryUsage(formData.category);
    }

    try {
      const submitData = await buildSubmitData();
      handleTransferIfNeeded((submitData.baseAmount as number) || submitData.amount);
      onSubmit(submitData);
      await resetReceiptDraftState();
    } catch (error) {
      console.error('Failed to resolve expense currency:', error);
      setCurrencyError(error instanceof Error ? error.message : (t('errorLoadingData') || 'Failed to resolve currency'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAndAddAnother = async () => {
    if (!onSubmitAndAddAnother) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    setCurrencyError('');
    
    // Update category usage for sorting
    if (formData.category) {
      updateCategoryUsage(formData.category);
    }

    try {
      const submitData = await buildSubmitData();
      handleTransferIfNeeded((submitData.baseAmount as number) || submitData.amount);
      onSubmitAndAddAnother(submitData);
      await resetReceiptDraftState();
      resetFormForNewExpense();
    } catch (error) {
      console.error('Failed to resolve expense currency:', error);
      setCurrencyError(error instanceof Error ? error.message : (t('errorLoadingData') || 'Failed to resolve currency'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Multi-amount handlers
  const handleCurrentAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, '');
    const amountInCents = parseInt(digitsOnly) || 0;
    setCurrentAmountInput(amountInCents);
    // Also update formData amount for single item mode
    if (amountItems.length === 0) {
      setFormData((prev) => ({ ...prev, amount: amountInCents }));
    }
  };

  const addAmountItem = (shouldFocusInput: boolean = false) => {
    if (currentAmountInput > 0) {
      const newItem: AmountItem = { amount: currentAmountInput / 100 };
      setAmountItems(prev => [...prev, newItem]);
      setCurrentAmountInput(0);
      // Update total amount
      updateTotalAmount([...amountItems, newItem]);
      // Only auto-focus back to input if explicitly requested (e.g., clicking + button)
      if (shouldFocusInput) {
        setTimeout(() => amountInputRef.current?.focus(), FOCUS_DELAY_MS);
      }
    }
  };

  const removeAmountItem = (index: number) => {
    const newItems = amountItems.filter((_, i) => i !== index);
    setAmountItems(newItems);
    updateTotalAmount(newItems);
  };

  const updateTotalAmount = (items: AmountItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = enableTax ? subtotal * (taxRate / 100) : 0;
    const total = subtotal + taxAmount;
    setFormData(prev => ({ ...prev, amount: Math.round(total * 100) }));
  };

  const handleTaxRateChange = (rate: number) => {
    setTaxRate(rate);
    // Recalculate total
    const subtotal = amountItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * (rate / 100);
    const total = subtotal + taxAmount;
    setFormData(prev => ({ ...prev, amount: Math.round(total * 100) }));
  };

  const handleEnableTaxChange = (enabled: boolean) => {
    setEnableTax(enabled);
    // Recalculate total
    const subtotal = amountItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = enabled ? subtotal * (taxRate / 100) : 0;
    const total = subtotal + taxAmount;
    setFormData(prev => ({ ...prev, amount: Math.round(total * 100) }));
  };

  // Calculate subtotal and tax for display
  const subtotal = amountItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = enableTax ? subtotal * (taxRate / 100) : 0;

  // Handle Tab key to add amount item
  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && currentAmountInput > 0) {
      e.preventDefault();
      addAmountItem(false);
      // After Tab, go to next step
      setTimeout(() => handleNext(), FOCUS_DELAY_MS);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Keyboard Enter: add pending amount if any, then go to next step
      if (currentAmountInput > 0) {
        addAmountItem(false);
        // Go to next step after adding
        setTimeout(() => handleNext(), FOCUS_DELAY_MS);
      } else if (formData.amount > 0) {
        // No pending input, just proceed to next step (category)
        handleNext();
      }
    }
  };

  const formatAmountFromCents = (amount: number): string => formatMoney(amount / 100, formData.currency);
  const formatAmountFromDollars = (amount: number): string => formatMoney(amount, formData.currency);

  const getCategoryIcon = (categoryName: string): string => {
    const category = categories.find(c => c.name === categoryName);
    return category?.icon || '📝';
  };

  const safeFormatDateDisplay = (date: string, format?: DateFormat): string => {
    if (date && format) return formatDateWithUserFormat(date, format);
    return date;
  };

  const renderProgressSummary = () => (
    <div style={styles.progressSummary}>
      {currentStep > STEP_DATE && (
        <div style={styles.summaryChip} onClick={() => handleStepClick(STEP_DATE)}>
          📅 {safeFormatDateDisplay(formData.date, dateFormat)}
        </div>
      )}
      {currentStep > STEP_CURRENCY && formData.currency && (
        <div style={styles.summaryChip} onClick={() => handleStepClick(STEP_CURRENCY)}>
          💱 {formData.currency}
        </div>
      )}
      {currentStep > STEP_AMOUNT && formData.amount > 0 && (
        <div style={styles.summaryChip} onClick={() => handleStepClick(STEP_AMOUNT)}>
          💰 {formatAmountFromCents(formData.amount)}
        </div>
      )}
      {currentStep > STEP_CATEGORY && formData.category && (
        <div style={styles.summaryChip} onClick={() => handleStepClick(STEP_CATEGORY)}>
          {getCategoryIcon(formData.category)} {formData.category}
        </div>
      )}
      {currentStep > STEP_DESCRIPTION && formData.description && (
        <div style={styles.summaryChip} onClick={() => handleStepClick(STEP_DESCRIPTION)}>
          📝 {formData.description.slice(0, 15)}{formData.description.length > 15 ? '...' : ''}
        </div>
      )}
    </div>
  );

  const renderProgressIndicator = () => (
    <div style={styles.progressContainer}>
      {[STEP_DATE, STEP_CURRENCY, STEP_AMOUNT, STEP_CATEGORY, STEP_DESCRIPTION, STEP_PAYMENT].map((step) => (
        <div
          key={step}
          style={{
            ...styles.progressBar,
            ...(step <= currentStep ? styles.progressBarActive : {}),
          }}
        />
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: {
        const isNotToday = formData.date !== getTodayLocal();
        return (
          <div style={{ ...styles.stepContent, overflow: 'visible', overflowY: 'visible' }}>
            <div style={styles.stepHeader}>
              <span style={styles.stepHeaderIcon}>📅</span>
              <h2 style={styles.stepHeaderTitle}>{t('date')}</h2>
            </div>
            {isNotToday && (
              <div style={styles.dateWarning}>
                ⚠️ {t('notTodayHint') || '注意：选择的日期不是今天'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <DatePicker
                label={t('date')}
                value={formData.date}
                onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                dateFormat={dateFormat}
                required
              />
              <TimePicker
                label={t('time')}
                value={formData.time}
                onChange={(time) => setFormData(prev => ({ ...prev, time }))}
                timeFormat={timeFormat}
                name="time"
              />
            </div>
          </div>
        );
      }

      case 2:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <span style={styles.stepHeaderIcon}>💱</span>
              <h2 style={styles.stepHeaderTitle}>{t('currency')}</h2>
            </div>
            <div style={styles.currencySelectBlock}>
              <div style={styles.currencyGridHeader}>
                <span style={styles.currencyGridHeaderTitle}>{t('currency')}</span>
                <span style={styles.currencyGridHeaderHint}>{t('select')}</span>
              </div>
              <div style={styles.currencyGrid}>
                {CURRENCIES.map((currency) => {
                  const selected = currency.code === formData.currency;
                  return (
                    <button
                      key={currency.code}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, currency: currency.code }));
                        window.setTimeout(() => handleNext(), 150);
                      }}
                      aria-pressed={selected}
                      aria-label={`${currency.symbol} ${currency.code} ${currency.name}`}
                      style={{
                        ...styles.currencyCard,
                        ...(selected ? styles.currencyCardActive : {}),
                      }}
                    >
                      <div style={styles.currencyCardTop}>
                        <span style={styles.currencySymbol}>{currency.symbol}</span>
                        <span style={styles.currencyCode}>{currency.code}</span>
                        {selected && <CheckIcon size={14} style={styles.currencyCheckIcon} />}
                      </div>
                      <span style={styles.currencyName}>{currency.name}</span>
                    </button>
                  );
                })}
              </div>
              <div style={styles.currencyHelp}>
                {formData.currency === DEFAULT_BASE_CURRENCY
                  ? (t('baseCurrencyHint') || 'MYR is the base currency, so no conversion is needed.')
                  : (t('exchangeRateHint') || 'Will be converted to MYR when you save.')}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <span style={styles.stepHeaderIcon}>💰</span>
              <h2 style={styles.stepHeaderTitle}>{t('amount')}</h2>
              {/* Display total in header when there are amount items */}
              {(amountItems.length > 0 || formData.amount > 0) && (
                <span style={styles.headerTotal}>
                  {t('total')}: {formatAmountFromCents(formData.amount)}
                </span>
              )}
            </div>

            {/* Amount input with add button */}
            <div style={styles.amountInputRow}>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                value={currentAmountInput === 0 ? '' : formatAmountFromCents(currentAmountInput)}
                onChange={handleCurrentAmountInputChange}
                onKeyDown={handleAmountKeyDown}
                placeholder={formatMoney(0, formData.currency)}
                style={styles.amountInputMulti}
              />
              <button
                type="button"
                onClick={() => addAmountItem(true)}
                disabled={currentAmountInput === 0}
                style={{
                  ...styles.addAmountBtn,
                  ...(currentAmountInput === 0 ? styles.addAmountBtnDisabled : {}),
                }}
              >
                + {t('add')}
              </button>
            </div>

            {/* Amount items list */}
            {amountItems.length > 0 && (
              <div style={styles.amountItemsList}>
                <div style={styles.amountItemsLabel}>{t('addedItems')}:</div>
                {amountItems.map((item, index) => (
                  <div key={index} style={styles.amountItem}>
                    <span>
                      {item.description ? `${item.description}: ` : ''}
                      {formatAmountFromDollars(item.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAmountItem(index)}
                      style={styles.removeAmountBtn}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tax section */}
            {amountItems.length > 0 && (
              <>
                <div style={styles.taxCheckboxRow}>
                  <label style={styles.taxCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={enableTax}
                      onChange={(e) => handleEnableTaxChange(e.target.checked)}
                      style={styles.taxCheckbox}
                    />
                    <span>{t('addTax')}</span>
                  </label>
                </div>

                {enableTax && (
                  <div style={styles.taxRateRow}>
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                      style={styles.taxRateInput}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span style={styles.taxRatePercent}>%</span>
                    <button
                      type="button"
                      onClick={() => handleTaxRateChange(6)}
                      style={{
                        ...styles.taxPresetBtn,
                        ...(taxRate === 6 ? styles.taxPresetBtnActive : {}),
                      }}
                    >
                      6%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTaxRateChange(8)}
                      style={{
                        ...styles.taxPresetBtn,
                        ...(taxRate === 8 ? styles.taxPresetBtnActive : {}),
                      }}
                    >
                      8%
                    </button>
                  </div>
                )}

                {/* Summary */}
                <div style={styles.amountSummary}>
                  <div style={styles.summaryRow}>
                    <span>{t('subtotal')}:</span>
                    <span>{formatAmountFromDollars(subtotal)}</span>
                  </div>
                  {enableTax && (
                    <div style={styles.summaryRow}>
                      <span>{t('tax')} ({taxRate}%):</span>
                      <span>{formatAmountFromDollars(taxAmount)}</span>
                    </div>
                  )}
                  <div style={{ ...styles.summaryRow, ...styles.summaryRowTotal }}>
                    <span>{t('total')}:</span>
                    <span style={styles.summaryTotal}>{formatAmountFromCents(formData.amount)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Simple amount display when no items added */}
            {amountItems.length === 0 && formData.amount > 0 && (
              <div style={styles.simpleAmountDisplay}>
                <span style={styles.simpleAmountLabel}>{t('total')}:</span>
                <span style={styles.simpleAmountValue}>{formatAmountFromCents(formData.amount)}</span>
              </div>
            )}
          </div>
        );

      case 4: {
        const sortedCategories = getSortedCategories();
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <span style={styles.stepHeaderIcon}>🏷️</span>
              <h2 style={styles.stepHeaderTitle}>{t('selectCategory')}</h2>
            </div>
            <div style={styles.categoryScrollContainer}>
              <div style={styles.categoryScroll}>
                {sortedCategories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, category: category.name }));
                      // Auto advance to next step when category is selected
                      setTimeout(() => handleNext(), 150);
                    }}
                    style={{
                      ...styles.categoryCard,
                      ...(formData.category === category.name ? styles.categoryCardActive : {}),
                    }}
                  >
                    <div style={styles.categoryEmoji}>{getCategoryIcon(category.name)}</div>
                    <div style={styles.categoryName}>{category.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 5:
        return (
          <div style={styles.stepContent}>
            <div style={styles.fieldContainer}>
              <label style={styles.fieldLabel}>📝 {t('description')}</label>
              <input
                ref={descriptionInputRef}
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('descriptionPlaceholder')}
                style={styles.textInput}
              />
            </div>

            {/* Amount Items Description Section */}
            {amountItems.length > 0 && (
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>💰 {t('amountDetails')} ({t('optional')})</label>
                <div style={styles.amountDescriptionList}>
                  {amountItems.map((item, index) => (
                    <div key={index} style={styles.amountDescriptionRow}>
                      <span style={styles.amountDescriptionAmount}>
                        {formatAmountFromDollars(item.amount)}:
                      </span>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => {
                          const newItems = [...amountItems];
                          newItems[index] = { ...item, description: e.target.value };
                          setAmountItems(newItems);
                        }}
                        placeholder={t('itemDescription') || 'Item description...'}
                        style={styles.amountDescriptionInput}
                      />
                    </div>
                  ))}
                  {enableTax && taxAmount > 0 && (
                    <div style={styles.amountDescriptionRow}>
                      <span style={styles.taxLabel}>{t('tax')} ({taxRate}%):</span>
                      <span style={styles.taxValue}>{formatAmountFromDollars(taxAmount)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={styles.fieldContainer}>
              <label style={styles.fieldLabel}>{t('notes')} ({t('optional')})</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('notesPlaceholder')}
                style={styles.textArea}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                  }
                }}
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <span style={styles.stepHeaderIcon}>💳</span>
              <h2 style={styles.stepHeaderTitle}>{t('paymentMethod')}</h2>
            </div>

            {lastUsedPaymentMethod && !initialData && (
              <div style={styles.autoSelectHint}>
                ✨ Auto-selected
              </div>
            )}

            <PaymentMethodSelector
              paymentMethod={formData.paymentMethod as PaymentMethodType}
              onPaymentMethodChange={(method) => setFormData(prev => ({ ...prev, paymentMethod: method }))}
              cardId={formData.cardId}
              onCardChange={(cardId) => setFormData(prev => ({ ...prev, cardId }))}
              bankId={formData.bankId}
              onBankChange={(bankId) => setFormData(prev => ({ ...prev, bankId }))}
              paymentMethodName={formData.paymentMethodName}
              onPaymentMethodNameChange={(name) => setFormData(prev => ({ ...prev, paymentMethodName: name }))}
              cards={cards}
              banks={banks}
              ewallets={ewallets}
              onCreateCard={onCreateCard}
              onCreateEWallet={onCreateEWallet}
              showLabels={false}
            />

            {/* Toggle options - tap to toggle like settings page */}
            <div style={styles.toggleOptionsContainer}>
              <div
                onClick={() => setFormData(prev => ({ ...prev, needsRepaymentTracking: !prev.needsRepaymentTracking }))}
                style={{
                  ...styles.toggleOption,
                  ...(formData.needsRepaymentTracking ? styles.toggleOptionActive : {}),
                }}
              >
                <span style={styles.toggleOptionIcon}>🔄</span>
                <span style={styles.toggleOptionText}>{t('repayment')}</span>
                <span style={styles.toggleIndicator}>{formData.needsRepaymentTracking ? '✓' : ''}</span>
              </div>

              <div
                onClick={() => setEnableTransfer(!enableTransfer)}
                style={{
                  ...styles.toggleOption,
                  ...(enableTransfer ? styles.toggleOptionActive : {}),
                }}
              >
                <span style={styles.toggleOptionIcon}>↔️</span>
                <span style={styles.toggleOptionText}>{t('transfer')}</span>
                <span style={styles.toggleIndicator}>{enableTransfer ? '✓' : ''}</span>
              </div>
            </div>

            {enableTransfer && (
              <div style={styles.transferOptions}>
                <label style={styles.fieldLabel}>{t('transferTo')}</label>
                <div style={styles.paymentMethodGrid}>
                  <div
                    onClick={() => setTransferToPaymentMethod('cash')}
                    style={{
                      ...styles.paymentMethodCardSmall,
                      ...(transferToPaymentMethod === 'cash' ? styles.paymentMethodCardActive : {}),
                    }}
                  >
                    <div style={styles.paymentMethodIconSmall}>💵</div>
                    <div style={styles.paymentMethodNameSmall}>{t('cash')}</div>
                  </div>
                  <div
                    onClick={() => setTransferToPaymentMethod('credit_card')}
                    style={{
                      ...styles.paymentMethodCardSmall,
                      ...(transferToPaymentMethod === 'credit_card' ? styles.paymentMethodCardActive : {}),
                    }}
                  >
                    <div style={styles.paymentMethodIconSmall}>💳</div>
                    <div style={styles.paymentMethodNameSmall}>{t('creditCard')}</div>
                  </div>
                  <div
                    onClick={() => setTransferToPaymentMethod('e_wallet')}
                    style={{
                      ...styles.paymentMethodCardSmall,
                      ...(transferToPaymentMethod === 'e_wallet' ? styles.paymentMethodCardActive : {}),
                    }}
                  >
                    <div style={styles.paymentMethodIconSmall}>📱</div>
                    <div style={styles.paymentMethodNameSmall}>{t('eWallet')}</div>
                  </div>
                  <div
                    onClick={() => setTransferToPaymentMethod('bank')}
                    style={{
                      ...styles.paymentMethodCardSmall,
                      ...(transferToPaymentMethod === 'bank' ? styles.paymentMethodCardActive : {}),
                    }}
                  >
                    <div style={styles.paymentMethodIconSmall}>🏦</div>
                    <div style={styles.paymentMethodNameSmall}>{t('bankTransfer')}</div>
                  </div>
                </div>

                {transferToPaymentMethod === 'credit_card' && cards.length > 0 && (
                  <select
                    value={transferToCardId}
                    onChange={(e) => setTransferToCardId(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">{t('selectCard')}</option>
                    {cards.map((card) => (
                      <option key={card.id} value={card.id}>{card.name}</option>
                    ))}
                  </select>
                )}

                {transferToPaymentMethod === 'e_wallet' && (
                  <input
                    type="text"
                    value={transferToEWalletName}
                    onChange={(e) => setTransferToEWalletName(e.target.value)}
                    placeholder={t('eWalletName')}
                    style={styles.textInput}
                  />
                )}

                {transferToPaymentMethod === 'bank' && banks.length > 0 && (
                  <select
                    value={transferToBankId}
                    onChange={(e) => setTransferToBankId(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">{t('selectBank')}</option>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>{bank.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Fixed validation logic - using correct payment method values
  const isStep6Valid = () => {
    if (formData.paymentMethod === 'e_wallet' && !formData.paymentMethodName?.trim()) return false;
    if (formData.paymentMethod === 'credit_card' && cards.length > 0 && !formData.cardId) return false;
    if (formData.paymentMethod === 'bank' && banks.length > 0 && !formData.bankId) return false;
    return true;
  };

  return (
    <>
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleReceiptInputChange}
        style={{ display: 'none' }}
      />
      <div style={styles.container} onKeyDown={handleKeyDown}>
      <div style={styles.header}>
        {/* Navigation buttons in header */}
        <button
          onClick={currentStep === 1 ? onCancel : handlePrevious}
          style={styles.headerNavBtn}
          aria-label={currentStep === 1 ? t('cancel') : t('back')}
        >
          {currentStep === 1 ? '✕' : '‹'}
        </button>
        
        <div style={styles.headerCenter}>
          <div style={styles.headerTitle}>
            {initialData ? (t('editExpense') || '编辑支出') : (t('addExpense') || '新增支出')}
          </div>
          {renderProgressIndicator()}
        </div>
        
        <div style={styles.headerRight}>
          {/* Save & Add Another button - only show in final step when creating new expense */}
          {currentStep === STEP_PAYMENT && !initialData && onSubmitAndAddAnother && (
            <button
              onClick={handleSubmitAndAddAnother}
              disabled={!isStep6Valid() || isSubmitting}
              style={{
                ...styles.headerNavBtn,
                ...styles.headerNavBtnSecondary,
                opacity: isStep6Valid() && !isSubmitting ? 1 : 0.5,
                cursor: isStep6Valid() && !isSubmitting ? 'pointer' : 'not-allowed',
              }}
              aria-label={t('saveAndAddAnother') || '储存后新增'}
              title={t('saveAndAddAnother') || '储存后新增'}
            >
              ➕
            </button>
          )}
          <button
            onClick={currentStep === STEP_PAYMENT ? handleSubmit : handleNext}
            style={styles.headerNavBtn}
            disabled={
              isSubmitting ||
              (currentStep === STEP_AMOUNT && formData.amount === 0) ||
              (currentStep === STEP_CATEGORY && !formData.category) ||
              (currentStep === STEP_DESCRIPTION && !formData.description.trim()) ||
              (currentStep === STEP_PAYMENT && !isStep6Valid())
            }
            aria-label={currentStep === STEP_PAYMENT ? t('save') : t('next')}
          >
            {currentStep === STEP_PAYMENT ? '✓' : '›'}
          </button>
        </div>
      </div>

      {currencyError && (
        <div style={styles.currencyError}>
          {currencyError}
        </div>
      )}

      {!initialData && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color, #e9ecef)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{receiptTexts.modeLabel}</span>
            <select
              value={receiptOcrMode}
              disabled={receiptOcrBusy}
              onChange={(event) => {
                const nextMode = event.target.value as ReceiptOcrMode;
                setReceiptOcrMode(nextMode);
                setReceiptOcrModeState(nextMode);
              }}
              style={{
                minWidth: 160,
                minHeight: 36,
                borderRadius: 10,
                border: '1px solid var(--border-color, #e9ecef)',
                background: 'var(--bg-primary, #fff)',
                color: 'var(--text-primary)',
                padding: '0 12px',
                fontSize: 13,
              }}
            >
              <option value="tesseract">{receiptTexts.modeTesseract}</option>
              <option value="paddle">{receiptTexts.modePaddle}</option>
              <option value="compare">{receiptTexts.modeCompare}</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: receiptPreviewUrl ? '12px' : 0 }}>
            <button type="button" onClick={handleOpenReceiptPicker} style={styles.buttonSecondary} disabled={receiptOcrBusy}>
              {receiptOcrBusy ? receiptTexts.scanning : receiptTexts.scan}
            </button>
            <button type="button" onClick={handleSaveDraftOnly} style={styles.buttonSecondary}>
              {receiptTexts.saveDraft}
            </button>
            <button type="button" onClick={handleClearDraft} style={styles.buttonSecondary}>
              {receiptTexts.clearDraft}
            </button>
          </div>
          <div style={styles.receiptHintText}>
            {receiptDraftId ? receiptTexts.restoreHint : receiptTexts.entryHint}
          </div>
          {receiptPreviewUrl && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <img src={receiptPreviewUrl} alt="Receipt preview" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border-color, #e9ecef)' }} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1, minWidth: 0 }}>
                {receiptOcrStatus || receiptTexts.previewSaved}
                {receiptOcrSummary ? ` · ${receiptOcrSummary}` : ''}
                {receiptOcrError ? ` · ${receiptOcrError}` : ''}
              </div>
            </div>
          )}
          {!receiptPreviewUrl && receiptOcrStatus && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {receiptOcrStatus}
              {receiptOcrSummary ? ` · ${receiptOcrSummary}` : ''}
              {receiptOcrError ? ` · ${receiptOcrError}` : ''}
            </div>
          )}
          {receiptOcrResult && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 8 }}>
              <button
                type="button"
                onClick={handleReviewReceiptOcrResult}
                disabled={receiptOcrBusy || isSubmitting || !receiptOcrResult}
                style={{
                  ...styles.buttonPrimary,
                  flex: '0 1 auto',
                  opacity: receiptOcrBusy || isSubmitting ? 0.5 : 1,
                  cursor: receiptOcrBusy || isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {receiptTexts.reviewOcrResult}
              </button>
            </div>
          )}
          {receiptOcrText && (
            <details style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              <summary style={{ cursor: 'pointer' }}>{receiptTexts.originalText}</summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{receiptOcrText}</pre>
            </details>
          )}
        </div>
      )}
      {renderProgressSummary()}
      {renderStepContent()}
    </div>
  </> 
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '100%',
    width: '100%',
    margin: '0 auto',
    background: 'var(--card-bg, white)',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'var(--bg-secondary, #f8f9fa)',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color, #e9ecef)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  headerCenter: {
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  headerNavBtn: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    background: 'var(--card-bg, white)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  headerNavBtnSecondary: {
    background: 'var(--success-bg, #d4edda)',
    border: '1px solid var(--success-text, #28a745)',
    color: 'var(--success-text, #28a745)',
    fontSize: '14px',
  },
  headerNavBtnPrimary: {
    background: 'var(--accent-primary)',
    border: '1px solid var(--accent-primary)',
    color: 'white',
  },
  headerNavBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  headerIcon: {
    fontSize: '20px',
  },
  progressContainer: {
    display: 'flex',
    gap: '4px',
  },
  progressBar: {
    flex: 1,
    height: '3px',
    background: 'var(--border-color, #e9ecef)',
    borderRadius: '2px',
    transition: 'all 0.3s',
  },
  progressBarActive: {
    background: 'var(--accent-primary)',
  },
  progressSummary: {
    display: 'flex',
    gap: '6px',
    padding: '10px 12px',
    overflowX: 'auto',
    background: 'var(--card-bg, white)',
    borderBottom: '1px solid var(--border-color, #e9ecef)',
  },
  summaryChip: {
    padding: '4px 10px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e9ecef)',
    color: 'var(--text-primary)',
    transition: 'all 0.2s',
  },
  stepContent: {
    padding: '16px',
    flex: 1, // Take available space
    minHeight: '300px',
    maxHeight: 'calc(100vh - 250px)', // Constrain max height to viewport
    overflowY: 'auto',
    position: 'relative' as const, // Establish positioning context for absolute children
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  stepHeaderIcon: {
    fontSize: '18px',
  },
  stepHeaderTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },
  headerTotal: {
    marginLeft: 'auto',
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--success-text)',
  },
  amountInputContainer: {
    textAlign: 'center',
  },
  amountInput: {
    fontSize: '32px',
    fontWeight: '700',
    textAlign: 'center',
    border: 'none',
    borderBottom: '2px solid var(--accent-primary)',
    padding: '10px',
    width: '100%',
    maxWidth: '280px',
    outline: 'none',
    color: 'var(--text-primary)',
    background: 'transparent',
  },
  categoryScrollContainer: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    marginLeft: '-16px',
    marginRight: '-16px',
    paddingLeft: '16px',
    paddingRight: '16px',
  },
  categoryScroll: {
    display: 'grid',
    gridTemplateRows: 'repeat(2, 1fr)',
    gridAutoFlow: 'column',
    gridAutoColumns: 'minmax(80px, 100px)',
    gap: '8px',
    paddingBottom: '8px',
    paddingRight: '16px',
  },
  categoryCard: {
    padding: '12px 8px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e9ecef)',
    transition: 'all 0.2s',
    overflow: 'hidden',
    minWidth: 0,
  },
  categoryCardActive: {
    background: 'var(--accent-light)',
    border: '1px solid var(--accent-primary)',
  },
  categoryEmoji: {
    fontSize: '20px',
    marginBottom: '4px',
  },
  categoryName: {
    fontSize: '11px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  fieldContainer: {
    marginBottom: '24px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: 'var(--text-primary)',
  },
  textInput: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
  },
  textArea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    outline: 'none',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
  },
  currencySelectBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    marginTop: '4px',
    marginBottom: '4px',
  },
  currencyGridHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '6px',
  },
  currencyGridHeaderTitle: {
    fontSize: '14px',
    fontWeight: 600 as const,
    color: 'var(--text-primary)',
  },
  currencyGridHeaderHint: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  currencyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '8px',
  },
  currencyCard: {
    padding: '12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e9ecef)',
    transition: 'all 0.2s',
    minHeight: '84px',
  },
  currencyCardActive: {
    background: 'var(--accent-light)',
    border: '1px solid var(--accent-primary)',
    boxShadow: '0 0 0 1px var(--accent-primary) inset',
  },
  currencyCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  currencySymbol: {
    fontSize: '18px',
    fontWeight: 700 as const,
    color: 'var(--text-primary)',
  },
  currencyCode: {
    fontSize: '14px',
    fontWeight: 700 as const,
    color: 'var(--text-primary)',
  },
  currencyCheckIcon: {
    marginLeft: 'auto',
    color: 'var(--accent-primary)',
    flexShrink: 0,
  },
  currencyName: {
    fontSize: '12px',
    fontWeight: 500 as const,
    color: 'var(--text-secondary)',
    lineHeight: 1.35,
  },
  currencyHelp: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  currencyError: {
    fontSize: '12px',
    color: 'var(--error-text)',
    marginTop: '4px',
  },
  paymentMethodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '16px',
  },
  paymentMethodCard: {
    padding: '12px 8px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e9ecef)',
    transition: 'all 0.2s',
  },
  paymentMethodCardActive: {
    background: 'var(--accent-light)',
    border: '1px solid var(--accent-primary)',
  },
  paymentMethodIcon: {
    fontSize: '20px',
    marginBottom: '4px',
  },
  paymentMethodName: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  paymentMethodCardSmall: {
    padding: '16px 12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
  paymentMethodIconSmall: {
    fontSize: '24px',
    marginBottom: '4px',
  },
  paymentMethodNameSmall: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  autoSelectHint: {
    padding: '12px 16px',
    background: 'var(--info-bg)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--info-text)',
    marginBottom: '16px',
    textAlign: 'center',
  },
  checkboxContainer: {
    marginBottom: '16px',
    padding: '16px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    color: 'var(--text-primary)',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  checkboxHint: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '8px',
    marginLeft: '32px',
  },
  transferOptions: {
    marginTop: '16px',
    padding: '16px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
  },
  navigation: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid var(--border-color, #e9ecef)',
  },
  buttonSecondary: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    background: 'var(--card-bg, white)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  receiptHintText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    lineHeight: 1.5,
  },
  buttonPrimary: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid var(--accent-primary)',
    borderRadius: '8px',
    background: 'var(--accent-primary)',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  noItemsContainer: {
    padding: '16px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    textAlign: 'center',
  },
  noItemsText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: '0 0 12px 0',
  },
  createButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '6px',
    background: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dateWarning: {
    fontSize: '12px',
    color: 'var(--warning-text)',
    marginBottom: '12px',
    textAlign: 'center',
  },
  toggleOptionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  toggleOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e9ecef)',
    transition: 'all 0.2s',
  },
  toggleOptionActive: {
    background: 'var(--accent-light)',
    border: '1px solid var(--accent-primary)',
  },
  toggleOptionIcon: {
    fontSize: '16px',
  },
  toggleOptionText: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  toggleIndicator: {
    fontSize: '14px',
    color: 'var(--accent-primary)',
    fontWeight: '600',
  },
  // Multi-amount styles
  amountInputRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  amountInputMulti: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '18px',
    fontWeight: '600',
    border: '2px solid var(--border-color, #e9ecef)',
    borderRadius: '12px',
    outline: 'none',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s',
  },
  addAmountBtn: {
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    background: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.2s',
  },
  addAmountBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  amountItemsList: {
    marginBottom: '12px',
  },
  amountItemsLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  amountItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    marginBottom: '4px',
    fontSize: '14px',
    color: 'var(--text-primary)',
  },
  removeAmountBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
  taxCheckboxRow: {
    marginBottom: '8px',
  },
  taxCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  taxCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  taxRateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  taxRateInput: {
    width: '60px',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
    textAlign: 'center' as const,
  },
  taxRatePercent: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  taxPresetBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    background: 'var(--bg-secondary, #f8f9fa)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  taxPresetBtnActive: {
    background: 'var(--accent-light)',
    border: '1px solid var(--accent-primary)',
    color: 'var(--accent-primary)',
  },
  amountSummary: {
    padding: '12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    marginTop: '8px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  summaryRowTotal: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-color, #e9ecef)',
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  summaryTotal: {
    color: 'var(--accent-primary)',
    fontWeight: '700',
  },
  simpleAmountDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
    marginTop: '12px',
  },
  simpleAmountLabel: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  simpleAmountValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--accent-primary)',
  },
  // Amount description styles for Step 4
  amountDescriptionList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    padding: '12px',
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: '8px',
  },
  amountDescriptionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  amountDescriptionAmount: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    minWidth: '70px',
    flexShrink: 0,
  },
  amountDescriptionInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '6px',
    background: 'var(--input-bg, white)',
    color: 'var(--text-primary)',
  },
  taxLabel: {
    fontSize: '13px',
    fontStyle: 'italic' as const,
    color: 'var(--text-secondary)',
    minWidth: '70px',
    flexShrink: 0,
  },
  taxValue: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  saveAndAddAnotherBtn: {
    width: '100%',
    marginTop: '20px',
    padding: '14px 20px',
    fontSize: '15px',
    fontWeight: '600',
    border: '2px dashed var(--accent-primary)',
    borderRadius: '10px',
    background: 'var(--accent-light, rgba(139, 92, 246, 0.1))',
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
};

export default StepByStepExpenseForm;
