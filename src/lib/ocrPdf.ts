/**
 * ocrPdf.ts
 * Client-side OCR using Tesseract.js + pdfjs-dist + pdf-lib.
 *
 * Workflow:
 *  1. Render each requested PDF page to a canvas via pdfjs-dist
 *  2. Run Tesseract OCR on the canvas image
 *  3. In "searchable PDF" mode: embed the original page image + invisible text layer via pdf-lib
 *  4. In "extract text" mode: concatenate recognized text and return as .txt
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { loadPdfForRendering, renderPageToDataURL } from "./pdfRender";
import * as pdfjsLib from "pdfjs-dist";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OCROutputMode = "searchable-pdf" | "extract-text";
export type OCRLanguage = "eng" | "fra" | "deu" | "spa" | "ita" | "por" | "jpn" | "chi_sim" | "kor" | "ara";

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number; // left in canvas px
    y0: number; // top in canvas px
    x1: number; // right in canvas px
    y1: number; // bottom in canvas px
  };
}

export interface OCRPageResult {
  pageNumber: number;     // 1-indexed
  text: string;           // recognized text
  confidence: number;     // 0-100
  imageDataUrl: string;   // rendered page image
  width: number;          // canvas width (px)
  height: number;         // canvas height (px)
  pdfWidth: number;       // PDF page width (pt)
  pdfHeight: number;      // PDF page height (pt)
  words: OCRWord[];       // word bounding boxes from OCR engine
}

export interface OCRResult {
  pages: OCRPageResult[];
  averageConfidence: number;
  outputMode: OCROutputMode;
  /** present if outputMode === "searchable-pdf" */
  pdfBytes?: Uint8Array;
  /** present if outputMode === "extract-text" */
  textContent?: string;
}

export interface OCREnhancementOptions {
  autoEnhance: boolean;
  deskew: boolean;       // Note: full deskew requires CV libs; we apply canvas brightness/contrast
  removeNoise: boolean;  // Slight blur + threshold
  increaseContrast: boolean;
}

export interface OCRProgressEvent {
  phase: "rendering" | "ocr" | "building";
  page: number;
  totalPages: number;
  pageText?: string;
  confidence?: number;
  pct: number;           // 0-100 overall
}

// ─── Image enhancement ───────────────────────────────────────────────────────

/**
 * Apply canvas-based image enhancements before OCR.
 * Returns a new ImageData with the enhancements applied.
 */
function enhanceImageData(
  imageData: ImageData,
  opts: OCREnhancementOptions
): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const { width, height } = imageData;

  if (opts.increaseContrast || opts.autoEnhance) {
    // Stretch histogram contrast
    let min = 255, max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }
    const range = max - min || 1;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, ((data[i] - min) / range) * 255);
      data[i + 1] = Math.min(255, ((data[i + 1] - min) / range) * 255);
      data[i + 2] = Math.min(255, ((data[i + 2] - min) / range) * 255);
    }
  }

  if (opts.removeNoise || opts.autoEnhance) {
    // Simple binarize: pixels closer to white stay white, darker go darker
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const val = gray > 160 ? 255 : Math.max(0, gray - 20);
      data[i] = data[i + 1] = data[i + 2] = val;
    }
  }

  return new ImageData(data, width, height);
}

/**
 * Render a PDF page to a high-res canvas suitable for OCR.
 * Returns the canvas element, image data, and PDF page dimensions.
 */
async function renderPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number = 2.0,
  opts: OCREnhancementOptions
): Promise<{
  canvas: HTMLCanvasElement;
  dataUrl: string;
  pdfWidth: number;
  pdfHeight: number;
}> {
  const page = await pdfDoc.getPage(pageNumber);
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;

  // White background (scanned pages may have transparency)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport } as any).promise;

  // Apply enhancements
  if (opts.autoEnhance || opts.increaseContrast || opts.removeNoise) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const enhanced = enhanceImageData(imageData, opts);
    ctx.putImageData(enhanced, 0, 0);
  }

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  return {
    canvas,
    dataUrl,
    pdfWidth: unscaledViewport.width,
    pdfHeight: unscaledViewport.height,
  };
}

// ─── Tesseract worker pool ────────────────────────────────────────────────────

let _worker: import("tesseract.js").Worker | null = null;
let _workerLang = "";

