/**
 * compressPdf.ts
 * Client-side PDF compression. Everything runs in the browser: the file never
 * leaves the user's device.
 *
 * Techniques (real and measurable, applied per compression level):
 *  - Image re-encoding: embedded raster images (JPEG/DCT and 8-bit Flate RGB /
 *    Gray) are decoded with the browser's image pipeline, downsampled to a
 *    per-level maximum resolution and re-encoded as JPEG. This is the
 *    browser equivalent of Ghostscript's /printer, /ebook and /screen presets
 *    and is where most of the savings on real-world PDFs come from.
 *    A re-encoded image is only kept when it is actually smaller.
 *  - Object streams + cross-reference streams (Flate-compressed structure).
 *  - Metadata stripping (Info dictionary + XMP stream).
 *  - Embedded page thumbnails, PieceInfo and article thread removal.
 *
 * Vector content, text and fonts are never rasterised.
 */

import {
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFArray,
  PDFDict,
  PDFRawStream,
  PDFRef,
  PDFBool,
  decodePDFRawStream,
} from "@cantoo/pdf-lib";

/** Max file size allowed per PDF (50 MB) */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export type CompressionLevel = "low" | "medium" | "high" | "target";

export interface CompressionResult {
  /** The compressed PDF bytes (the original bytes if nothing could be saved) */
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  /** Percentage of size saved (0–100). May be 0 if PDF was already optimal. */
  reduction: number;
  /** Human readable name of the strategy that produced the result */
  modeUsed?: string;
  /** Non-fatal notice for the user (target not reached, nothing to gain, ...) */
  warningMessage?: string;
  /** Number of images that were re-encoded */
  imagesOptimized: number;
}

interface Preset {
  name: string;
  /** Longest side (px) images are downsampled to; null = keep dimensions */
  maxImageDim: number | null;
  /** JPEG quality (0–1) used when re-encoding */
  jpegQuality: number;
  /** Re-encode lossless (Flate) photos as JPEG too */
  convertFlateImages: boolean;
  stripMetadata: boolean;
  stripExtras: boolean;
}

const PRESETS: Record<"low" | "medium" | "high" | "extreme" | "max", Preset> = {
  low: {
    name: "Less compression (~300 dpi images)",
    maxImageDim: 3000,
    jpegQuality: 0.85,
    convertFlateImages: false,
    stripMetadata: false,
    stripExtras: false,
  },
  medium: {
    name: "Recommended (~150 dpi images)",
    maxImageDim: 1600,
    jpegQuality: 0.72,
    convertFlateImages: true,
    stripMetadata: true,
    stripExtras: false,
  },
  high: {
    name: "Extreme compression (~96 dpi images)",
    maxImageDim: 1100,
    jpegQuality: 0.55,
    convertFlateImages: true,
    stripMetadata: true,
    stripExtras: true,
  },
  extreme: {
    name: "Aggressive (~72 dpi images)",
    maxImageDim: 800,
    jpegQuality: 0.45,
    convertFlateImages: true,
    stripMetadata: true,
    stripExtras: true,
  },
  max: {
    name: "Maximum (~50 dpi images)",
    maxImageDim: 560,
    jpegQuality: 0.35,
    convertFlateImages: true,
    stripMetadata: true,
    stripExtras: true,
  },
};

const TARGET_ORDER: (keyof typeof PRESETS)[] = ["medium", "high", "extreme", "max"];

/** Skip absurdly large images to avoid exhausting memory on phones. */
const MAX_DECODE_PIXELS = 40_000_000;

// ─── Metadata / structure helpers ───────────────────────────────────────────

function stripDocumentMetadata(doc: PDFDocument): void {
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("");
  doc.setCreator("");
  doc.catalog.delete(PDFName.of("Metadata"));
}

function removeExtras(doc: PDFDocument): void {
  for (const key of ["PieceInfo", "Threads", "SpiderInfo"]) {
    doc.catalog.delete(PDFName.of(key));
  }
  for (const page of doc.getPages()) {
    page.node.delete(PDFName.of("Thumb"));
    page.node.delete(PDFName.of("PieceInfo"));
  }
}

// ─── Image helpers ──────────────────────────────────────────────────────────

function getFilters(dict: PDFDict): string[] {
  const f = dict.lookup(PDFName.of("Filter"));
  if (!f) return [];
  if (f instanceof PDFName) return [f.decodeText()];
  if (f instanceof PDFArray) {
    return f.asArray().map((x) => (x instanceof PDFName ? x.decodeText() : "?"));
  }
  return ["?"];
}

