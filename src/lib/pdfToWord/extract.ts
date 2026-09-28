/**
 * Page extraction for PDF → Word: positioned text (with font size and
 * bold/italic hints) and image placements, read with pdf.js.
 *
 * Kept free of DOM APIs so it can also run under Node (tests / evaluation);
 * the browser-only page render used to crop images is injected.
 */
import type { PageContent, PageImage, TextPiece } from "./types";

type Matrix = [number, number, number, number, number, number];

/* eslint-disable @typescript-eslint/no-explicit-any -- pdf.js objects are loosely typed */

/** The parts of the pdf.js module we need (passed in so Node can use the legacy build). */
export interface PdfJsLike {
  OPS: Record<string, number>;
  Util: { transform(m1: number[], m2: number[]): number[] };
}

/** Crops the given page rectangles (viewport points) out of a render, filling in `data`. */
export type ImageCropper = (page: any, rects: PageImage[], info: { chars: number; width: number; height: number }) => Promise<void>;

const BOLD_RE = /bold|black|heavy|semibold|demi|[-,_ ]?medi(um)?\b|[-,]bd\b|cmbx|cmb10|cmssbx|\bsb\b/i;
const ITALIC_RE = /italic|oblique|ital\b|[-,]it\b|cmti|cmmi|cmsl|cmitt|slanted/i;

/** Font style hints from the embedded font name (e.g. "ABCDEF+NimbusRomNo9L-Medi", "CMBX10"). */
export function fontStyleFromName(name: string): { bold: boolean; italic: boolean } {
  const n = name.replace(/^[A-Z]{6}\+/, "");
  return { bold: BOLD_RE.test(n), italic: ITALIC_RE.test(n) };
}

function applyToPoint(m: number[], x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/**
 * Where each image XObject is painted, from the page operator list.
 * The unit square of every image is mapped through the CTM and the viewport.
 */
export function findImageRects(opList: any, viewportTransform: number[], lib: PdfJsLike, pageW: number, pageH: number): PageImage[] {
  const { OPS, Util } = lib;
  const paintOps = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageXObjectRepeat]);
  let ctm: number[] = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const out: PageImage[] = [];
  const { fnArray, argsArray } = opList;
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) ctm = Util.transform(ctm, args as Matrix);
    else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      const m = args?.[0];
      if (Array.isArray(m) || ArrayBuffer.isView(m)) ctm = Util.transform(ctm, Array.from(m as ArrayLike<number>));
    } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (paintOps.has(fn)) {
      const full = Util.transform(viewportTransform, ctm);
      const pts = [applyToPoint(full, 0, 0), applyToPoint(full, 1, 0), applyToPoint(full, 0, 1), applyToPoint(full, 1, 1)];
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const x0 = Math.max(0, Math.min(...xs));
      const x1 = Math.min(pageW, Math.max(...xs));
      const y0 = Math.max(0, Math.min(...ys));
      const y1 = Math.min(pageH, Math.max(...ys));
      // Ignore rules, bullets and other tiny decorations.
      if (x1 - x0 < 24 || y1 - y0 < 24) continue;
      // The same image painted twice at one spot (e.g. a soft-mask pass).
      if (out.some((o) => Math.abs(o.x0 - x0) < 1 && Math.abs(o.y0 - y0) < 1 && Math.abs(o.x1 - x1) < 1 && Math.abs(o.y1 - y1) < 1)) continue;
      out.push({ x0, y0, x1, y1 });
    }
  }
  return out;
}

