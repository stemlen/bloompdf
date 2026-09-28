/**
 * In-browser PDF → Word (.docx) conversion. The file never leaves the device:
 * pdf.js reads it, Tesseract (the same OCR code as the OCR tool) handles
 * scanned pages, and the `docx` library writes the result.
 *
 * Work is done page by page with yields to the event loop in between, so the
 * UI stays responsive. pdf.js parsing and Tesseract already run in their own
 * web workers; the layout pass is light (milliseconds per page).
 */
import * as pdfjsLib from "pdfjs-dist";
import { loadPdfForRendering } from "../pdfRender";
import type { OCRLanguage } from "../ocrPdf";
import { extractPage, type PdfJsLike } from "./extract";
import { layoutDocument, bodyFontSize } from "./layout";
import { ocrPagePieces } from "./ocrPieces";
import type { PageContent, PageImage } from "./types";

export interface PdfToWordOptions {
  /** OCR pages that have no text layer (scans). */
  ocr: boolean;
  ocrLanguage: OCRLanguage;
  /** Embed images found in the PDF. */
  includeImages: boolean;
}

export const DEFAULT_PDF_TO_WORD_OPTIONS: PdfToWordOptions = {
  ocr: true,
  ocrLanguage: "eng",
  includeImages: true,
};

export interface PdfToWordProgress {
  phase: "loading" | "reading" | "ocr" | "writing";
  /** 0-100 */
  pct: number;
  message: string;
}

export interface PdfToWordResult {
  blob: Blob;
  fileName: string;
  pageCount: number;
  ocrPages: number[];
  stats: { paragraphs: number; headings: number; tables: number; images: number; columnsPages: number };
  warnings: string[];
}

export class PdfToWordError extends Error {}

/** Frees pdf.js resources (the bundled typings lag behind the runtime API). */
const closeDoc = (d: unknown) => (d as { destroy?: () => Promise<void> }).destroy?.().catch(() => {});

const yieldToUI = () => new Promise<void>((r) => setTimeout(r, 0));

/** Pages with (almost) no text but a large picture are treated as scans. */
function looksScanned(page: { pieces: { str: string }[]; images: PageImage[]; width: number; height: number }): boolean {
  const chars = page.pieces.reduce((n, p) => n + p.str.replace(/\s/g, "").length, 0);
  if (chars >= 25) return false;
  const area = page.images.reduce((a, im) => a + (im.x1 - im.x0) * (im.y1 - im.y0), 0);
  return area >= 0.25 * page.width * page.height;
}

/** Renders the page once and crops each image rectangle to JPEG. */
async function cropImages(page: pdfjsLib.PDFPageProxy, rects: PageImage[]): Promise<void> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2, 2400 / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport } as unknown as Parameters<typeof page.render>[0]).promise;
  for (const r of rects) {
    const sx = Math.max(0, Math.floor(r.x0 * scale));
    const sy = Math.max(0, Math.floor(r.y0 * scale));
    const sw = Math.min(canvas.width - sx, Math.ceil((r.x1 - r.x0) * scale));
    const sh = Math.min(canvas.height - sy, Math.ceil((r.y1 - r.y0) * scale));
    if (sw < 4 || sh < 4) continue;
    const crop = document.createElement("canvas");
    crop.width = sw;
    crop.height = sh;
    crop.getContext("2d")?.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await new Promise<Blob | null>((res) => crop.toBlob(res, "image/jpeg", 0.9));
    if (blob) {
      r.data = new Uint8Array(await blob.arrayBuffer());
      r.pxWidth = sw;
      r.pxHeight = sh;
    }
    crop.width = crop.height = 0;
  }
  canvas.width = canvas.height = 0;
}