/** Returns 1 (gray) or 3 (RGB) if the colour space is supported, else null. */
function getComponents(dict: PDFDict): number | null {
  const cs = dict.lookup(PDFName.of("ColorSpace"));
  if (cs instanceof PDFName) {
    const n = cs.decodeText();
    if (n === "DeviceRGB") return 3;
    if (n === "DeviceGray") return 1;
    return null;
  }
  if (cs instanceof PDFArray && cs.size() === 2) {
    const kind = cs.lookup(0);
    if (kind instanceof PDFName && kind.decodeText() === "ICCBased") {
      const icc = cs.lookup(1);
      const nObj = icc instanceof PDFRawStream ? icc.dict.lookup(PDFName.of("N")) : undefined;
      const n = nObj instanceof PDFNumber ? nObj.asNumber() : null;
      if (n === 1 || n === 3) return n;
    }
  }
  return null;
}

function numberOf(dict: PDFDict, key: string): number | null {
  const v = dict.lookup(PDFName.of(key));
  return v instanceof PDFNumber ? v.asNumber() : null;
}

function makeCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

async function canvasToJpeg(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  quality: number
): Promise<Uint8Array> {
  let blob: Blob | null;
  if ("convertToBlob" in canvas) {
    blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
  } else {
    blob = await new Promise<Blob | null>((resolve) =>
      (canvas as HTMLCanvasElement).toBlob(resolve, "image/jpeg", quality)
    );
  }
  if (!blob) throw new Error("JPEG encoding failed");
  return new Uint8Array(await blob.arrayBuffer());
}

/** Decodes an image XObject into something drawable, or null if unsupported. */
async function decodeImage(
  stream: PDFRawStream,
  preset: Preset
): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void } | null> {
  const dict = stream.dict;
  const width = numberOf(dict, "Width");
  const height = numberOf(dict, "Height");
  const bpc = numberOf(dict, "BitsPerComponent");
  if (!width || !height || bpc !== 8) return null;
  if (width * height > MAX_DECODE_PIXELS) return null;

  // Masks / colour-key / decode arrays / alpha-in-data would change meaning.
  const imageMask = dict.lookup(PDFName.of("ImageMask"));
  if (imageMask instanceof PDFBool && imageMask.asBoolean()) return null;
  if (dict.lookup(PDFName.of("Mask")) instanceof PDFArray) return null;
  if (dict.has(PDFName.of("Decode"))) return null;
  if (dict.has(PDFName.of("SMaskInData"))) return null;

  const comps = getComponents(dict);
  if (!comps) return null;

  const filters = getFilters(dict);

  if (filters.length === 1 && filters[0] === "DCTDecode") {
    const blob = new Blob([stream.getContents() as BlobPart], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }

  if (preset.convertFlateImages && filters.length === 1 && filters[0] === "FlateDecode") {
    const parms = dict.lookup(PDFName.of("DecodeParms"));
    if (parms instanceof PDFDict) {
      const predictor = numberOf(parms, "Predictor");
      if (predictor && predictor > 1) return null;
    } else if (parms) {
      return null;
    }
    const raw = decodePDFRawStream(stream).decode();
    if (raw.length < width * height * comps) return null;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, j = 0; i < width * height; i++, j += comps) {
      const o = i * 4;
      if (comps === 3) {
        rgba[o] = raw[j];
        rgba[o + 1] = raw[j + 1];
        rgba[o + 2] = raw[j + 2];
      } else {
        rgba[o] = rgba[o + 1] = rgba[o + 2] = raw[j];
      }
      rgba[o + 3] = 255;
    }
    const bitmap = await createImageBitmap(new ImageData(rgba, width, height));
    return { source: bitmap, width, height, close: () => bitmap.close() };
  }

  return null;
}

async function recompressImages(
  doc: PDFDocument,
  preset: Preset,
  onProgress?: (fraction: number) => void
): Promise<number> {
  const context = doc.context;
  const images: [PDFRef, PDFRawStream][] = [];
  const softMasks = new Set<string>();

  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const subtype = obj.dict.lookup(PDFName.of("Subtype"));
    if (!(subtype instanceof PDFName) || subtype.decodeText() !== "Image") continue;
    images.push([ref, obj]);
    const smask = obj.dict.get(PDFName.of("SMask"));
    if (smask instanceof PDFRef) softMasks.add(smask.toString());
  }

  let optimized = 0;
  for (let i = 0; i < images.length; i++) {
    const [ref, stream] = images[i];
    onProgress?.(i / Math.max(1, images.length));
    // Soft masks must stay single-channel; JPEG output is always 3-channel.
    if (softMasks.has(ref.toString())) continue;

    try {
      const decoded = await decodeImage(stream, preset);
      if (!decoded) continue;

      const { width, height } = decoded;
      const scale = preset.maxImageDim ? Math.min(1, preset.maxImageDim / Math.max(width, height)) : 1;
      const isJpeg = getFilters(stream.dict)[0] === "DCTDecode";
      // At "low" we only touch JPEGs that are larger than the preset resolution.
      if (isJpeg && scale === 1 && !preset.convertFlateImages) {
        decoded.close?.();
        continue;
      }

      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      const canvas = makeCanvas(w, h);
      const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
      if (!ctx) {
        decoded.close?.();
        continue;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(decoded.source, 0, 0, w, h);
      decoded.close?.();

      const jpeg = await canvasToJpeg(canvas, preset.jpegQuality);
      if (jpeg.length >= stream.getContents().length) continue; // no gain

      const newDict = PDFDict.withContext(context);
      for (const [key, value] of stream.dict.entries()) newDict.set(key, value);
      newDict.delete(PDFName.of("DecodeParms"));
      newDict.delete(PDFName.of("Length"));
      newDict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
      newDict.set(PDFName.of("Width"), PDFNumber.of(w));
      newDict.set(PDFName.of("Height"), PDFNumber.of(h));
      newDict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
      // Browsers always emit 3-channel (YCbCr) JPEGs.
      if (getComponents(stream.dict) !== 3) {
        newDict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
      }
      context.assign(ref, PDFRawStream.of(newDict, jpeg));
      optimized++;
    } catch (err) {
      // An image we cannot decode is simply left untouched.
      console.warn("[compress] skipped image", ref.toString(), err);
    }
  }
  onProgress?.(1);
  return optimized;
}

