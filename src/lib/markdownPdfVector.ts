/**
 * markdownPdfVector.ts
 *
 * Turns the laid-out Markdown DOM (already styled by the theme CSS in a hidden
 * container) into PDF pages with real, selectable text.
 *
 * The browser does the layout; this module walks the DOM and re-draws it with
 * PDF primitives:
 *   - text      → standard PDF fonts (Helvetica / Times / Courier families),
 *                 positioned at each line fragment's box and horizontally scaled
 *                 (Tz) so the width matches the browser's layout exactly
 *   - backgrounds / borders / rounded corners → vector paths
 *   - list markers, task checkboxes → vector text / shapes
 *   - <img> and Mermaid <svg> → embedded images
 *   - links     → URI link annotations
 *
 * Characters the standard fonts cannot encode (emoji, CJK, arrows…) are drawn
 * as small images at their exact position so the page still looks right.
 *
 * Page breaks are only placed between text lines and never inside elements
 * with `break-inside: avoid` (code blocks, tables, quotes, images) when they
 * fit on a page; a heading is never left alone at the bottom of a page.
 */

import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFName,
  PDFOperator,
  PDFPage,
  PDFString,
  StandardFonts,
  appendBezierCurve,
  beginText,
  clip,
  closePath,
  concatTransformationMatrix,
  drawObject,
  endPath,
  endText,
  fill,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  setCharacterSqueeze,
  setFillingRgbColor,
  setFontAndSize,
  setLineWidth,
  setStrokingRgbColor,
  setTextMatrix,
  showText,
  stroke,
} from "pdf-lib";

// ─── Types ──────────────────────────────────────────────────────────────────

export type RGB = [number, number, number];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type FontKey =
  | "sans" | "sans-b" | "sans-i" | "sans-bi"
  | "serif" | "serif-b" | "serif-i" | "serif-bi"
  | "mono" | "mono-b" | "mono-i" | "mono-bi";

const STANDARD_FONT: Record<FontKey, StandardFonts> = {
  sans: StandardFonts.Helvetica,
  "sans-b": StandardFonts.HelveticaBold,
  "sans-i": StandardFonts.HelveticaOblique,
  "sans-bi": StandardFonts.HelveticaBoldOblique,
  serif: StandardFonts.TimesRoman,
  "serif-b": StandardFonts.TimesRomanBold,
  "serif-i": StandardFonts.TimesRomanItalic,
  "serif-bi": StandardFonts.TimesRomanBoldItalic,
  mono: StandardFonts.Courier,
  "mono-b": StandardFonts.CourierBold,
  "mono-i": StandardFonts.CourierOblique,
  "mono-bi": StandardFonts.CourierBoldOblique,
};

interface RasterImage {
  key: string;
  bytes: Uint8Array;
  type: "png" | "jpg";
}

type Op =
  | { k: "fill"; b: Box; c: RGB; radius: number }
  | { k: "stroke"; b: Box; c: RGB; lw: number; radius: number }
  | { k: "line"; b: Box; x1: number; y1: number; x2: number; y2: number; c: RGB; lw: number }
  | { k: "poly"; b: Box; pts: [number, number][]; c: RGB; lw: number }
  | { k: "text"; b: Box; baseline: number; text: string; font: FontKey; size: number; c: RGB }
  | { k: "img"; b: Box; img: RasterImage }
  | { k: "clipPush"; b: Box; radius: number }
  | { k: "clipPop"; b: Box }
  | { k: "link"; b: Box; url: string };

interface Atom {
  top: number;
  bottom: number;
  keepWithNext?: boolean;
}

export interface VectorRenderOptions {
  pdfDoc: PDFDocument;
  /** The laid-out `.markdown-body` element (must be attached to the document). */
  root: HTMLElement;
  pageSize: [number, number];
  /** Content box on each page, in PDF points (y = top edge of the content box). */
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  contentHeight: number;
  pageBackground: RGB;
  /** Draws header / footer after the content of each page. */
  decorate?: (page: PDFPage, pageIndex: number, pageCount: number) => void;
}

export interface VectorRenderResult {
  pageCount: number;
  textFragments: number;
  rasterizedGlyphRuns: number;
  warnings: string[];
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function parseColor(s: string | null | undefined): { c: RGB; a: number } | null {
  if (!s) return null;
  const m = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/);
  if (!m) return null;
  const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return { c: [+m[1] / 255, +m[2] / 255, +m[3] / 255], a };
}

