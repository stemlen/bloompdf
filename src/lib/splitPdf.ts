/**
 * splitPdf.ts
 * Client-side PDF splitting using pdf-lib.
 * All processing happens in the browser.
 */

import { PDFDocument } from "pdf-lib";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export interface SplitRange {
  start: number; // 1-indexed
  end: number;   // 1-indexed
}

export interface GeneratedFile {
  name: string;
  bytes: Uint8Array;
}

export function validatePDFFile(file: File): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return `"${file.name}" is not a valid PDF file.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" exceeds the maximum file size of 50 MB.`;
  }
  return null;
}

/**
 * Returns the total number of pages in a PDF file.
 */
export async function getPDFPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}

/**
 * Parses custom ranges like "1-5, 8-10"
 */
export function parseCustomRanges(input: string, totalPages: number): SplitRange[] | string {
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return "Please enter at least one range.";

  const ranges: SplitRange[] = [];
  for (const part of parts) {
    const match = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) return `Invalid format in "${part}". Use formats like "1-5" or "3".`;

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;

    if (start < 1 || start > totalPages) return `Page number ${start} is out of bounds (1-${totalPages}).`;
    if (end < 1 || end > totalPages) return `Page number ${end} is out of bounds (1-${totalPages}).`;
    if (start > end) return `Start page (${start}) cannot be greater than end page (${end}).`;

    ranges.push({ start, end });
  }

  return ranges;
}

/**
 * Parses specific pages like "1, 3, 5"
 */
export function parseSpecificPages(input: string, totalPages: number): SplitRange[] | string {
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return "Please enter at least one page number.";

  const ranges: SplitRange[] = [];
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num)) return `Invalid page number "${part}".`;
    if (num < 1 || num > totalPages) return `Page number ${num} is out of bounds (1-${totalPages}).`;

    ranges.push({ start: num, end: num });
  }

  return ranges;
}

/**
 * Generates ranges splitting the document every N pages
 */
export function generateFixedRanges(pagesPerSplit: number, totalPages: number): SplitRange[] | string {
  if (pagesPerSplit < 1) return "Pages per split must be at least 1.";
  
  const ranges: SplitRange[] = [];
  for (let i = 1; i <= totalPages; i += pagesPerSplit) {
    const end = Math.min(i + pagesPerSplit - 1, totalPages);
    ranges.push({ start: i, end });
  }
  return ranges;
}

/**
 * Converts a source PDF into multiple PDFs based on the provided ranges.
 */
export async function splitPDF(
  file: File,
  ranges: SplitRange[],
  onProgress?: (pct: number) => void
): Promise<GeneratedFile[]> {
  if (ranges.length === 0) throw new Error("No ranges provided for splitting.");

  const arrayBuffer = await file.arrayBuffer();
  // ignoreEncryption allows reading if no password is required, 
  // but if it's password protected it will throw. We'll let it throw.
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  
  const results: GeneratedFile[] = [];
  
  for (let i = 0; i < ranges.length; i++) {
    const { start, end } = ranges[i];
    const newPdf = await PDFDocument.create();
    
    // Convert 1-indexed to 0-indexed indices array
    const pageIndices = [];
    for (let p = start; p <= end; p++) {
      pageIndices.push(p - 1);
    }
    
    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    
    const bytes = await newPdf.save();
    
    const baseName = file.name.replace(/\.pdf$/i, "");
    let fileName = `${baseName}_${start}`;
    if (start !== end) {
      fileName += `-${end}`;
    }
    fileName += ".pdf";
    
    results.push({ name: fileName, bytes });
    
    onProgress?.(Math.round(((i + 1) / ranges.length) * 100));
  }
  
  return results;
}

/**
 * Triggers a browser download for the generated PDF bytes.
 */
export function downloadFile(bytes: Uint8Array, filename: string): void {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([buffer as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
