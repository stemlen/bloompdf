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

// Same pdf-lib fork as unicodeText.ts (objects must come from one library copy).
import { PDFDocument, StandardFonts, type PDFPage } from "@cantoo/pdf-lib";
import type { Block, Line, Word } from "tesseract.js";
import { loadPdfForRendering } from "./pdfRender";
import * as pdfjsLib from "pdfjs-dist";
import { createUnicodeTextRenderer, type UnicodeTextRenderer } from "./unicodeText";

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
  /** Baseline y (canvas px) at the word's horizontal centre, when Tesseract reports one. */
  baselineY?: number;
  /** Height of the text line the word belongs to (canvas px). */
  lineHeight?: number;
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
  /** Number of words written into the invisible text layer (searchable-pdf mode). */
  textLayerWords?: number;
  /** Set when recognised words could not be written to the text layer (e.g. non-Latin scripts). */
  textLayerWarning?: string;
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

  await page.render({ canvasContext: ctx, viewport } as unknown as Parameters<typeof page.render>[0]).promise;

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

    // tesseract.js v5+ only returns the block/paragraph/line/word tree when
    // it is explicitly requested; without `blocks: true` there are no word
    // boxes and the searchable PDF ends up with an empty text layer.
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
    const words = extractWords(data.blocks);

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
  const outPdf = await PDFDocument.create();
  const helvetica = await outPdf.embedFont(StandardFonts.Helvetica);
  // Latin words use Helvetica; other scripts (e.g. Arabic) load a bundled
  // Noto font (+ HarfBuzz for shaping) on demand.
  const allWords = pageResults.flatMap((r) => r.words.map((w) => w.text.normalize("NFC")));
  const renderer = await createUnicodeTextRenderer(outPdf, helvetica, allWords.join(" "));
  let textLayerWords = 0;
  let skippedWords = 0;

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

    // Invisible (render mode 3) text overlay aligned with each recognised word
    const layer = drawInvisibleWords(page, renderer, words, scaleX, scaleY, pdfHeight);
    textLayerWords += layer.drawn;
    skippedWords += layer.skipped;

    onProgress({ phase: "building", page: result.pageNumber, totalPages: n, pct: 92 + Math.round((i / n) * 8) });
  }

  await renderer.finalize();
  const pdfBytes = await outPdf.save();
  onProgress({ phase: "building", page: 0, totalPages: n, pct: 100 });

  let textLayerWarning: string | undefined;
  if (textLayerWords === 0 && pageResults.some((r) => r.text.trim())) {
    textLayerWarning =
      "Text was recognised but could not be embedded as a searchable layer (no bundled font covers its characters, e.g. CJK). Use \"Extract Text\" to get the text.";
  } else if (skippedWords > 0) {
    textLayerWarning = `${skippedWords} recognised word(s) contain characters no bundled font covers (e.g. CJK) and were left out of the searchable layer.`;
  }

  return { pages: pageResults, averageConfidence: avgConf, outputMode, pdfBytes, textLayerWords, textLayerWarning };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dataURLtoBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Flatten Tesseract's block → paragraph → line → word tree into OCRWords. */
function extractWords(blocks: Block[] | null): OCRWord[] {
  const out: OCRWord[] = [];
  for (const block of blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        const lineHeight = line.bbox.y1 - line.bbox.y0;
        for (const w of line.words ?? []) {
          out.push({
            text: w.text,
            confidence: Math.round(w.confidence || 0),
            bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
            baselineY: baselineAt(line, w),
            lineHeight: lineHeight > 0 ? lineHeight : undefined,
          });
        }
      }
    }
  }
  return out;
}

/** Interpolate the line's baseline at the word's horizontal centre. */
function baselineAt(line: Line, w: Word): number | undefined {
  const bl = line.baseline;
  if (!bl || !bl.has_baseline || bl.x1 === bl.x0) return undefined;
  const cx = (w.bbox.x0 + w.bbox.x1) / 2;
  const y = bl.y0 + ((bl.y1 - bl.y0) * (cx - bl.x0)) / (bl.x1 - bl.x0);
  // Guard against odd baselines far outside the word box.
  return y >= w.bbox.y0 && y <= w.bbox.y1 + (w.bbox.y1 - w.bbox.y0) ? y : undefined;
}

/**
 * Writes each word as invisible text (Tr 3) at its image position, horizontally
 * scaled (Tz) so its width matches the word box. This is the standard OCR
 * text-layer technique: text is selectable/searchable but never painted.
 * Complex scripts are shaped and carry /ActualText (see unicodeText.ts).
 */
function drawInvisibleWords(
  page: PDFPage,
  renderer: UnicodeTextRenderer,
  words: OCRWord[],
  scaleX: number,
  scaleY: number,
  pdfHeight: number
): { drawn: number; skipped: number } {
  let drawn = 0;
  let skipped = 0;

  for (const word of words) {
    const text = word.text.normalize("NFC").trim();
    if (!text) continue;
    // Words with characters no font covers are left out rather than written as "?".
    if (renderer.prepare(text) !== text) {
      skipped++;
      continue;
    }
    const boxW = (word.bbox.x1 - word.bbox.x0) * scaleX;
    const boxH = (word.bbox.y1 - word.bbox.y0) * scaleY;
    if (boxW <= 0 || boxH <= 0) continue;

    const lineH = (word.lineHeight ?? word.bbox.y1 - word.bbox.y0) * scaleY;
    const fontSize = Math.max(1, lineH * 0.8);
    const naturalW = renderer.widthOf(text, fontSize);
    const squeeze = naturalW > 0 ? Math.min(1000, Math.max(5, (boxW / naturalW) * 100)) : 100;

    const x = word.bbox.x0 * scaleX;
    const baseline =
      word.baselineY !== undefined
        ? pdfHeight - word.baselineY * scaleY
        : pdfHeight - word.bbox.y1 * scaleY + boxH * 0.2; // approx. descender share
    renderer.drawLine(page, text, x, baseline, fontSize, renderer.isRtl(text), {
      invisible: true,
      horizontalScale: squeeze,
    });
    drawn++;
  }

  return { drawn, skipped };
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
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