function blend(c: RGB, a: number, backdrop: RGB): RGB {
  const t = Math.max(0, Math.min(1, a));
  return [c[0] * t + backdrop[0] * (1 - t), c[1] * t + backdrop[1] * (1 - t), c[2] * t + backdrop[2] * (1 - t)];
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function cssRgb(c: RGB): string {
  return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
}

function fontShorthand(cs: CSSStyleDeclaration): string {
  return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
}

function pickFont(cs: CSSStyleDeclaration): FontKey {
  const fam = cs.fontFamily.toLowerCase();
  let kind: "sans" | "serif" | "mono" = "sans";
  if (/mono|courier|consolas|menlo|monaco/.test(fam)) kind = "mono";
  else if (/sans-serif|system-ui|-apple-system|blinkmacsystemfont|segoe|helvetica|arial|inter\b/.test(fam)) kind = "sans";
  else if (/serif|georgia|times|merriweather|baskerville|garamond/.test(fam)) kind = "serif";
  const weight = cs.fontWeight === "bold" ? 700 : parseInt(cs.fontWeight, 10) || 400;
  const bold = weight >= 600;
  const italic = cs.fontStyle !== "normal";
  return `${kind}${bold || italic ? "-" : ""}${bold ? "b" : ""}${italic ? "i" : ""}` as FontKey;
}

function applyTransform(text: string, transform: string): string {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize") return text.replace(/(^|\s)(\S)/g, (_, a: string, b: string) => a + b.toUpperCase());
  return text;
}

function uniformRadius(cs: CSSStyleDeclaration): number {
  const r = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(
    (v) => parseFloat(v) || 0
  );
  return r.every((v) => Math.abs(v - r[0]) < 0.01) ? r[0] : 0;
}

function dataUrlBytes(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = src;
  });
}

/** Draws `source` into a canvas of w×h CSS px at `scale` and returns PNG bytes. */
function canvasPng(source: CanvasImageSource, w: number, h: number, maxScale = 3): Uint8Array {
  const scale = Math.max(1, Math.min(maxScale, Math.sqrt(12_000_000 / Math.max(1, w * h))));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return dataUrlBytes(canvas.toDataURL("image/png")); // throws if the canvas is tainted
}

let rasterCounter = 0;

async function imageFromImg(img: HTMLImageElement, w: number, h: number): Promise<RasterImage | null> {
  if (!img.complete || img.naturalWidth === 0) return null;
  const src = img.currentSrc || img.src;
  const key = `img:${src}:${Math.round(w)}x${Math.round(h)}`;
  const dm = /^data:image\/(png|jpe?g);base64,/i.exec(src);
  if (dm) return { key, bytes: dataUrlBytes(src), type: dm[1].toLowerCase() === "png" ? "png" : "jpg" };
  try {
    const res = await fetch(src, { mode: "cors" });
    if (res.ok) {
      const blob = await res.blob();
      if (/image\/png/i.test(blob.type)) return { key, bytes: new Uint8Array(await blob.arrayBuffer()), type: "png" };
      if (/image\/jpe?g/i.test(blob.type)) return { key, bytes: new Uint8Array(await blob.arrayBuffer()), type: "jpg" };
      const bmp = await createImageBitmap(blob);
      return { key, bytes: canvasPng(bmp, Math.min(bmp.width, w * 2), Math.min(bmp.height, h * 2), 1), type: "png" };
    }
  } catch {
    // Cross-origin without CORS: try the already-decoded element below.
  }
  try {
    return { key, bytes: canvasPng(img, w, h, 2), type: "png" };
  } catch {
    return null;
  }
}

async function imageFromSvg(svg: SVGSVGElement, w: number, h: number): Promise<RasterImage | null> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  clone.style.maxWidth = "none";
  clone.style.maxHeight = "none";
  const xml = new XMLSerializer().serializeToString(clone);
  try {
    const img = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml));
    return { key: `svg:${++rasterCounter}`, bytes: canvasPng(img, w, h, 3), type: "png" };
  } catch {
    return null;
  }
}

function roundedRectPath(x: number, y: number, w: number, h: number, radius: number): PDFOperator[] {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (r < 0.05) return [rectangle(x, y, w, h)];
  const k = 0.5523 * r;
  return [
    moveTo(x + r, y),
    lineTo(x + w - r, y),
    appendBezierCurve(x + w - r + k, y, x + w, y + r - k, x + w, y + r),
    lineTo(x + w, y + h - r),
    appendBezierCurve(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h),
    lineTo(x + r, y + h),
    appendBezierCurve(x + r - k, y + h, x, y + h - r + k, x, y + h - r),
    lineTo(x, y + r),
    appendBezierCurve(x, y + r - k, x + r - k, y, x + r, y),
    closePath(),
  ];
}