async function getWorker(lang: OCRLanguage): Promise<import("tesseract.js").Worker> {
  const { createWorker } = await import("tesseract.js");

  if (_worker && _workerLang === lang) return _worker;

  // Terminate old worker if language changes
  if (_worker) {
    await _worker.terminate();
    _worker = null;
  }

  const worker = await createWorker(lang, 1, {
    // Use CDN for WASM + trained data to avoid bundling issues
    workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/worker.min.js`,
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
    corePath: `https://cdn.jsdelivr.net/npm/tesseract.js-core@6/tesseract-core-simd-lstm.wasm.js`,
    cacheMethod: "write",
    logger: () => { }, // silence verbose logs
  });

  _worker = worker;
  _workerLang = lang;
  return worker;
}

export async function terminateOCRWorker(): Promise<void> {
  if (_worker) {
    await _worker.terminate();
    _worker = null;
    _workerLang = "";
  }
}

// ─── Core OCR function ────────────────────────────────────────────────────────

export const OCR_LANGUAGES: { value: OCRLanguage; label: string; flag: string }[] = [
  { value: "eng", label: "English", flag: "🇺🇸" },
  { value: "fra", label: "French", flag: "🇫🇷" },
  { value: "deu", label: "German", flag: "🇩🇪" },
  { value: "spa", label: "Spanish", flag: "🇪🇸" },
  { value: "ita", label: "Italian", flag: "🇮🇹" },
  { value: "por", label: "Portuguese", flag: "🇧🇷" },
  { value: "jpn", label: "Japanese", flag: "🇯🇵" },
  { value: "chi_sim", label: "Chinese (Simplified)", flag: "🇨🇳" },
  { value: "kor", label: "Korean", flag: "🇰🇷" },
  { value: "ara", label: "Arabic", flag: "🇸🇦" },
];

/**
 * Run OCR on selected pages of a PDF file.
 *
 * @param file         The source PDF File
 * @param pageNumbers  1-indexed page numbers to process (empty = all pages)
 * @param language     Tesseract language code
 * @param outputMode   "searchable-pdf" | "extract-text"
 * @param enhancement  Image pre-processing options
 * @param onProgress   Progress callback
 */
