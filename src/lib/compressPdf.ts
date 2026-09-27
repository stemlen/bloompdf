/**
 * compressPdf.ts
 * Client-side PDF compression. Everything runs in the browser: the file never
 * leaves the user's device.
 *
 * Techniques (real and measurable, applied per compression level):
 *  - Image re-encoding: embedded raster images (JPEG/DCT and 8-bit raw RGB /
 *    Gray, including ones wrapped in ASCII85 / ASCIIHex / Flate / LZW /
 *    RunLength filter chains) are decoded with the browser's image pipeline,
 *    downsampled to a per-level maximum pixel size (long edge) and re-encoded
 *    as JPEG. This is where most of the savings on real-world PDFs come from.
 *    A re-encoded image is only kept when it is actually smaller.
 *  - Lossless unwrapping: JPEGs stored inside text/zip wrappers (e.g.
 *    ReportLab's default /Filter [/ASCII85Decode /DCTDecode], +25% size) are
 *    stored as plain /DCTDecode when that is the smallest option.
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
  PDFNull,
  PDFObject,
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
  /**
   * Longest side (px) images are downsampled to; null = keep dimensions.
   * This is a pixel cap, not a DPI target: the effective DPI depends on how
   * large the image is placed on the page.
   */
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
    name: "Less compression (images max 3000 px long edge)",
    maxImageDim: 3000,
    jpegQuality: 0.85,
    convertFlateImages: false,
    stripMetadata: false,
    stripExtras: false,
  },
  medium: {
    name: "Recommended (images max 1600 px long edge)",
    maxImageDim: 1600,
    jpegQuality: 0.72,
    convertFlateImages: true,
    stripMetadata: true,
    stripExtras: false,
  },
  high: {
    name: "Extreme compression (images max 1100 px long edge)",
    maxImageDim: 1100,
    jpegQuality: 0.55,
    convertFlateImages: true,
    stripMetadata: true,
    stripExtras: true,
  },
  extreme: {
    name: "Aggressive (images max 800 px long edge)",
    maxImageDim: 800,
    jpegQuality: 0.45,
    convertFlateImages: true,
    stripMetadata: true,
    stripExtras: true,
  },
  max: {
    name: "Maximum (images max 560 px long edge)",
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

/** Filters pdf-lib can decode in JS (everything except the image codecs). */
const TRANSPORT_FILTERS = new Set(["FlateDecode", "LZWDecode", "ASCII85Decode", "ASCIIHexDecode", "RunLengthDecode"]);

/** The /DecodeParms entry for filter #i (handles a single dict or an array). */
function parmsAt(dict: PDFDict, index: number, filterCount: number): PDFObject | undefined {
  const parms = dict.lookup(PDFName.of("DecodeParms"));
  if (parms instanceof PDFArray) {
    if (index >= parms.size()) return undefined;
    const p = parms.lookup(index);
    return p === PDFNull ? undefined : p;
  }
  // A lone dict only makes sense for a single filter.
  if (parms instanceof PDFDict && filterCount === 1 && index === 0) return parms;
  return undefined;
}

/**
 * Decodes the first `count` filters of a stream (all must be transport
 * filters). Returns null when a predictor or unknown parameter is involved:
 * pdf-lib's Flate/LZW decoders don't implement PNG/TIFF predictors.
 */
function decodeLeadingFilters(stream: PDFRawStream, count: number): Uint8Array | null {
  const dict = stream.dict;
  const filters = getFilters(dict);
  if (count === 0) return stream.getContents();
  const fArr = PDFArray.withContext(dict.context);
  const pArr = PDFArray.withContext(dict.context);
  for (let i = 0; i < count; i++) {
    if (!TRANSPORT_FILTERS.has(filters[i])) return null;
    const p = parmsAt(dict, i, filters.length);
    if (p instanceof PDFDict) {
      const predictor = numberOf(p, "Predictor");
      if (predictor && predictor > 1) return null;
    } else if (p !== undefined) {
      return null;
    }
    fArr.push(PDFName.of(filters[i]));
    pArr.push(p ?? PDFNull);
  }
  // Decode only the leading filters by handing pdf-lib a trimmed dict.
  const sub = PDFDict.withContext(dict.context);
  sub.set(PDFName.of("Filter"), fArr);
  sub.set(PDFName.of("DecodeParms"), pArr);
  return decodePDFRawStream(PDFRawStream.of(sub, stream.getContents())).decode();
}

/**
 * Strips the leading transport filters (ASCII85, ASCIIHex, Flate, ...) off an
 * image stream. Returns the remaining filters (empty = raw samples, or
 * ["DCTDecode"]) plus the bytes at that point, or null if a filter is
 * unsupported (JBIG2, JPX, CCITT, predictors, ...).
 */
function stripTransportFilters(
  stream: PDFRawStream
): { rest: string[]; bytes: Uint8Array; dctParms?: PDFDict } | null {
  const filters = getFilters(stream.dict);
  let lead = 0;
  while (lead < filters.length && TRANSPORT_FILTERS.has(filters[lead])) lead++;
  const rest = filters.slice(lead);
  if (rest.length > 1 || (rest.length === 1 && rest[0] !== "DCTDecode")) return null;
  const bytes = decodeLeadingFilters(stream, lead);
  if (!bytes) return null;
  const dctP = rest.length === 1 ? parmsAt(stream.dict, lead, filters.length) : undefined;
  return { rest, bytes, dctParms: dctP instanceof PDFDict ? dctP : undefined };
}

/**
 * Lossless: removes leading ASCII85/ASCIIHex "armour" (+25% / +100% size) and
 * keeps the remaining filters and their /DecodeParms as they were.
 */
function removeAsciiArmour(stream: PDFRawStream): { dict: PDFDict; bytes: Uint8Array } | null {
  const filters = getFilters(stream.dict);
  let k = 0;
  while (k < filters.length && (filters[k] === "ASCII85Decode" || filters[k] === "ASCIIHexDecode")) k++;
  if (k === 0) return null;
  const bytes = decodeLeadingFilters(stream, k);
  if (!bytes) return null;
  const restFilters = filters.slice(k);
  const restParms = restFilters.map((_, i) => parmsAt(stream.dict, k + i, filters.length));
  const dict = imageDictWithoutEncoding(stream);
  const ctx = stream.dict.context;
  if (restFilters.length === 1) {
    dict.set(PDFName.of("Filter"), PDFName.of(restFilters[0]));
    if (restParms[0]) dict.set(PDFName.of("DecodeParms"), restParms[0]);
  } else if (restFilters.length > 1) {
    const f = PDFArray.withContext(ctx);
    restFilters.forEach((n) => f.push(PDFName.of(n)));
    dict.set(PDFName.of("Filter"), f);
    if (restParms.some((p) => p !== undefined)) {
      const pa = PDFArray.withContext(ctx);
      restParms.forEach((p) => pa.push(p ?? PDFNull));
      dict.set(PDFName.of("DecodeParms"), pa);
    }
  }
  return { dict, bytes };
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
}

/** Decodes an image XObject into something drawable, or null if unsupported. */
async function decodeImage(
  stream: PDFRawStream,
  preset: Preset,
  stripped: { rest: string[]; bytes: Uint8Array } | null
): Promise<DecodedImage | null> {
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
  if (!comps || !stripped) return null;

  if (stripped.rest.length === 1) {
    // JPEG (possibly after unwrapping ASCII85 / Flate / ...)
    const blob = new Blob([stripped.bytes as BlobPart], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }

  if (preset.convertFlateImages) {
    // Raw 8-bit samples (Flate, ASCII85+Flate, uncompressed, ...)
    const raw = stripped.bytes;
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

/** Copy of an image dict minus stream-encoding keys (Length, Filter, DecodeParms). */
function imageDictWithoutEncoding(stream: PDFRawStream): PDFDict {
  const d = PDFDict.withContext(stream.dict.context);
  for (const [key, value] of stream.dict.entries()) d.set(key, value);
  d.delete(PDFName.of("DecodeParms"));
  d.delete(PDFName.of("Length"));
  d.delete(PDFName.of("Filter"));
  return d;
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

    try {
      const originalLength = stream.getContents().length;
      const stripped = stripTransportFilters(stream);
      const isJpeg = stripped?.rest.length === 1;

      // Candidate 1 (lossless): a wrapped JPEG stored as plain /DCTDecode, or
      // ASCII armour removed. Pixels are untouched, so this is safe for any
      // colour space / mask.
      let best: { dict: PDFDict; bytes: Uint8Array } | null = null;
      if (stripped && isJpeg && getFilters(stream.dict).length > 1) {
        const dict = imageDictWithoutEncoding(stream);
        dict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
        if (stripped.dctParms) dict.set(PDFName.of("DecodeParms"), stripped.dctParms);
        best = { dict, bytes: stripped.bytes };
      } else {
        // Other images: at least drop ASCII85/ASCIIHex armour (e.g. A85+Flate).
        best = removeAsciiArmour(stream);
      }

      // Candidate 2 (lossy): downsample + re-encode. Soft masks must stay
      // single-channel and JPEG output is always 3-channel, so skip them.
      const decoded = softMasks.has(ref.toString()) ? null : await decodeImage(stream, preset, stripped);
      if (decoded) {
        const { width, height } = decoded;
        const scale = preset.maxImageDim ? Math.min(1, preset.maxImageDim / Math.max(width, height)) : 1;
        // At "low" we only re-encode JPEGs that are larger than the preset size.
        const skip = isJpeg && scale === 1 && !preset.convertFlateImages;
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        const canvas = skip ? null : makeCanvas(w, h);
        const ctx = canvas?.getContext("2d") as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null | undefined;
        if (canvas && ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(decoded.source, 0, 0, w, h);
        }
        decoded.close?.();
        if (canvas && ctx) {
          const jpeg = await canvasToJpeg(canvas, preset.jpegQuality);
          if (jpeg.length < (best?.bytes.length ?? originalLength)) {
            const dict = imageDictWithoutEncoding(stream);
            dict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
            dict.set(PDFName.of("Width"), PDFNumber.of(w));
            dict.set(PDFName.of("Height"), PDFNumber.of(h));
            dict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
            // Browsers always emit 3-channel (YCbCr) JPEGs.
            if (getComponents(stream.dict) !== 3) {
              dict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
            }
            best = { dict, bytes: jpeg };
          }
        }
      }

      // Never make an image bigger than it was.
      if (!best || best.bytes.length >= originalLength) continue;
      // /Length is written by pdf-lib from the new contents on save.
      context.assign(ref, PDFRawStream.of(best.dict, best.bytes));
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
