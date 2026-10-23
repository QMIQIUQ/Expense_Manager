import type { PreparedReceiptContent } from '../types/receiptAttachment';
import { loadImageFromBlob, blobToDataUrl } from '../services/receiptOcrImage';
export const MAX_RECEIPT_BYTES = 600 * 1024;
export const MAX_RECEIPT_INPUT_BYTES = 10 * 1024 * 1024;
export const receiptContentHash = async (bytes: Uint8Array): Promise<string> => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer))].map((value) => value.toString(16).padStart(2, '0')).join('');
export const sniffReceiptContentType = (bytes: Uint8Array): PreparedReceiptContent['contentType'] | undefined => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)) return 'image/png';
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  if (String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-') return 'application/pdf';
  return undefined;
};
export const decodeReceiptContent = (value: string): Uint8Array => {
  const binary = atob(value); const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
};
export const validateReceiptContent = async (content: Pick<PreparedReceiptContent, 'contentBase64' | 'byteSize' | 'sha256' | 'contentType'>): Promise<Blob> => {
  if (!Number.isInteger(content.byteSize) || content.byteSize <= 0 || content.byteSize > MAX_RECEIPT_BYTES || typeof content.contentBase64 !== 'string' || content.contentBase64.length > Math.ceil(MAX_RECEIPT_BYTES / 3) * 4) throw new Error('Receipt exceeds the 600 KiB stored-file limit');
  const bytes = decodeReceiptContent(content.contentBase64);
  if (bytes.length !== content.byteSize || sniffReceiptContentType(bytes) !== content.contentType || await receiptContentHash(bytes) !== content.sha256) throw new Error('Receipt content does not match its checksum or file type');
  return new Blob([new Uint8Array(bytes).buffer], { type: content.contentType });
};
export const prepareReceiptContent = async (input: Blob, fileName: string): Promise<PreparedReceiptContent> => {
  if (!input.size || input.size > MAX_RECEIPT_INPUT_BYTES) throw new Error('Choose a non-empty receipt smaller than 10 MiB');
  const header = new Uint8Array(await input.slice(0, 12).arrayBuffer());
  let contentType = sniffReceiptContentType(header);
  if (!contentType) throw new Error('Use a JPEG, PNG, WebP image or PDF receipt');
  let image: HTMLImageElement | undefined;
  if (contentType !== 'application/pdf') {
    image = await loadImageFromBlob(input);
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('Receipt image dimensions are too large');
  }
  let output = input; let optimized = false;
  if (contentType !== 'application/pdf' && input.size > MAX_RECEIPT_BYTES) {
    if (!image) throw new Error('Receipt image is unavailable');
    for (const maxWidth of [1600, 1400, 1200]) {
      const ratio = Math.min(1, maxWidth / image.naturalWidth, 6000 / image.naturalHeight);
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext('2d'); if (!context) throw new Error('Unable to compress this receipt image');
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.86, 0.72, 0.58]) {
        output = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Receipt compression failed')), 'image/jpeg', quality));
        if (output.size <= MAX_RECEIPT_BYTES) break;
      }
      if (output.size <= MAX_RECEIPT_BYTES) break;
    }
    contentType = 'image/jpeg'; optimized = true;
  }
  if (output.size > MAX_RECEIPT_BYTES) throw new Error('Receipt is still above 600 KiB. Crop the image or choose a smaller PDF');
  const originalName = Array.from(fileName, (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === '/' || character === String.fromCharCode(92) ? '_' : character).join('').slice(0, 120) || 'receipt';
  const extension = contentType === 'image/jpeg' ? '.jpg' : contentType === 'image/png' ? '.png' : contentType === 'image/webp' ? '.webp' : '.pdf';
  const name = originalName.replace(/\.[^.]+$/, '') + extension;
  const contentBase64 = (await blobToDataUrl(output)).split(',')[1];
  const prepared: PreparedReceiptContent = { name, originalName, contentType, byteSize: output.size, originalByteSize: input.size, optimized, sha256: await receiptContentHash(new Uint8Array(await output.arrayBuffer())), contentBase64 };
  await validateReceiptContent(prepared);
  return prepared;
};