async function runPass(
  bytes: Uint8Array,
  preset: Preset,
  onProgress?: (fraction: number) => void
): Promise<{ bytes: Uint8Array; imagesOptimized: number }> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const imagesOptimized = await recompressImages(doc, preset, (f) => onProgress?.(f * 0.85));
  if (preset.stripMetadata) stripDocumentMetadata(doc);
  if (preset.stripExtras) removeExtras(doc);
  const out = await doc.save({ useObjectStreams: true });
  onProgress?.(1);
  return { bytes: out, imagesOptimized };
}

async function readInput(file: File | Blob | Uint8Array): Promise<Uint8Array> {
  if (file instanceof Uint8Array) return file;
  return new Uint8Array(await file.arrayBuffer());
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Compresses a PDF entirely in the browser.
 *
 * @param file          PDF to compress
 * @param level         Compression level
 * @param onProgress    Optional progress callback (0–100)
 * @param targetSizeKb  Desired max size in KB (only for level "target")
 * @throws Error with a user-friendly message for corrupt/encrypted PDFs
 */
export async function compressPDF(
  file: File | Blob | Uint8Array,
  level: CompressionLevel,
  onProgress?: (pct: number) => void,
  targetSizeKb?: number
): Promise<CompressionResult> {
  const name = file instanceof File ? file.name : "This PDF";
  onProgress?.(2);
  const input = await readInput(file);
  const originalSize = input.byteLength;
  onProgress?.(8);

  try {
    await PDFDocument.load(input, { updateMetadata: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/encrypt/i.test(msg)) {
      throw new Error(`"${name}" is password-protected. Unlock it first, then compress it.`);
    }
    throw new Error(`Could not read "${name}". The file may be corrupt or not a PDF.`);
  }

  const presetKeys: (keyof typeof PRESETS)[] =
    level === "target" ? TARGET_ORDER : [level];
  const targetBytes = level === "target" && targetSizeKb ? targetSizeKb * 1024 : null;

  let best: { bytes: Uint8Array; name: string; imagesOptimized: number } | null = null;
  for (let i = 0; i < presetKeys.length; i++) {
    const preset = PRESETS[presetKeys[i]];
    const base = 10 + (i / presetKeys.length) * 88;
    const span = 88 / presetKeys.length;
    const pass = await runPass(input, preset, (f) => onProgress?.(Math.round(base + f * span)));
    if (!best || pass.bytes.byteLength < best.bytes.byteLength) {
      best = { bytes: pass.bytes, name: preset.name, imagesOptimized: pass.imagesOptimized };
    }
    if (!targetBytes || best.bytes.byteLength <= targetBytes) break;
  }
  onProgress?.(100);

  let warningMessage: string | undefined;
  let result = best!;
  if (result.bytes.byteLength >= originalSize) {
    result = { bytes: input, name: "Original (no reduction possible)", imagesOptimized: 0 };
    warningMessage =
      "This PDF is already well optimised. No meaningful reduction was possible without damaging it, so the original is returned.";
  }
  if (targetBytes && result.bytes.byteLength > targetBytes) {
    warningMessage = `The target size (${Math.round(targetBytes / 1024)} KB) could not be reached. This is the smallest version we could make (${Math.round(result.bytes.byteLength / 1024)} KB).`;
  }

  const compressedSize = result.bytes.byteLength;
  return {
    bytes: result.bytes,
    originalSize,
    compressedSize,
    reduction: Math.max(0, Math.round((1 - compressedSize / originalSize) * 100)),
    modeUsed: result.name,
    warningMessage,
    imagesOptimized: result.imagesOptimized,
  };
}

/**
 * Triggers a browser download of compressed PDF bytes.
 */
export function downloadCompressedPDF(bytes: Uint8Array, originalName: string): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = originalName.replace(/\.pdf$/i, "") + "_compressed.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
