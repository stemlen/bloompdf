/**
 * organizePdf.ts
 * Client-side PDF page organization using pdf-lib.
 * Supports reordering, rotating, deleting, and inserting blank pages.
 */

import { PDFDocument, degrees, PageSizes } from "@cantoo/pdf-lib";

export type RotationAngle = 0 | 90 | 180 | 270;

export interface PageOperation {
  /** Unique ID for the operation, useful for React rendering but not needed by pdf-lib */
  id: string;
  /** Whether this page is from the original document or a new blank page */
  type: "original" | "blank";
  /** The 0-based index of the page in the original document (if type === "original") */
  originalIndex?: number;
  /** Additive rotation to apply to this page */
  rotation: RotationAngle;
}

/**
 * Organizes a PDF according to a list of PageOperations.
 * 
 * @param file The original PDF File object
 * @param operations Array of PageOperation defining the new document structure
 * @returns Uint8Array of the newly generated PDF bytes
 */
export async function organizePDF(
  file: File,
  operations: PageOperation[]
): Promise<Uint8Array> {
  if (operations.length === 0) {
    throw new Error("The organized PDF must contain at least one page.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { password: "" });
  const sourcePages = sourcePdf.getPages();
  
  const newPdf = await PDFDocument.create();

  for (const op of operations) {
    if (op.type === "original") {
      if (op.originalIndex === undefined || op.originalIndex < 0 || op.originalIndex >= sourcePages.length) {
        console.warn(`organizePDF: Invalid originalIndex ${op.originalIndex}, skipping.`);
        continue;
      }
      
      // Copy the page from the source document
      const [copiedPage] = await newPdf.copyPages(sourcePdf, [op.originalIndex]);
      
      // Apply additive rotation
      if (op.rotation !== 0) {
        const currentRotation = copiedPage.getRotation().angle;
        const newRotation = (currentRotation + op.rotation) % 360;
        copiedPage.setRotation(degrees(newRotation));
      }
      
      newPdf.addPage(copiedPage);
    } else if (op.type === "blank") {
      // Add a standard blank A4 page (portrait)
      const blankPage = newPdf.addPage(PageSizes.A4);
      
      if (op.rotation !== 0) {
         blankPage.setRotation(degrees(op.rotation));
      }
    }
  }

  return await newPdf.save();
}
