/**
 * imageToPdf.ts
 * Client-side image-to-PDF conversion using pdf-lib.
 * Supports JPEG, PNG, WebP, GIF, BMP via Canvas API fallback.
 * All processing happens in the browser — no server required.
 */

import { PDFDocument, type PDFImage } from "pdf-lib";

// ─── Public constants ───────────────────────────────────────────────────────

export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
];

export const ACCEPTED_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp",
];

/** 50 MB per file */
export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024;

/** Maximum images per conversion */
export const MAX_IMAGE_COUNT = 30;

// ─── Types ──────────────────────────────────────────────────────────────────

export type PageOrientation = "auto" | "portrait" | "landscape";
export type PageMarginSize = "none" | "small" | "medium" | "large";

export interface ImageToPDFOptions {
  orientation: PageOrientation;
  margin: PageMarginSize;
}

// ─── Page dimensions (points) ────────────────────────────────────────────────

/** A4 in portrait (pts). 1pt = 1/72 inch */
const A4_W = 595.28;
const A4_H = 841.89;

/** Margin in points for each level */
const MARGIN_PT: Record<PageMarginSize, number> = {
  none: 0,
  small: 14,   // ≈ 5 mm
  medium: 28,  // ≈ 10 mm
  large: 57,   // ≈ 20 mm
};

// ─── Internal helpers ────────────────────────────────────────────────────────

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () =>
      reject(new Error(`Could not read "${file.name}" from disk.`));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Draws the image file onto a hidden canvas and returns PNG bytes.
 * This provides universal format support for any browser-renderable image.
 */
function convertImageToPNGBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas 2D context not available in this browser."));
        return;
      }

      // White background for images with transparency (PNG/WebP/GIF)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(`Failed to encode "${file.name}" as PNG.`));
            return;
          }
          blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab))).catch(reject);
        },
        "image/png"
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          `Cannot load "${file.name}". The file may be corrupt or an unsupported format.`
        )
      );
    };

    img.src = url;
  });
}

/**
 * Embeds an image file into the PDFDocument.
 * - JPEG files are embedded natively (smaller file size).
 * - All other formats (PNG, WebP, GIF, BMP) are converted to PNG via Canvas.
 * - Falls back to canvas PNG if native JPEG embedding fails (e.g., progressive JPEG).
 */
async function embedImageFile(
  pdfDoc: PDFDocument,
  file: File
): Promise<PDFImage> {
  const isJPEG =
    file.type === "image/jpeg" ||
    /\.jpe?g$/i.test(file.name);

  if (isJPEG) {
    try {
      const buffer = await readFileAsArrayBuffer(file);
      return await pdfDoc.embedJpg(buffer);
    } catch {
      // Progressive JPEGs aren't supported by pdf-lib → fall through to canvas
    }
  }

  // Universal path: canvas → PNG → embed
  const pngBytes = await convertImageToPNGBytes(file);
  return await pdfDoc.embedPng(pngBytes);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validates whether a File is an accepted image type and within the size limit.
 * Returns null if valid, or a user-facing error string if not.
 */
export function validateImageFile(file: File): string | null {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_MIME_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported image type. Use JPG, PNG, WebP, GIF, or BMP.`;
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `"${file.name}" is too large. Maximum file size is 50 MB.`;
  }
  return null;
}

/**
 * Creates a preview URL for an image file (use URL.revokeObjectURL when done).
 */
export function createPreviewURL(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Converts an ordered array of image Files into a single PDF.
 * Each image gets its own page. Page size and margins are controlled by `options`.
 *
 * @param files     Ordered array of image Files
 * @param options   Page orientation and margin settings
 * @param onProgress  Callback receiving progress 0–100
 * @returns Uint8Array of the generated PDF
 */
export async function imagesToPDF(
  files: File[],
  options: ImageToPDFOptions,
  onProgress?: (pct: number) => void
): Promise<Uint8Array> {
  if (files.length === 0) throw new Error("No images provided.");

  const pdfDoc = await PDFDocument.create();
  const margin = MARGIN_PT[options.margin];

  for (let i = 0; i < files.length; i++) {
    // Report progress as we process each image (0–85%)
    onProgress?.(Math.round((i / files.length) * 85));

    let embeddedImg: PDFImage;
    try {
      embeddedImg = await embedImageFile(pdfDoc, files[i]);
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : `Failed to process "${files[i].name}".`
      );
    }

    const imgW = embeddedImg.width;
    const imgH = embeddedImg.height;

    // ── Determine page dimensions ──────────────────────────────────────────
    let pageW: number;
    let pageH: number;

    if (options.orientation === "auto") {
      // Page is sized to the image (capped at 3×A4 to avoid absurdly large pages)
      const cap = Math.max(A4_W, A4_H) * 4;
      const s = Math.min(1, cap / Math.max(imgW, imgH));
      pageW = imgW * s;
      pageH = imgH * s;
    } else if (options.orientation === "portrait") {
      pageW = A4_W;
      pageH = A4_H;
    } else {
      // landscape
      pageW = A4_H;
      pageH = A4_W;
    }

    const page = pdfDoc.addPage([pageW, pageH]);

    // ── Scale image to fill available area, centred ────────────────────────
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;
    const scale = Math.min(availW / imgW, availH / imgH, 1); // never upscale past 100%
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const x = margin + (availW - drawW) / 2;
    const y = margin + (availH - drawH) / 2;

    page.drawImage(embeddedImg, { x, y, width: drawW, height: drawH });
  }

  onProgress?.(92);
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  onProgress?.(100);
  return bytes;
}

/**
 * Triggers a browser download for the generated PDF bytes.
 */
export function downloadPDF(bytes: Uint8Array, filename: string): void {
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
