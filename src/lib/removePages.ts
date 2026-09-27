/**
 * removePages.ts
 * Core logic for removing pages from a PDF document using @cantoo/pdf-lib.
 */
import { PDFDocument } from '@cantoo/pdf-lib';
import { buildPdfWithPages } from './pdfPageCopy';

/**
 * Removes the specified page indices from the PDF document and returns the new PDF bytes.
 * The kept pages are copied into a fresh document so the removed pages' content
 * (images, fonts, streams) is not carried along in the output.
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
  const pdfDoc = await PDFDocument.load(arrayBuffer, { password: "" });

  const remove = new Set(pagesToRemoveIndices);
  const keep = pdfDoc.getPageIndices().filter((i) => !remove.has(i));
  if (keep.length === 0) throw new Error("You can't remove every page of the document.");

  return buildPdfWithPages(pdfDoc, keep);
}
