import { blobToCanvas, blobToDataUrl } from './receiptOcrImage';
import type { ReceiptOcrEngineResult } from './receiptOcrService';

let paddleServicePromise: Promise<any> | null = null;

const getPaddleService = async (): Promise<any> => {
  if (!paddleServicePromise) {
    paddleServicePromise = (async () => {
      const paddleModule = await import('ppu-paddle-ocr/web');
      const PaddleOcrService = (paddleModule as Record<string, any>).PaddleOcrService;
      if (typeof PaddleOcrService !== 'function') {
        throw new Error('PaddleOCR browser service is unavailable');
      }

      const service = new PaddleOcrService({
        processing: { engine: 'canvas-native' },
        debugging: { debug: false, verbose: false },
      });

      await service.initialize();
      return service;
    })().catch((error) => {
      paddleServicePromise = null;
      throw error;
    });
  }

  return paddleServicePromise;
};

const runWithTiming = async (
  provider: ReceiptOcrEngineResult['provider'],
  runner: () => Promise<{ text?: string; confidence?: number }>,
): Promise<ReceiptOcrEngineResult> => {
  const start = Date.now();
  const response = await runner();
  return {
    provider,
    text: response.text || '',
    confidence: typeof response.confidence === 'number' ? response.confidence : undefined,
    elapsedMs: Math.max(0, Date.now() - start),
  };
};

export const runTesseractReceiptOcr = async (
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<ReceiptOcrEngineResult> => {
  return await runWithTiming('tesseract', async () => {
    const { recognize } = await import('tesseract.js');
    const dataUrl = await blobToDataUrl(image);
    const result = await recognize(dataUrl, 'eng+chi_sim+chi_tra', {
      logger: (message: { status?: string; progress?: number }) => {
        if (typeof message.progress === 'number' && onProgress) {
          onProgress(Math.max(0, Math.min(1, message.progress)));
        }
      },
    });

    return {
      text: result.data.text || '',
      confidence: result.data.confidence,
    };
  });
};

export const runPaddleReceiptOcr = async (
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<ReceiptOcrEngineResult> => {
  return await runWithTiming('paddle', async () => {
    const service = await getPaddleService();
    const canvas = await blobToCanvas(image);
    const result = await service.recognize(canvas, {
      onProgress: (event: { type?: string; stage?: string; progress?: number }) => {
        if (typeof event.progress === 'number' && onProgress) {
          onProgress(Math.max(0, Math.min(1, event.progress)));
        }
      },
    });

    return {
      text: result?.text || '',
      confidence: typeof result?.confidence === 'number' ? result.confidence : undefined,
    };
  });
};

export const resetReceiptOcrPaddleService = async (): Promise<void> => {
  if (!paddleServicePromise) {
    return;
  }

  const service = await paddleServicePromise.catch(() => null);
  if (service && typeof service.destroy === 'function') {
    await service.destroy();
  }
  paddleServicePromise = null;
};