function toRoman(n: number): string {
  const map: [number, string][] = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let out = "";
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

function toAlpha(n: number): string {
  let out = "";
  while (n > 0) { n--; out = String.fromCharCode(97 + (n % 26)) + out; n = Math.floor(n / 26); }
  return out;
}

// ─── Layout collection ──────────────────────────────────────────────────────

type CharClass = "w" | "s" | "u" | "n" | "z";

class Collector {
  ops: Op[] = [];
  atoms: Atom[] = [];
  warnings: string[] = [];
  textFragments = 0;
  rasterRuns = 0;
  private range = document.createRange();
  private originX: number;
  private originY: number;
  private metricCache = new Map<string, number>();
  private charCache = new Map<number, boolean>();
  private rasterCache = new Map<string, RasterImage>();
  private measureCtx = document.createElement("canvas").getContext("2d");

  constructor(
    private root: HTMLElement,
    private encoder: PDFFont,
    private pageHeightPx: number
  ) {
    const r = root.getBoundingClientRect();
    this.originX = r.left;
    this.originY = r.top;
  }

  private rel(r: DOMRect): Box {
    return { x: r.left - this.originX, y: r.top - this.originY, w: r.width, h: r.height };
  }

  /** ascent / (ascent + descent) of the primary font, used to find the baseline in a text box. */
  private ascentRatio(cs: CSSStyleDeclaration): number {
    const key = fontShorthand(cs);
    let v = this.metricCache.get(key);
    if (v === undefined) {
      v = 0.8;
      if (this.measureCtx) {
        this.measureCtx.font = key;
        const m = this.measureCtx.measureText("Hg");
        const asc = m.fontBoundingBoxAscent;
        const desc = m.fontBoundingBoxDescent;
        if (Number.isFinite(asc) && Number.isFinite(desc) && asc + desc > 0) v = asc / (asc + desc);
      }
      this.metricCache.set(key, v);
    }
    return v;
  }

  private classify(cp: number): CharClass {
    if (cp === 10 || cp === 13) return "n";
    if (cp === 32 || cp === 9 || cp === 12) return "s";
    // Soft hyphen and zero-width characters are not painted.
    if (cp === 0xad || cp === 0x200b || cp === 0x2060 || cp === 0xfeff) return "z";
    // Joiners / variation selectors / skin-tone modifiers belong to emoji runs.
    if (cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0x1f3fb && cp <= 0x1f3ff)) return "u";
    let ok = this.charCache.get(cp);
    if (ok === undefined) {
      try {
        this.encoder.encodeText(String.fromCodePoint(cp));
        ok = true;
      } catch {
        ok = false;
      }
      this.charCache.set(cp, ok);
    }
    return ok ? "w" : "u";
  }

  async walk(el: Element, opacity: number, backdrop: RGB): Promise<void> {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") return;
    const op = opacity * (parseFloat(cs.opacity) || (cs.opacity === "0" ? 0 : 1));
    if (op <= 0.001) return;

    const isRoot = el === this.root;
    const rect = this.rel(el.getBoundingClientRect());
    let childBackdrop = backdrop;
    if (!isRoot) childBackdrop = this.paintBox(el, cs, op, backdrop);

    // Clickable links.
    if (el instanceof HTMLAnchorElement && /^(https?:|mailto:)/i.test(el.href)) {
      for (const r of Array.from(el.getClientRects())) {
        if (r.width > 0 && r.height > 0) this.ops.push({ k: "link", b: this.rel(r), url: el.href });
      }
    }

    // Pagination hints from the theme CSS.
    if (!isRoot && rect.h > 0) {
      const avoidInside = /avoid/.test(cs.breakInside) || /avoid/.test(cs.getPropertyValue("page-break-inside"));
      if (avoidInside && rect.h <= this.pageHeightPx * 0.5) this.atoms.push({ top: rect.y, bottom: rect.y + rect.h });
      if (/^H[1-6]$/.test(el.tagName)) this.atoms.push({ top: rect.y, bottom: rect.y + rect.h, keepWithNext: true });
      if (el.tagName === "TR" && rect.h <= this.pageHeightPx / 3) this.atoms.push({ top: rect.y, bottom: rect.y + rect.h });
    }

    // Replaced content.
    if (el instanceof HTMLImageElement) {
      if (rect.w > 0 && rect.h > 0) {
        const img = await imageFromImg(el, rect.w, rect.h);
        if (img) this.ops.push({ k: "img", b: rect, img });
        else this.warnings.push(`Image could not be embedded: ${(el.currentSrc || el.src).slice(0, 80)}`);
        this.atoms.push({ top: rect.y, bottom: rect.y + rect.h });
      }
      return;
    }
    if (el instanceof SVGSVGElement) {
      if (rect.w > 0 && rect.h > 0) {
        const img = await imageFromSvg(el, rect.w, rect.h);
        if (img) this.ops.push({ k: "img", b: rect, img });
        else this.warnings.push("A diagram could not be embedded.");
        this.atoms.push({ top: rect.y, bottom: rect.y + rect.h });
      }
      return;
    }
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox") this.checkbox(el, cs, rect, backdrop);
      return;
    }

    // Overflow clipping with rounded corners (code blocks, table wrapper).
    const radius = uniformRadius(cs);
    const clips = !isRoot && radius > 0 && (cs.overflowX !== "visible" || cs.overflowY !== "visible");
    if (clips) this.ops.push({ k: "clipPush", b: rect, radius });

    const markerAt = this.ops.length;
    const textBefore = this.textFragments;
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) this.text(child as Text, cs, op, childBackdrop);
      else if (child.nodeType === Node.ELEMENT_NODE) await this.walk(child as Element, op, childBackdrop);
    }

    if (clips) this.ops.push({ k: "clipPop", b: rect });

    if (cs.display === "list-item" && cs.listStyleType !== "none" && this.textFragments > textBefore) {
      this.listMarker(el, cs, op, backdrop, markerAt);
    }
  }

  /** Background + borders. Returns the backdrop colour for the children. */
  private paintBox(el: Element, cs: CSSStyleDeclaration, opacity: number, backdrop: RGB): RGB {
    const rects = Array.from(el.getClientRects())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => this.rel(r));
    if (rects.length === 0) return backdrop;
    const radius = uniformRadius(cs);
    let next = backdrop;

    const bg = parseColor(cs.backgroundColor);
    if (bg && bg.a > 0) {
      const c = blend(bg.c, bg.a * opacity, backdrop);
      for (const b of rects) this.ops.push({ k: "fill", b, c, radius });
      next = c;
    }

    const side = (w: string, s: string, c: string) => {
      const width = parseFloat(w) || 0;
      const color = parseColor(c);
      if (width <= 0 || s === "none" || s === "hidden" || !color || color.a <= 0) return null;
      return { width, color: blend(color.c, color.a * opacity, backdrop), key: `${width}|${c}` };
    };
    const top = side(cs.borderTopWidth, cs.borderTopStyle, cs.borderTopColor);
    const right = side(cs.borderRightWidth, cs.borderRightStyle, cs.borderRightColor);
    const bottom = side(cs.borderBottomWidth, cs.borderBottomStyle, cs.borderBottomColor);
    const left = side(cs.borderLeftWidth, cs.borderLeftStyle, cs.borderLeftColor);
    if (!top && !right && !bottom && !left) return next;

    const uniform = top && right && bottom && left && top.key === right.key && top.key === bottom.key && top.key === left.key;
    for (const b of rects) {
      if (uniform && top) {
        const lw = top.width;
        this.ops.push({ k: "stroke", b: { x: b.x + lw / 2, y: b.y + lw / 2, w: b.w - lw, h: b.h - lw }, c: top.color, lw, radius: Math.max(0, radius - lw / 2) });
        continue;
      }
      if (top) this.ops.push({ k: "line", b, x1: b.x, y1: b.y + top.width / 2, x2: b.x + b.w, y2: b.y + top.width / 2, c: top.color, lw: top.width });
      if (bottom) this.ops.push({ k: "line", b, x1: b.x, y1: b.y + b.h - bottom.width / 2, x2: b.x + b.w, y2: b.y + b.h - bottom.width / 2, c: bottom.color, lw: bottom.width });
      if (left) this.ops.push({ k: "line", b, x1: b.x + left.width / 2, y1: b.y, x2: b.x + left.width / 2, y2: b.y + b.h, c: left.color, lw: left.width });
      if (right) this.ops.push({ k: "line", b, x1: b.x + b.w - right.width / 2, y1: b.y, x2: b.x + b.w - right.width / 2, y2: b.y + b.h, c: right.color, lw: right.width });
    }
    return next;
  }

  private checkbox(el: HTMLInputElement, cs: CSSStyleDeclaration, b: Box, backdrop: RGB) {
    const accent = parseColor(cs.accentColor)?.c ?? hexToRgb("#0969da");
    const border: RGB = blend([0.46, 0.46, 0.46], 1, backdrop);
    const r = Math.min(3, b.w / 4);
    if (el.checked) {
      this.ops.push({ k: "fill", b, c: accent, radius: r });
      this.ops.push({
        k: "poly",
        b,
        pts: [
          [b.x + b.w * 0.24, b.y + b.h * 0.52],
          [b.x + b.w * 0.42, b.y + b.h * 0.7],
          [b.x + b.w * 0.77, b.y + b.h * 0.32],
        ],
        c: [1, 1, 1],
        lw: Math.max(1, b.w * 0.13),
      });
    } else {
      this.ops.push({ k: "fill", b, c: backdrop, radius: r });
      this.ops.push({ k: "stroke", b: { x: b.x + 0.5, y: b.y + 0.5, w: b.w - 1, h: b.h - 1 }, c: border, lw: 1, radius: r });
    }
    this.atoms.push({ top: b.y, bottom: b.y + b.h });
  }

  private listMarker(el: Element, cs: CSSStyleDeclaration, opacity: number, backdrop: RGB, insertAt: number) {
    // Anchor on the first text line drawn inside this item.
    const first = this.ops.slice(insertAt).find((o) => o.k === "text") as Extract<Op, { k: "text" }> | undefined;
    if (!first) return;
    const liRect = this.rel(el.getBoundingClientRect());
    const size = parseFloat(cs.fontSize) || 16;
    const color = parseColor(cs.color);
    const c = blend(color?.c ?? [0, 0, 0], (color?.a ?? 1) * opacity, backdrop);
    let spaceW = size * 0.28;
    if (this.measureCtx) {
      this.measureCtx.font = fontShorthand(cs);
      spaceW = this.measureCtx.measureText(" ").width || spaceW;
    }
    const right = liRect.x - spaceW;
    const type = cs.listStyleType;
    const baseline = first.baseline;
    const marker: Op[] = [];

    if (type === "disc" || type === "circle" || type === "square") {
      const d = size * 0.34;
      const cx = right - d / 2 - size * 0.08;
      const cy = baseline - size * 0.3;
      const box = { x: cx - d / 2, y: cy - d / 2, w: d, h: d };
      if (type === "disc") marker.push({ k: "fill", b: box, c, radius: d / 2 });
      else if (type === "circle") marker.push({ k: "stroke", b: box, c, lw: Math.max(0.8, size / 16), radius: d / 2 });
      else marker.push({ k: "fill", b: box, c, radius: 0 });
    } else {
      const parent = el.parentElement;
      const siblings = parent ? Array.from(parent.children).filter((n) => n.tagName === "LI") : [el];
      const start = parent instanceof HTMLOListElement && parent.hasAttribute("start") ? parent.start : 1;
      const n = start + Math.max(0, siblings.indexOf(el));
      const label =
        type === "lower-alpha" || type === "lower-latin" ? toAlpha(n)
        : type === "upper-alpha" || type === "upper-latin" ? toAlpha(n).toUpperCase()
        : type === "lower-roman" ? toRoman(n)
        : type === "upper-roman" ? toRoman(n).toUpperCase()
        : String(n);
      const text = `${label}.`;
      let w = text.length * size * 0.55;
      if (this.measureCtx) w = this.measureCtx.measureText(text).width || w;
      marker.push({ k: "text", b: { x: right - w, y: first.b.y, w, h: first.b.h }, baseline, text, font: pickFont(cs), size, c });
      this.textFragments++;
    }
    this.ops.splice(insertAt, 0, ...marker);
  }

  private decorations(el: Element | null): { underline: boolean; strike: boolean } {
    let underline = false;
    let strike = false;
    let cur: Element | null = el;
    while (cur && cur !== this.root) {
      const c = getComputedStyle(cur);
      const d = c.textDecorationLine || "";
      if (d.includes("underline")) underline = true;
      if (d.includes("line-through")) strike = true;
      if (!c.display.startsWith("inline")) break;
      cur = cur.parentElement;
    }
    return { underline, strike };
  }

  private text(node: Text, cs: CSSStyleDeclaration, opacity: number, backdrop: RGB) {
    const data = node.data;
    if (!data) return;
    const ws = cs.whiteSpace;
    const keepSpaces = ws === "pre" || ws === "pre-wrap" || ws === "break-spaces";
    const color = parseColor(cs.color);
    const c = blend(color?.c ?? [0, 0, 0], (color?.a ?? 1) * opacity, backdrop);
    const font = pickFont(cs);
    const size = parseFloat(cs.fontSize) || 16;
    const ascent = this.ascentRatio(cs);

    // 1. Tokenise into runs of one character class.
    const toks: { s: number; e: number; t: CharClass }[] = [];
    for (let i = 0; i < data.length; ) {
      const cp = data.codePointAt(i) ?? 32;
      const len = cp > 0xffff ? 2 : 1;
      const t = this.classify(cp);
      const last = toks[toks.length - 1];
      if (last && last.t === t && t !== "n") last.e = i + len;
      else toks.push({ s: i, e: i + len, t });
      i += len;
    }

    // 2. Measure each run (split into characters if the run wraps).
    type Item = { t: "w" | "s" | "u"; text: string; b: Box };
    const items: Item[] = [];
    const measure = (s: number, e: number): Box[] => {
      this.range.setStart(node, s);
      this.range.setEnd(node, e);
      return Array.from(this.range.getClientRects())
        .filter((r) => r.width > 0.01 && r.height > 0)
        .map((r) => this.rel(r));
    };
    for (const tok of toks) {
      if (tok.t === "n" || tok.t === "z") continue;
      const boxes = measure(tok.s, tok.e);
      if (boxes.length === 0) continue;
      const text = data.slice(tok.s, tok.e);
      if (boxes.length === 1 || tok.t === "s") {
        items.push({ t: tok.t, text, b: boxes[0] });
        continue;
      }
      for (let i = tok.s; i < tok.e; ) {
        const cp = data.codePointAt(i) ?? 32;
        const len = cp > 0xffff ? 2 : 1;
        const bx = measure(i, i + len);
        if (bx.length) items.push({ t: tok.t, text: data.slice(i, i + len), b: bx[0] });
        i += len;
      }
    }
    if (items.length === 0) return;

    // 3. Group into visual lines.
    const lines: Item[][] = [];
    for (const it of items) {
      const line = lines[lines.length - 1];
      const prev = line?.[line.length - 1];
      if (!prev || it.b.y > prev.b.y + prev.b.h * 0.5 || it.b.x < prev.b.x - 1) lines.push([it]);
      else line.push(it);
    }

    const deco = this.decorations(node.parentElement);

    // 4. Emit one text op per run of encodable text, images for the rest.
    for (const line of lines) {
      const words = line.filter((i) => i.t === "w");
      const lineTop = words.length ? Math.min(...words.map((i) => i.b.y)) : Math.min(...line.map((i) => i.b.y));
      const lineH = words.length ? Math.max(...words.map((i) => i.b.h)) : Math.max(...line.map((i) => i.b.h));
      const baseline = lineTop + lineH * ascent;

      let run: Item[] = [];
      const flush = () => {
        if (run.length === 0) return;
        const kind = run[0].t === "u" ? "u" : "w";
        // Collapsed whitespace never gets a box, so every space left here is
        // really painted (e.g. the gap before a <strong>) and is kept.
        const seg = run;
        run = [];
        const x0 = seg[0].b.x;
        const x1 = seg[seg.length - 1].b.x + seg[seg.length - 1].b.w;
        const box: Box = { x: x0, y: lineTop, w: x1 - x0, h: lineH };
        if (box.w <= 0.3) return;
        if (kind === "u") {
          this.rasterRun(seg.map((i) => i.text).join(""), cs, c, box, baseline);
          return;
        }
        let text = seg.map((i) => (i.t === "s" ? (keepSpaces ? i.text.replace(/\t/g, "    ").replace(/\f/g, " ") : " ") : i.text)).join("");
        text = applyTransform(text, cs.textTransform);
        this.ops.push({ k: "text", b: box, baseline, text, font, size, c });
        this.textFragments++;
        if (text.trim()) this.atoms.push({ top: lineTop, bottom: lineTop + lineH });
        const lw = Math.max(0.6, size / 16);
        if (deco.underline) this.ops.push({ k: "line", b: box, x1: x0, y1: baseline + size * 0.12, x2: x1, y2: baseline + size * 0.12, c, lw });
        if (deco.strike) this.ops.push({ k: "line", b: box, x1: x0, y1: baseline - size * 0.28, x2: x1, y2: baseline - size * 0.28, c, lw });
      };
      for (const it of line) {
        const isU = it.t === "u";
        if (run.length && (run[0].t === "u") !== isU) flush();
        run.push(it);
      }
      flush();
    }
  }

  /** Paints characters the PDF standard fonts cannot encode (emoji, CJK…) as an image. */
  private rasterRun(text: string, cs: CSSStyleDeclaration, c: RGB, box: Box, baseline: number) {
    const key = `glyph:${text}|${fontShorthand(cs)}|${cssRgb(c)}|${box.w.toFixed(1)}x${box.h.toFixed(1)}`;
    let img = this.rasterCache.get(key);
    if (!img) {
      const scale = 4;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(box.w * scale));
      canvas.height = Math.max(1, Math.ceil(box.h * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.font = fontShorthand(cs);
      ctx.fillStyle = cssRgb(c);
      ctx.textBaseline = "alphabetic";
      ctx.fillText(text, 0, baseline - box.y);
      img = { key, bytes: dataUrlBytes(canvas.toDataURL("image/png")), type: "png" };
      this.rasterCache.set(key, img);
    }
    this.ops.push({ k: "img", b: box, img });
    this.rasterRuns++;
    this.atoms.push({ top: box.y, bottom: box.y + box.h });
  }
}