export async function runOCR(
  file: File,
  pageNumbers: number[],
  language: OCRLanguage,
  outputMode: OCROutputMode,
  enhancement: OCREnhancementOptions,
  onProgress: (event: OCRProgressEvent) => void
): Promise<OCRResult> {
  // 1. Load PDF
  const pdfDoc = await loadPdfForRendering(file);
  const totalPages = pdfDoc.numPages;
  const pages = pageNumbers.length > 0 ? pageNumbers : Array.from({ length: totalPages }, (_, i) => i + 1);
  const n = pages.length;

  // 2. Get Tesseract worker
  const worker = await getWorker(language);

  const pageResults: OCRPageResult[] = [];

  for (let i = 0; i < n; i++) {
    const pageNum = pages[i];
    const overallBase = (i / n) * 90; // reserve last 10% for PDF build

    // --- Render phase ---
    onProgress({ phase: "rendering", page: pageNum, totalPages: n, pct: Math.round(overallBase) });

    const { canvas, dataUrl, pdfWidth, pdfHeight } = await renderPageToCanvas(pdfDoc, pageNum, 2.0, enhancement);

    // --- OCR phase ---
    onProgress({ phase: "ocr", page: pageNum, totalPages: n, pct: Math.round(overallBase + (0.4 / n) * 90) });

    const { data } = await worker.recognize(canvas);
    const pageData = data as any;

    const rawWords: any[] =
      pageData.words ||
      pageData.blocks?.flatMap((b: any) =>
        b.paragraphs?.flatMap((p: any) =>
          p.lines?.flatMap((l: any) => l.words || [])
        )
      ) ||
      [];

    const words: OCRWord[] = rawWords.map((w: any) => ({
      text: w.text,
      confidence: Math.round(w.confidence || 0),
      bbox: {
        x0: w.bbox?.x0 ?? 0,
        y0: w.bbox?.y0 ?? 0,
        x1: w.bbox?.x1 ?? 0,
        y1: w.bbox?.y1 ?? 0,
      },
    }));

    pageResults.push({
      pageNumber: pageNum,
      text: data.text,
      confidence: Math.round(data.confidence),
      imageDataUrl: dataUrl,
      width: canvas.width,
      height: canvas.height,
      pdfWidth,
      pdfHeight,
      words,
    });

    onProgress({
      phase: "ocr",
      page: pageNum,
      totalPages: n,
      pageText: data.text.slice(0, 200),
      confidence: Math.round(data.confidence),
      pct: Math.round(((i + 1) / n) * 90),
    });
  }

  const avgConf =
    pageResults.length > 0
      ? Math.round(pageResults.reduce((s, r) => s + r.confidence, 0) / pageResults.length)
      : 0;

  // 3. Build output
  onProgress({ phase: "building", page: 0, totalPages: n, pct: 92 });

  if (outputMode === "extract-text") {
    const textContent = pageResults
      .map((r) => `--- Page ${r.pageNumber} ---\n${r.text.trim()}`)
      .join("\n\n");

    onProgress({ phase: "building", page: 0, totalPages: n, pct: 100 });
    return { pages: pageResults, averageConfidence: avgConf, outputMode, textContent };
  }

  // Build searchable PDF: embed page images + invisible text overlay
  const outPdf = await (await import("pdf-lib")).PDFDocument.create();
  const helvetica = await outPdf.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageResults.length; i++) {
    const result = pageResults[i];
    const { pdfWidth, pdfHeight, width: canvasW, height: canvasH, words } = result;

    const scaleX = pdfWidth / canvasW;
    const scaleY = pdfHeight / canvasH;

    // Embed the rendered image
    const imgBytes = dataURLtoBytes(result.imageDataUrl);
    const embeddedImg = await outPdf.embedJpg(imgBytes);

    const page = outPdf.addPage([pdfWidth, pdfHeight]);

    // Draw the image filling the page
    page.drawImage(embeddedImg, { x: 0, y: 0, width: pdfWidth, height: pdfHeight });

    // Draw invisible text overlay precisely aligned over each word
    for (const word of words) {
      const textStr = word.text.trim();
      if (!textStr) continue;

      const boxW = (word.bbox.x1 - word.bbox.x0) * scaleX;
      const boxH = (word.bbox.y1 - word.bbox.y0) * scaleY;
      if (boxW <= 0 || boxH <= 0) continue;

      const pdfX = word.bbox.x0 * scaleX;
      // In PDF coordinate space (origin at bottom-left):
      // Align baseline: font ascender fits inside box, descender (~18%) sits at bottom of box
      const pdfY = pdfHeight - (word.bbox.y1 * scaleY) + (boxH * 0.18);
      // Calculate font size respecting height and max character width constraint so glyphs don't spill
      const heightFontSize = boxH * 0.88;
      const widthFontSize = boxW / Math.max(1, textStr.length * 0.52);
      const fontSize = Math.max(2, Math.min(heightFontSize, widthFontSize));

      try {
        page.drawText(textStr, {
          x: pdfX,
          y: pdfY,
          size: fontSize,
          font: helvetica,
          color: rgb(0, 0, 0),
          opacity: 0.0001, // Invisible searchable/selectable text
        });
      } catch {
        // Skip characters/words that standard Helvetica cannot encode (e.g. CJK/Arabic)
      }
    }

    onProgress({ phase: "building", page: result.pageNumber, totalPages: n, pct: 92 + Math.round((i / n) * 8) });
  }

  const pdfBytes = await outPdf.save();
  onProgress({ phase: "building", page: 0, totalPages: n, pct: 100 });

  return { pages: pageResults, averageConfidence: avgConf, outputMode, pdfBytes };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dataURLtoBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

interface WordBox { text: string; x: number; y: number; w: number; h: number; }

/**
 * Generate simple uniform word boxes by splitting text into lines/words
 * and distributing them evenly across the page.
 * This is a best-effort approach since Tesseract.js v6 bboxes are image-space.
 */
function rerenderWordsWithBoxes(text: string, pageWidth: number, pageHeight: number): WordBox[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const lineHeight = Math.max(12, pageHeight / Math.max(lines.length, 1));
  const words: WordBox[] = [];

  lines.forEach((line, lineIdx) => {
    const lineWords = line.split(/\s+/).filter(Boolean);
    const y = lineIdx * lineHeight;
    const xStep = lineWords.length > 0 ? pageWidth / lineWords.length : pageWidth;
    lineWords.forEach((word, wordIdx) => {
      words.push({
        text: word,
        x: wordIdx * xStep,
        y,
        w: xStep,
        h: lineHeight * 0.85,
      });
    });
  });

  return words;
}

/** Trigger a browser download for text content */
export function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Trigger a browser download for PDF bytes */
export function downloadPDFBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
