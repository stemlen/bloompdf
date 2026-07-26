/**
 * removePages.ts
 * Core logic for removing pages from a PDF document using pdf-lib.
 */
import { PDFDocument } from 'pdf-lib';

/**
 * Removes the specified page indices from the PDF document and returns the new PDF bytes.
 * 
 * @param file The original PDF file
 * @param pagesToRemoveIndices Array of 0-based page indices to remove
 * @returns Uint8Array of the modified PDF
 */
export async function removePagesFromPDF(
  file: File, 
  pagesToRemoveIndices: number[]
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  
  // Sort indices in descending order so removing a page doesn't shift the indices 
  // of the remaining pages we want to remove.
  const sortedIndices = [...pagesToRemoveIndices].sort((a, b) => b - a);
  
  for (const index of sortedIndices) {
    pdfDoc.removePage(index);
  }
  
  return await pdfDoc.save();
}
