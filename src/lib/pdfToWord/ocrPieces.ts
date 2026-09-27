/**
 * Turns Tesseract word boxes (from ocrPdf.ts) into positioned text pieces in
 * PDF points, removing page skew so words of one line share a baseline.
 */
import type { OCRPageResult } from "../ocrPdf";
import type { TextPiece } from "./types";

/** Median baseline slope between neighbouring words on the same line. */
export function estimateSkew(words: OCRPageResult["words"]): number {
  const slopes: number[] = [];
  for (let i = 1; i < words.length; i++) {
    const a = words[i - 1];
    const b = words[i];
    const ha = a.bbox.y1 - a.bbox.y0;
    const hb = b.bbox.y1 - b.bbox.y0;
    const h = Math.max(ha, hb);
    const dx = (b.bbox.x0 + b.bbox.x1) / 2 - (a.bbox.x0 + a.bbox.x1) / 2;
    if (b.bbox.x0 < a.bbox.x1 - 2 || dx <= h || b.bbox.x0 - a.bbox.x1 > 3 * h) continue; // not a same-line neighbour
    if (Math.abs(ha - hb) > 0.5 * h) continue;
    const ya = a.baselineY ?? a.bbox.y1;
    const yb = b.baselineY ?? b.bbox.y1;
    const s = (yb - ya) / dx;
    if (Math.abs(s) < 0.2) slopes.push(s);
  }
  if (slopes.length < 5) return 0;
  slopes.sort((x, y) => x - y);
  return slopes[slopes.length >> 1];
}

export function ocrPagePieces(res: OCRPageResult, minConfidence = 10): TextPiece[] {
  const sx = res.pdfWidth / res.width;
  const sy = res.pdfHeight / res.height;
  const words = res.words.filter((w) => w.text.trim() && w.confidence >= minConfidence);
  const slope = estimateSkew(words);
  return words.map((w) => {
    const h = w.bbox.y1 - w.bbox.y0;
    const cx = (w.bbox.x0 + w.bbox.x1) / 2;
    const base = (w.baselineY ?? w.bbox.y1 - 0.2 * h) - slope * cx;
    const lineH = w.lineHeight ?? h;
    return {
      str: w.text.trim(),
      x: w.bbox.x0 * sx,
      y: base * sy,
      w: Math.max(1, (w.bbox.x1 - w.bbox.x0) * sx),
      fs: Math.max(4, lineH * sy * 0.85),
      bold: false,
      italic: false,
    };
  });
}