// ─── Pagination ─────────────────────────────────────────────────────────────

/** Returns the top (CSS px) of every page slice. */
export function paginate(atoms: Atom[], totalHeight: number, pageHeight: number): number[] {
  const sorted = atoms.filter((a) => a.bottom > a.top).sort((a, b) => a.top - b.top);
  const tops = [0];
  let top = 0;
  let guard = 0;
  while (top + pageHeight < totalHeight - 0.5 && guard++ < 10000) {
    let brk = top + pageHeight;
    // Never cut through an atom (text line, image, avoid-break block) that fits on a page.
    for (let changed = true; changed; ) {
      changed = false;
      for (const a of sorted) {
        if (a.top > top + 0.5 && a.top < brk - 0.01 && a.bottom > brk + 0.01 && a.bottom - a.top <= pageHeight) {
          brk = a.top;
          changed = true;
        }
      }
    }
    // Keep headings with the content that follows them.
    const inside = sorted.filter((a) => a.top >= top - 0.5 && a.bottom <= brk + 0.5 && !a.keepWithNext);
    const lastBottom = inside.length ? Math.max(...inside.map((a) => a.bottom)) : top;
    const heading = sorted.find(
      (a) => a.keepWithNext && a.top > top + pageHeight * 0.3 && a.bottom <= brk + 0.5 && lastBottom <= a.bottom + 0.5
    );
    if (heading) brk = heading.top;
    // Degenerate case (nothing fits): hard cut.
    if (brk <= top + pageHeight * 0.3) brk = top + pageHeight;
    tops.push(brk);
    top = brk;
  }
  return tops;
}

