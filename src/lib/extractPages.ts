/**
 * extractPages.ts
 * Client-side PDF page extraction using @cantoo/pdf-lib.
 * Supports multiple extraction modes with 100% lossless vector quality.
 */

import { PDFDocument } from "@cantoo/pdf-lib";

export interface SplitRange {
  start: number; // 1-indexed inclusive
  end: number;   // 1-indexed inclusive
}

export interface GeneratedFile {
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}

// ─── Range parsers ────────────────────────────────────────────────────────────

/**
 * Parses a mixed range string like "1-5, 8, 10-12" into SplitRange[].
 * Returns an error string on invalid input.
 */
export function parseRangeInput(
  input: string,
  totalPages: number
): SplitRange[] | string {
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return "Please enter at least one page or range.";

  const ranges: SplitRange[] = [];
  for (const part of parts) {
    const match = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!match)
      return `Invalid format "${part}". Use "1-5" for a range or "3" for a single page.`;

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;

    if (start < 1 || start > totalPages)
      return `Page ${start} is out of range (document has ${totalPages} pages).`;
    if (end < 1 || end > totalPages)
      return `Page ${end} is out of range (document has ${totalPages} pages).`;
    if (start > end)
      return `Start page (${start}) cannot be greater than end page (${end}).`;

    ranges.push({ start, end });
  }
  return ranges;
}

/**
 * Generates consecutive chunk ranges every `n` pages.
 */
export function generateSizeRanges(
  n: number,
  totalPages: number
): SplitRange[] | string {
  if (!Number.isInteger(n) || n < 1)
    return "Pages per chunk must be a whole number ≥ 1.";
  if (n >= totalPages)
    return `Chunk size (${n}) must be less than the total page count (${totalPages}).`;

  const ranges: SplitRange[] = [];
  for (let i = 1; i <= totalPages; i += n) {
    ranges.push({ start: i, end: Math.min(i + n - 1, totalPages) });
  }
  return ranges;
}

/** Expands a SplitRange[] into a deduplicated, sorted list of 1-indexed page numbers. */
export function expandRangesToPages(ranges: SplitRange[]): number[] {
  const set = new Set<number>();
  for (const { start, end } of ranges) {
    for (let p = start; p <= end; p++) set.add(p);
  }
  return [...set].sort((a, b) => a - b);
}

async function loadDoc(arrayBuffer: ArrayBuffer, password = ""): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(arrayBuffer, { password });
  } catch (err: any) {
    const msg = String(err?.message || "").toLowerCase();
    if (msg.includes("password") || msg.includes("encrypt")) {
      if (password !== "") {
        return await PDFDocument.load(arrayBuffer, { password: "" });
      }
    }
    throw err;
  }
}

// ─── Native Extraction ────────────────────────────────────────────────────────

export async function extractPages(
  file: File,
  ranges: SplitRange[],
  merge: boolean,
  onProgress?: (pct: number) => void
): Promise<GeneratedFile[]> {
  if (ranges.length === 0) throw new Error("No page ranges specified.");

  const arrayBuffer = await file.arrayBuffer();
  const baseName = file.name.replace(/\.pdf$/i, "");

  if (merge) {
    const pageNums = expandRangesToPages(ranges);
    const pageSet = new Set(pageNums);
    const doc = await loadDoc(arrayBuffer, "");
    const totalPages = doc.getPageCount();

    const pagesToRemove: number[] = [];
    for (let p = 0; p < totalPages; p++) {
      if (!pageSet.has(p + 1)) {
        pagesToRemove.push(p);
      }
    }

    pagesToRemove.sort((a, b) => b - a);
    for (const pageIdx of pagesToRemove) {
      doc.removePage(pageIdx);
    }

    const bytes = await doc.save({ useObjectStreams: false });
    const label =
      pageNums.length === 1
        ? `p${pageNums[0]}`
        : `p${pageNums[0]}-${pageNums[pageNums.length - 1]}`;

    onProgress?.(100);

    return [
      {
        name: `${baseName}_extracted_${label}.pdf`,
        bytes,
        pageCount: pageNums.length,
      },
    ];
  } else {
    const results: GeneratedFile[] = [];

    for (let i = 0; i < ranges.length; i++) {
      const { start, end } = ranges[i];
      const doc = await loadDoc(arrayBuffer, "");
      const totalPages = doc.getPageCount();

      const pagesToRemove: number[] = [];
      for (let p = 0; p < totalPages; p++) {
        const pageNum = p + 1;
        if (pageNum < start || pageNum > end) {
          pagesToRemove.push(p);
        }
      }

      pagesToRemove.sort((a, b) => b - a);
      for (const pageIdx of pagesToRemove) {
        doc.removePage(pageIdx);
      }

      const bytes = await doc.save({ useObjectStreams: false });
      const nameSuffix = start === end ? `p${start}` : `p${start}-${end}`;

      results.push({
        name: `${baseName}_${nameSuffix}.pdf`,
        bytes,
        pageCount: end - start + 1,
      });

      onProgress?.(Math.round(((i + 1) / ranges.length) * 100));
    }

    return results;
  }
}
