/**
 * rotatePdf.ts
 * Client-side PDF rotation using pdf-lib.
 * Supports rotating individual pages or all pages at once.
 * All processing happens entirely in the browser.
 */

import { PDFDocument, degrees } from "@cantoo/pdf-lib";

/** Allowed rotation angles in degrees (clockwise). */
export type RotationAngle = 90 | 180 | 270;

/**
 * Per-page rotation instruction.
 * `pageIndex` is 0-based.
 * `angle` is the amount to ADD to the page's existing rotation (clockwise degrees).
 */
export interface PageRotation {
  pageIndex: number;
  angle: RotationAngle;
}

/**
 * Rotates the specified pages of a PDF by the given angles and returns the
 * new PDF as a Uint8Array.
 *
 * The rotation is ADDITIVE: it is added on top of whatever existing rotation
 * the page already has in the PDF dictionary, so the visual result is always
 * correct.
 *
 * @param file            The original PDF File object
 * @param pageRotations   Array of { pageIndex, angle } instructions
 * @returns               Uint8Array of the modified PDF bytes
 */
export async function rotatePDFPages(
  file: File,
  pageRotations: PageRotation[]
): Promise<Uint8Array> {
  if (pageRotations.length === 0) {
    throw new Error("No pages specified for rotation.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { password: "" });
  const pages = pdfDoc.getPages();

  for (const { pageIndex, angle } of pageRotations) {
    if (pageIndex < 0 || pageIndex >= pages.length) {
      console.warn(`rotatePDFPages: pageIndex ${pageIndex} is out of bounds, skipping.`);
      continue;
    }
    const page = pages[pageIndex];
    // pdf-lib's `setRotation` expects the FINAL absolute rotation.
    // We read the current rotation and add to it.
    const currentRotation = page.getRotation().angle;
    const newRotation = (currentRotation + angle) % 360;
    page.setRotation(degrees(newRotation));
  }

  return await pdfDoc.save({ useObjectStreams: false });
}