// ─── Main entry ─────────────────────────────────────────────────────────────

export async function renderMarkdownDomToPdf(opts: VectorRenderOptions): Promise<VectorRenderResult> {
  const { pdfDoc, root, pageSize, contentLeft, contentTop, contentWidth, contentHeight, pageBackground, decorate } = opts;

  const rootWidthPx = root.getBoundingClientRect().width || 1;
  const s = contentWidth / rootWidthPx; // PDF points per CSS px
  const pageHeightPx = contentHeight / s;

  const fonts = new Map<FontKey, PDFFont>();
  const getFont = async (k: FontKey) => {
    let f = fonts.get(k);
    if (!f) {
      f = await pdfDoc.embedFont(STANDARD_FONT[k]);
      fonts.set(k, f);
    }
    return f;
  };

  const collector = new Collector(root, await getFont("sans"), pageHeightPx);
  await collector.walk(root, 1, pageBackground);
  const { ops, atoms } = collector;

  const totalHeight = Math.max(root.scrollHeight, root.getBoundingClientRect().height, 1);
  const tops = paginate(atoms, totalHeight, pageHeightPx);
  const pageCount = tops.length;

  // Embed fonts and images once.
  for (const o of ops) if (o.k === "text") await getFont(o.font);
  const images = new Map<string, PDFImage>();
  for (const o of ops) {
    if (o.k !== "img" || images.has(o.img.key)) continue;
    try {
      images.set(o.img.key, o.img.type === "png" ? await pdfDoc.embedPng(o.img.bytes) : await pdfDoc.embedJpg(o.img.bytes));
    } catch {
      collector.warnings.push("An image could not be embedded.");
    }
  }

  const isWhite = pageBackground.every((v) => v > 0.995);

  for (let p = 0; p < pageCount; p++) {
    const T = tops[p];
    const N = p + 1 < pageCount ? tops[p + 1] : Math.max(totalHeight, T + 1);
    const page = pdfDoc.addPage(pageSize);
    const [pw, ph] = pageSize;
    const X = (x: number) => contentLeft + x * s;
    const Y = (y: number) => contentTop - (y - T) * s;
    const fontNames = new Map<FontKey, PDFName>();
    const imageNames = new Map<string, PDFName>();

    const list: PDFOperator[] = [];
    if (!isWhite) list.push(pushGraphicsState(), setFillingRgbColor(...pageBackground), rectangle(0, 0, pw, ph), fill(), popGraphicsState());
    const sliceH = (N - T) * s;
    list.push(pushGraphicsState(), rectangle(contentLeft - 1, contentTop - sliceH, contentWidth + 2, sliceH), clip(), endPath());

    const visible = (b: Box) => b.y + b.h > T && b.y < N;
    const links: { b: Box; url: string }[] = [];

    for (const o of ops) {
      if (o.k === "text") {
        const mid = o.b.y + o.b.h / 2;
        if (mid < T || mid >= N) continue;
        const font = fonts.get(o.font);
        if (!font) continue;
        let encoded;
        try {
          encoded = font.encodeText(o.text);
        } catch {
          continue;
        }
        const sizePt = o.size * s;
        const natural = font.widthOfTextAtSize(o.text, sizePt);
        const tz = natural > 0 ? Math.max(20, Math.min(400, ((o.b.w * s) / natural) * 100)) : 100;
        let name = fontNames.get(o.font);
        if (!name) {
          name = page.node.newFontDictionary("F", font.ref);
          fontNames.set(o.font, name);
        }
        list.push(
          beginText(),
          setFillingRgbColor(...o.c),
          setFontAndSize(name, sizePt),
          setCharacterSqueeze(tz),
          setTextMatrix(1, 0, 0, 1, X(o.b.x), Y(o.baseline)),
          showText(encoded),
          endText()
        );
        continue;
      }
      if (!visible(o.b)) continue;
      switch (o.k) {
        case "fill":
          list.push(pushGraphicsState(), setFillingRgbColor(...o.c), ...roundedRectPath(X(o.b.x), Y(o.b.y + o.b.h), o.b.w * s, o.b.h * s, o.radius * s), fill(), popGraphicsState());
          break;
        case "stroke":
          list.push(pushGraphicsState(), setStrokingRgbColor(...o.c), setLineWidth(o.lw * s), ...roundedRectPath(X(o.b.x), Y(o.b.y + o.b.h), o.b.w * s, o.b.h * s, o.radius * s), stroke(), popGraphicsState());
          break;
        case "line":
          list.push(pushGraphicsState(), setStrokingRgbColor(...o.c), setLineWidth(o.lw * s), moveTo(X(o.x1), Y(o.y1)), lineTo(X(o.x2), Y(o.y2)), stroke(), popGraphicsState());
          break;
        case "poly":
          list.push(pushGraphicsState(), setStrokingRgbColor(...o.c), setLineWidth(o.lw * s), moveTo(X(o.pts[0][0]), Y(o.pts[0][1])), ...o.pts.slice(1).map(([x, y]) => lineTo(X(x), Y(y))), stroke(), popGraphicsState());
          break;
        case "img": {
          const img = images.get(o.img.key);
          if (!img) break;
          let name = imageNames.get(o.img.key);
          if (!name) {
            name = page.node.newXObject("Im", img.ref);
            imageNames.set(o.img.key, name);
          }
          list.push(pushGraphicsState(), concatTransformationMatrix(o.b.w * s, 0, 0, o.b.h * s, X(o.b.x), Y(o.b.y + o.b.h)), drawObject(name), popGraphicsState());
          break;
        }
        case "clipPush":
          list.push(pushGraphicsState(), ...roundedRectPath(X(o.b.x), Y(o.b.y + o.b.h), o.b.w * s, o.b.h * s, o.radius * s), clip(), endPath());
          break;
        case "clipPop":
          list.push(popGraphicsState());
          break;
        case "link":
          links.push(o);
          break;
      }
    }
    list.push(popGraphicsState());
    page.pushOperators(...list);

    // Clickable links, clipped to this page's slice.
    for (const l of links) {
      const y0 = Math.max(l.b.y, T);
      const y1 = Math.min(l.b.y + l.b.h, N);
      if (y1 - y0 < 1) continue;
      const annot = pdfDoc.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [X(l.b.x), Y(y1), X(l.b.x + l.b.w), Y(y0)],
        Border: [0, 0, 0],
        A: { Type: "Action", S: "URI", URI: PDFString.of(l.url) },
      });
      page.node.addAnnot(pdfDoc.context.register(annot));
    }

    decorate?.(page, p, pageCount);
  }

  return {
    pageCount,
    textFragments: collector.textFragments,
    rasterizedGlyphRuns: collector.rasterRuns,
    warnings: collector.warnings,
  };
}