export async function convertPdfToWord(
  file: File,
  options: PdfToWordOptions,
  onProgress: (p: PdfToWordProgress) => void
): Promise<PdfToWordResult> {
  const warnings: string[] = [];
  onProgress({ phase: "loading", pct: 1, message: "Opening PDF…" });

  let doc: pdfjsLib.PDFDocumentProxy;
  try {
    doc = await loadPdfForRendering(file);
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === "PasswordException") throw new PdfToWordError("This PDF is password-protected. Unlock it first, then convert it.");
    throw new PdfToWordError("This file could not be read as a PDF. It may be damaged; try Repair PDF first.");
  }

  const lib = pdfjsLib as unknown as PdfJsLike;
  const n = doc.numPages;
  const readShare = options.ocr ? 45 : 85;
  const pages: PageContent[] = [];
  const scanned: number[] = [];

  try {
    for (let i = 1; i <= n; i++) {
      onProgress({ phase: "reading", pct: Math.round(2 + ((i - 1) / n) * readShare), message: `Reading page ${i} of ${n}…` });
      const cropper = options.includeImages
        ? async (page: pdfjsLib.PDFPageProxy, rects: PageImage[], info: { chars: number; width: number; height: number }) => {
            // Scans are OCR'd instead of being embedded as a picture.
            const area = rects.reduce((a, r) => a + (r.x1 - r.x0) * (r.y1 - r.y0), 0);
            if (options.ocr && info.chars < 25 && area >= 0.25 * info.width * info.height) return;
            await cropImages(page, rects);
          }
        : undefined;
      const content = await extractPage(doc, i, lib, cropper);
      if (looksScanned(content)) scanned.push(i);
      pages.push(content);
      await yieldToUI();
    }
  } catch (e) {
    await closeDoc(doc);
    throw e instanceof PdfToWordError ? e : new PdfToWordError(`Could not read the PDF: ${(e as Error)?.message ?? e}`);
  }
  await closeDoc(doc);

  // ── OCR for scanned pages ────────────────────────────────────────────────
  const ocrPages: number[] = [];
  if (scanned.length && options.ocr) {
    const { runOCR, terminateOCRWorker } = await import("../ocrPdf");
    onProgress({ phase: "ocr", pct: readShare + 2, message: `Loading OCR engine for ${scanned.length} scanned page${scanned.length > 1 ? "s" : ""}…` });
    try {
      const res = await runOCR(
        file,
        scanned,
        options.ocrLanguage,
        "extract-text",
        { autoEnhance: true, deskew: false, removeNoise: false, increaseContrast: false },
        (ev) => {
          if (ev.phase === "building") return;
          const idx = Math.max(0, scanned.indexOf(ev.page));
          onProgress({
            phase: "ocr",
            pct: Math.round(readShare + 2 + (ev.pct / 100) * (93 - readShare - 2)),
            message: `Recognising text on scanned page ${ev.page} (${idx + 1} of ${scanned.length})…`,
          });
        }
      );
      for (const r of res.pages) {
        const page = pages[r.pageNumber - 1];
        const pieces = ocrPagePieces(r);
        if (pieces.length >= 3) {
          page.pieces = pieces;
          page.ocr = true;
          page.images = [];
          ocrPages.push(r.pageNumber);
        } else {
          warnings.push(`No text was recognised on scanned page ${r.pageNumber}.`);
        }
      }
    } catch (e) {
      warnings.push(`OCR failed (${(e as Error)?.message ?? "unknown error"}); scanned pages were left without text.`);
    } finally {
      await terminateOCRWorker().catch(() => {});
    }
  } else if (scanned.length) {
    warnings.push(`${scanned.length} page${scanned.length > 1 ? "s look" : " looks"} scanned; turn on OCR to get editable text from ${scanned.length > 1 ? "them" : "it"}.`);
  }

  // Scans without usable OCR text keep their picture so the page isn't blank.
  if (options.includeImages) {
    const missing = scanned.filter((p) => !ocrPages.includes(p) && pages[p - 1].images.some((im) => !im.data));
    if (missing.length) {
      const again = await loadPdfForRendering(file);
      try {
        for (const p of missing) {
          const page = await again.getPage(p);
          await cropImages(page, pages[p - 1].images);
        }
      } finally {
        await closeDoc(again);
      }
    }
  }

  // ── Layout and .docx ─────────────────────────────────────────────────────
  onProgress({ phase: "writing", pct: 94, message: "Rebuilding paragraphs, headings and tables…" });
  await yieldToUI();
  const laid = layoutDocument(pages);
  const bodySize = bodyFontSize(pages);
  const serifVotes = pages.flatMap((p) => p.pieces).reduce((v, p) => v + (p.serif === undefined ? 0 : p.serif ? p.str.length : -p.str.length), 0);

  onProgress({ phase: "writing", pct: 96, message: "Writing .docx…" });
  await yieldToUI();
  const [{ buildDocx }, { Packer }] = await Promise.all([import("./docxWriter"), import("docx")]);
  const title = file.name.replace(/\.pdf$/i, "");
  const document = buildDocx(laid, { bodySize, serif: serifVotes > 0, title });
  const blob = await Packer.toBlob(document);

  const stats = { paragraphs: 0, headings: 0, tables: 0, images: 0, columnsPages: 0 };
  for (const p of laid) {
    if (p.columns > 1) stats.columnsPages++;
    for (const b of p.blocks) {
      if (b.kind === "table") stats.tables++;
      else if (b.kind === "image") stats.images++;
      else if (b.heading) stats.headings++;
      else stats.paragraphs++;
    }
  }
  if (stats.paragraphs + stats.headings + stats.tables === 0) {
    warnings.push("No text was found in this PDF, so the document only contains images (if any).");
  }
  onProgress({ phase: "writing", pct: 100, message: "Done" });
  return { blob, fileName: `${title}.docx`, pageCount: n, ocrPages, stats, warnings };
}
