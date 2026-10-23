export interface PreparedReceiptContent {
  name: string; originalName: string; contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  byteSize: number; originalByteSize: number; optimized: boolean; sha256: string; contentBase64: string;
}
export interface ReceiptAttachment extends Omit<PreparedReceiptContent, 'contentBase64'> {
  id: string; userId: string; expenseId: string; provider: 'firestore'; archived: boolean;
  createdAt?: Date; updatedAt?: Date;
}
export type ReceiptAttachmentCreate = ReceiptAttachment & Pick<PreparedReceiptContent, 'contentBase64'>;