/** Extracts one page. `cropper` (browser only) fills in the image bytes. */
export async function extractPage(doc: any, pageNumber: number, lib: PdfJsLike, cropper?: ImageCropper): Promise<PageContent> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const [opList, tc] = await Promise.all([page.getOperatorList(), page.getTextContent()]);
  const vt: number[] = viewport.transform;

  const pieces: TextPiece[] = [];
  const rotatedText: string[] = [];
  let rotatedRun: string[] = [];
  let rotatedEnd: [number, number] | null = null;
  const flushRotated = () => {
    const s = rotatedRun.join("").replace(/\s+/g, " ").trim();
    if (s) rotatedText.push(s);
    rotatedRun = [];
    rotatedEnd = null;
  };
  const fontCache = new Map<string, { bold: boolean; italic: boolean }>();
  const styleFor = (fontName: string) => {
    let s = fontCache.get(fontName);
    if (!s) {
      let name = "";
      let bold = false;
      let italic = false;
      try {
        if (page.commonObjs.has(fontName)) {
          const f = page.commonObjs.get(fontName);
          name = f?.name ?? "";
          bold = !!(f?.bold || f?.black);
          italic = !!f?.italic;
        }
      } catch {
        /* font not loaded: fall back to no style */
      }
      const fromName = fontStyleFromName(name);
      s = { bold: bold || fromName.bold, italic: italic || fromName.italic };
      fontCache.set(fontName, s);
    }
    return s;
  };

  for (const item of tc.items as any[]) {
    if (typeof item.str !== "string") continue; // marked content
    const raw: string = item.str;
    const m = lib.Util.transform(vt, item.transform);
    // Horizontal baseline. A skewed vertical axis (m[2] ≠ 0) is still horizontal
    // text: it is how synthetic (oblique) italics are drawn.
    const horizontal = m[0] > 0 && Math.abs(m[1]) < 0.05 * Math.abs(m[0]) && Math.abs(m[3]) > 0;
    const oblique = horizontal && Math.abs(m[2]) > 0.08 * Math.abs(m[3]);
    if (!horizontal) {
      if (raw.trim()) {
        // Separate words unless this item starts where the previous one ended.
        const size = Math.hypot(m[2], m[3]) || 1;
        const len = Math.hypot(m[0], m[1]) || 1;
        const adjacent = rotatedEnd && Math.hypot(m[4] - rotatedEnd[0], m[5] - rotatedEnd[1]) < 0.2 * size;
        rotatedRun.push((adjacent || !rotatedRun.length ? "" : " ") + raw + (item.hasEOL ? " " : ""));
        const adv = (item.width || 0) / (Math.hypot(item.transform[0], item.transform[1]) || 1);
        rotatedEnd = [m[4] + (m[0] / len) * adv * len, m[5] + (m[1] / len) * adv * len];
      }
      continue;
    }
    if (rotatedRun.length) flushRotated();
    if (!raw.trim()) continue;
    const fs = Math.abs(m[3]);
    if (!(fs > 0.5)) continue;
    let w: number = item.width;
    let x = m[4];
    // Trim surrounding spaces, shifting the box proportionally.
    const lead = raw.length - raw.trimStart().length;
    const trail = raw.length - raw.trimEnd().length;
    const str = raw.trim();
    if ((lead || trail) && raw.length > 0) {
      const perChar = w / raw.length;
      x += lead * perChar;
      w -= (lead + trail) * perChar;
    }
    const style = styleFor(item.fontName);
    const family: string | undefined = tc.styles?.[item.fontName]?.fontFamily;
    pieces.push({
      str,
      x,
      y: m[5],
      w: Math.max(w, 0.1),
      fs,
      bold: style.bold,
      italic: style.italic || oblique,
      serif: family ? /serif/i.test(family) && !/sans/i.test(family) : undefined,
    });
  }
  flushRotated();

  // Drop exact duplicates (fake bold by double printing).
  const seen = new Set<string>();
  const unique = pieces.filter((p) => {
    const k = `${p.str}|${Math.round(p.x)}|${Math.round(p.y)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const images = findImageRects(opList, vt, lib, viewport.width, viewport.height);
  if (cropper && images.length) {
    const chars = unique.reduce((c, p) => c + p.str.length, 0);
    await cropper(page, images, { chars, width: viewport.width, height: viewport.height });
  }

  page.cleanup?.();
  return {
    pageNumber,
    width: viewport.width,
    height: viewport.height,
    pieces: unique,
    rotatedText,
    images,
  };
}
