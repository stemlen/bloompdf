/**
 * unicodeText.ts
 * Unicode fallback fonts for the PDF writers that otherwise use the 14
 * standard PDF fonts (WinAnsi only): Text to PDF and the OCR text layer.
 *
 * - Characters the standard font can encode keep using it (output unchanged).
 * - Other characters get a self-hosted Noto font (OFL, /public/fonts/noto),
 *   fetched on demand: only the files for the scripts actually present.
 * - Devanagari and Arabic are shaped with HarfBuzz (WASM, also fetched on
 *   demand) so conjuncts, matra reordering and Arabic joining are correct.
 *   Other fallback text (✓, Greek, Cyrillic, ...) is laid out with fontkit.
 * - Shaped glyph ids are written directly (Type0 / Identity-H CID font,
 *   subset to the glyphs used) and each run is wrapped in a /Span with
 *   /ActualText holding the original string, so copy/paste and pdftotext
 *   return the original text.
 * - For extractors that ignore ActualText (pdf.js / Firefox), the ToUnicode
 *   CMap is built from HarfBuzz clusters: each cluster's text is spread over
 *   its glyphs in content-stream order (plus invisible zero-width "carrier"
 *   glyphs for combining marks), so concatenating ToUnicode strings in
 *   stream order gives the original text (see layoutToUnicode). CIDs are
 *   allocated per (glyph, text) pair with a CIDToGIDMap, so a glyph used in
 *   different contexts (e.g. an Arabic dotless body shared by several
 *   letters) gets the right mapping each time.
 * - Lines containing Arabic are laid out with a simplified bidi algorithm
 *   (paragraph direction from the first strong character; RTL/LTR runs
 *   reordered per line). Text is never rasterised.
 */

import {
  PDFArray,
  PDFDocument,
  PDFFont,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFOperator,
  PDFOperatorNames as Ops,
  PDFPage,
  PDFRef,
  PDFString,
  beginText,
  endText,
  moveText,
  popGraphicsState,
  pushGraphicsState,
  setCharacterSqueeze,
  setFillingColor,
  setFontAndSize,
  setTextRenderingMode,
  setTextRise,
  showText,
  TextRenderingMode,
  type Color,
} from "@cantoo/pdf-lib";
import type { Font as FkFont, Subset as FkSubset } from "@pdf-lib/fontkit";
import { loadHarfBuzz, type HbFont, type ShapedGlyph } from "./harfbuzz";

// ─── Font registry ──────────────────────────────────────────────────────────

type Slot = "deva" | "arab" | "noto" | "sym" | "math";

interface FontSpec {
  url: string;
  /** HarfBuzz script + language for complex scripts; others use fontkit */
  hb?: { script: string; language: string };
  /** Code point ranges the (subset) font file covers; used to decide what to fetch */
  ranges: [number, number][];
}

const FONT_BASE = "/fonts/noto/";
const FONTS: Record<Slot, FontSpec> = {
  deva: {
    url: FONT_BASE + "NotoSansDevanagari-Regular.subset.ttf",
    hb: { script: "Deva", language: "hi" },
    ranges: [[0x0900, 0x097f], [0xa8e0, 0xa8ff], [0x1cd0, 0x1cff]],
  },
  arab: {
    url: FONT_BASE + "NotoSansArabic-Regular.subset.ttf",
    hb: { script: "Arab", language: "ar" },
    ranges: [[0x0600, 0x06ff], [0x0750, 0x077f], [0x08a0, 0x08ff], [0xfb50, 0xfdff], [0xfe70, 0xfeff]],
  },
  noto: {
    url: FONT_BASE + "NotoSans-Regular.subset.ttf",
    ranges: [[0x00a0, 0x024f], [0x02b0, 0x036f], [0x0370, 0x03ff], [0x0400, 0x052f], [0x1e00, 0x1eff], [0x2000, 0x218f]],
  },
  sym: {
    url: FONT_BASE + "NotoSansSymbols2-Regular.subset.ttf",
    ranges: [[0x2300, 0x27bf], [0x2900, 0x297f], [0x2b00, 0x2bff]],
  },
  math: {
    url: FONT_BASE + "NotoSansMath-Regular.subset.ttf",
    ranges: [[0x2190, 0x22ff], [0x27f0, 0x27ff]],
  },
};
/** Lookup order for characters that several fonts might cover. */
const SLOT_ORDER: Slot[] = ["deva", "arab", "noto", "sym", "math"];

const inRanges = (cp: number, ranges: [number, number][]) => ranges.some(([a, b]) => cp >= a && cp <= b);
const isArabic = (cp: number) => inRanges(cp, FONTS.arab.ranges);
/** Combining marks, ZWNJ/ZWJ and variation selectors stay with the previous character. */
const isJoining = (ch: string) => /[\p{M}\u200c\u200d\ufe00-\ufe0f]/u.test(ch);

const fileCache = new Map<string, Promise<Uint8Array>>();
function fetchFont(url: string): Promise<Uint8Array> {
  let p = fileCache.get(url);
  if (!p) {
    p = fetch(url).then(async (r) => {
      if (!r.ok) throw new Error(`Could not load font ${url} (${r.status})`);
      return new Uint8Array(await r.arrayBuffer());
    });
    p.catch(() => fileCache.delete(url));
    fileCache.set(url, p);
  }
  return p;
}

type FontkitModule = { create(buffer: Uint8Array): FkFont };
let fontkitPromise: Promise<FontkitModule> | null = null;
function loadFontkit(): Promise<FontkitModule> {
  fontkitPromise ??= import("@pdf-lib/fontkit").then((m) => (m as unknown as { default?: FontkitModule }).default ?? (m as unknown as FontkitModule));
  return fontkitPromise;
}

// ─── Embedded (Type0 / CIDFontType2) font ────────────────────────────────────

interface Positioned {
  gid: number;
  /** UTF-16 index of the glyph's cluster in the shaped text */
  cluster: number;
  xAdvance: number;
  xOffset: number;
  yOffset: number;
  /** Text this glyph maps to in the ToUnicode CMap (see layoutToUnicode) */
  text: string;
  /** Invisible zero-width glyph that only carries text (see layoutToUnicode) */
  carrier?: boolean;
}

/** A glyph at an absolute position (font units) relative to its run's origin. */
interface Placed {
  gid: number;
  cluster: number;
  text: string;
  carrier?: boolean;
  x: number;
  y: number;
  /** Zero-advance glyph (combining mark, Arabic dots, ...) */
  mark: boolean;
}

/** Converts shaped advances/offsets into absolute positions. */
function place(glyphs: Positioned[]): { placed: Placed[]; advance: number } {
  let pen = 0;
  const placed = glyphs.map((g) => {
    const p = { gid: g.gid, cluster: g.cluster, text: g.text, carrier: g.carrier, x: pen + g.xOffset, y: g.yOffset, mark: g.xAdvance === 0 };
    pen += g.xAdvance;
    return p;
  });
  return { placed, advance: pen };
}

const ZWSP = "\u200b";
const isMn = (c: string) => /\p{Mn}/u.test(c);
const isCf = (c: string) => /\p{Cf}/u.test(c);

/**
 * Splits a cluster's text over its k spacing glyphs for the ToUnicode CMap.
 * Returns k pieces (in reading order) plus the text before, between and
 * after them (gaps[i] precedes pieces[i]; gaps[k] is the tail).
 *
 * pdf.js (Firefox) ignores /ActualText and reads ToUnicode strings in
 * content-stream order, and it treats any string containing a nonspacing
 * mark (\p{Mn}: virama, most vowel signs, harakat) as a zero-width
 * diacritic: its width is dropped and it skips line/space detection. So a
 * spacing glyph gets only mark-free text; marks go into the gaps, which are
 * written on invisible zero-width carrier glyphs. Format characters (ZWJ,
 * ZWNJ; pdf.js skips any string ending in one) are left out of this
 * fallback mapping; /ActualText keeps them.
 */
function splitClusterText(text: string, k: number): { pieces: string[]; gaps: string[] } {
  const tokens: { s: string; mn: boolean }[] = [];
  for (const c of text) {
    if (isCf(c)) continue;
    const last = tokens[tokens.length - 1];
    if (last && last.mn === isMn(c)) last.s += c;
    else tokens.push({ s: c, mn: isMn(c) });
  }
  // One mark-free piece per spacing glyph where possible: split the longest runs.
  const free = () => tokens.filter((t) => !t.mn).length;
  while (free() < k) {
    let best = -1;
    tokens.forEach((t, i) => {
      if (!t.mn && [...t.s].length > 1 && (best < 0 || [...t.s].length > [...tokens[best].s].length)) best = i;
    });
    if (best < 0) break;
    const [first, ...rest] = [...tokens[best].s];
    tokens.splice(best, 1, { s: first, mn: false }, { s: rest.join(""), mn: false });
  }
  const pieces: string[] = [];
  const gaps: string[] = [""];
  for (const t of tokens) {
    if (!t.mn && pieces.length < k) {
      pieces.push(t.s);
      gaps.push("");
    } else {
      gaps[gaps.length - 1] += t.s;
    }
  }
  while (pieces.length < k) {
    pieces.push(""); // more glyphs than characters (rare): mapped to U+200B
    gaps.push("");
  }
  return { pieces, gaps };
}

/**
 * Glyphs in visual order with ToUnicode text, from HarfBuzz clusters
 * (shaped with cluster level "characters", so each glyph knows the first
 * character it comes from), plus zero-width carrier glyphs (see
 * splitClusterText).
 *
 * Clusters are first merged, in reading order, until they are monotonic,
 * the same way HarfBuzz's grapheme cluster levels do. A reordered pre-base
 * matra therefore joins its syllable: in "हिन्दी" the glyphs ि + ह form one
 * cluster "हि". The cluster's text is then distributed over its glyphs in
 * the order they are drawn, so a reader that concatenates ToUnicode strings
 * in stream order gets logical text: the ि glyph maps to "ह" and the ह
 * glyph to "ि"; the क्ष ligature maps to "क" followed by a carrier "्ष".
 * Every (glyph, text) pair gets its own CID, so such context-dependent
 * mappings don't conflict. Zero-width glyphs drawn by the font (marks,
 * Arabic dots) map to U+200B, which pdf.js drops.
 *
 * RTL runs: pdf.js starts a new text item at every marked-content operator,
 * so with one /ActualText span per cluster each RTL cluster is its own item.
 * Items are read in stream order (clusters are emitted in logical order, see
 * drawLine) and pdf.js runs its bidi step on each item, which reverses RTL
 * text, so RTL strings are stored reversed (a lam-alef ligature maps to
 * "ال" and reads back as "لا"). A space glyph between RTL clusters would be
 * dropped (a whitespace-only item), so its space moves to the start of the
 * next cluster's text and the space glyph itself maps to U+200B.
 */
function layoutToUnicode(text: string, glyphs: ShapedGlyph[], rtl: boolean, carrierGid: number | null): Positioned[] {
  const order = glyphs.map((_, i) => i);
  if (rtl) order.reverse(); // reading order
  const starts = [...new Set(glyphs.map((g) => g.cluster))].sort((a, b) => a - b);
  const endOf = (cluster: number) => starts.find((st) => st > cluster) ?? text.length;

  const groups: { min: number; max: number; idx: number[] }[] = [];
  for (const i of order) {
    let cur = { min: glyphs[i].cluster, max: glyphs[i].cluster, idx: [i] };
    while (groups.length && cur.min <= groups[groups.length - 1].max) {
      const prev = groups.pop()!;
      cur = { min: Math.min(prev.min, cur.min), max: Math.max(prev.max, cur.max), idx: [...prev.idx, ...cur.idx] };
    }
    groups.push(cur);
  }

  const reading: Positioned[] = [];
  const carrier = (t: string, cluster: number) => {
    if (!t) return;
    if (carrierGid === null) {
      // No blank glyph to carry the text: append it to the previous glyph.
      const prev = reading[reading.length - 1];
      if (prev) prev.text = (prev.text === ZWSP ? "" : prev.text) + t;
      return;
    }
    reading.push({ gid: carrierGid, cluster, xAdvance: 0, xOffset: 0, yOffset: 0, text: t, carrier: true });
  };
  for (const grp of groups) {
    const members = grp.idx;
    const spacing = members.filter((i) => glyphs[i].xAdvance !== 0);
    const { pieces, gaps } = splitClusterText(text.slice(grp.min, endOf(grp.max)), spacing.length);
    const cl = glyphs[members[0]].cluster;
    carrier(gaps[0], cl);
    for (const i of members) {
      const j = spacing.indexOf(i);
      reading.push({ ...glyphs[i], text: j >= 0 ? pieces[j] || ZWSP : ZWSP });
      if (j >= 0) carrier(gaps[j + 1], glyphs[i].cluster);
    }
  }
  if (!rtl) return reading;
  for (let i = 0; i < reading.length; i++) {
    const g = reading[i];
    if (g.carrier || g.xAdvance === 0 || !/^\s+$/.test(g.text)) continue;
    const next = reading.findIndex((n, j) => j > i && !n.carrier && n.xAdvance !== 0 && n.text !== ZWSP);
    if (next < 0 || /^\s/.test(reading[next].text)) continue;
    reading[next].text = g.text + reading[next].text;
    g.text = ZWSP;
  }
  const reverse = (t: string) => (t === ZWSP ? t : [...t].reverse().join(""));
  return reading.reverse().map((g) => ({ ...g, text: reverse(g.text) }));
}

let subsetTagCounter = 0;

class EmbeddedFont {
  readonly upem: number;
  private ref: PDFRef | null = null;
  private subset: FkSubset;
  /** original gid → gid in the subset */
  private gidMap = new Map<number, number>();
  /** CID → (original gid, ToUnicode text). CID 0 is .notdef. */
  private cids: { gid: number; text: string; carrier?: boolean }[] = [{ gid: 0, text: "" }];
  private cidByKey = new Map<string, number>();
  private advances = new Map<number, number>();
  private pageNames = new WeakMap<PDFPage, PDFName>();

  constructor(
    readonly slot: Slot,
    private readonly doc: PDFDocument,
    private readonly fk: FkFont,
    private readonly hb: HbFont | null
  ) {
    this.upem = fk.unitsPerEm;
    this.subset = fk.createSubset();
  }

  covers(cp: number): boolean {
    return this.fk.hasGlyphForCodePoint(cp);
  }

  advance(gid: number): number {
    let a = this.advances.get(gid);
    if (a === undefined) {
      a = this.fk.getGlyph(gid).advanceWidth;
      this.advances.set(gid, a);
    }
    return a;
  }

  /** Shapes one directional run. Glyphs come back in visual (left-to-right) order. */
  shape(text: string, rtl: boolean): Positioned[] {
    const spec = FONTS[this.slot].hb;
    if (this.hb && spec) {
      const glyphs = this.hb.shape(text, { rtl, ...spec });
      return layoutToUnicode(text, glyphs, rtl, this.blankGlyph());
    }
    const run = this.fk.layout(text);
    return run.glyphs.map((g, i) => {
      const p = run.positions[i];
      const t = g.codePoints.length ? String.fromCodePoint(...g.codePoints) : "";
      return { gid: g.id, cluster: 0, xAdvance: p.xAdvance, xOffset: p.xOffset, yOffset: p.yOffset, text: t };
    });
  }

  private reverseCmap: Map<number, number> | null = null;

  /** The character a glyph is mapped from in the font's cmap ("" if none). */
  private cmapText(gid: number): string {
    if (!this.reverseCmap) {
      // fontkit's getGlyph(id) doesn't know its code points; build the reverse map once.
      this.reverseCmap = new Map();
      for (const cp of this.fk.characterSet) {
        const id = this.fk.glyphForCodePoint(cp).id;
        if (id && !this.reverseCmap.has(id)) this.reverseCmap.set(id, cp);
      }
    }
    const cp = this.reverseCmap.get(gid);
    return cp === undefined ? "" : String.fromCodePoint(cp);
  }

  /**
   * The CID for a glyph with a given ToUnicode text. The same glyph can need
   * different texts (a shared Arabic letter body, a glyph that carries a
   * cluster in one word and is a mark in another), so CIDs are allocated per
   * (glyph, text) pair and mapped back to glyphs with a CIDToGIDMap.
   */
  private cidFor(gid: number, text: string, carrier = false): number {
    const mapped = text || this.cmapText(gid) || ZWSP;
    const key = `${gid}|${mapped}|${carrier ? 0 : 1}`;
    let cid = this.cidByKey.get(key);
    if (cid === undefined) {
      this.use(gid);
      cid = this.cids.length;
      this.cids.push({ gid, text: mapped, carrier });
      this.cidByKey.set(key, cid);
    }
    return cid;
  }

  private blankGid: number | null | undefined;
  /** A glyph with no outline (the space), used for zero-width carrier CIDs. */
  blankGlyph(): number | null {
    if (this.blankGid === undefined) {
      const g = this.fk.hasGlyphForCodePoint(0x20) ? this.fk.glyphForCodePoint(0x20) : null;
      this.blankGid = g && g.id !== 0 ? g.id : null;
    }
    return this.blankGid;
  }

  /** Adds a glyph to the subset and returns its id in the subset. */
  use(gid: number): number {
    let sub = this.gidMap.get(gid);
    if (sub === undefined) {
      sub = this.subset.includeGlyph(gid);
      this.gidMap.set(gid, sub);
    }
    return sub;
  }

  resourceName(page: PDFPage): PDFName {
    let name = this.pageNames.get(page);
    if (!name) {
      this.ref ??= this.doc.context.nextRef();
      name = page.node.newFontDictionary(`Noto${this.slot}`, this.ref);
      this.pageNames.set(page, name);
    }
    return name;
  }

  /**
   * Text-showing operators for glyphs placed relative to the current text
   * position (font units). Differences between the placement and the font's
   * /W widths (kerning, mark offsets) become TJ adjustments; vertical offsets
   * use the text rise (Ts).
   */
  showOps(placed: Placed[], size: number): PDFOperator[] {
    const k = 1000 / this.upem;
    const ops: PDFOperator[] = [];
    let items: (PDFHexString | PDFNumber)[] = [];
    let hex = "";
    let curX = 0;
    let rise = 0;
    const flushHex = () => {
      if (hex) items.push(PDFHexString.of(hex));
      hex = "";
    };
    const flushTJ = () => {
      flushHex();
      if (items.length) ops.push(PDFOperator.of(Ops.ShowTextAdjusted, [this.doc.context.obj(items) as PDFArray]));
      items = [];
    };
    for (const p of placed) {
      const cid = this.cidFor(p.gid, p.text, p.carrier);
      if (p.y !== rise) {
        flushTJ();
        ops.push(setTextRise((p.y * size) / this.upem));
        rise = p.y;
      }
      const shift = p.x - curX;
      if (Math.abs(shift) > 0.5) {
        flushHex();
        items.push(PDFNumber.of(Math.round(-shift * k * 100) / 100));
      }
      hex += cid.toString(16).padStart(4, "0");
      curX = p.x + (p.carrier ? 0 : this.advance(p.gid));
    }
    flushTJ();
    if (rise !== 0) ops.push(setTextRise(0));
    return ops;
  }

  /** Writes the font objects (call once, before saving). */
  async finalize(): Promise<void> {
    if (!this.ref) return;
    const ctx = this.doc.context;
    const k = 1000 / this.upem;
    const fontBytes = await encodeSubset(this.subset);
    const tagChars = (subsetTagCounter++).toString(26).padStart(6, "0");
    const tag = [...tagChars].map((c) => String.fromCharCode(65 + parseInt(c, 26))).join("");
    const baseFont = `${tag}+${(this.fk.postscriptName ?? `Noto-${this.slot}`).replace(/[^A-Za-z0-9-]/g, "")}`;

    // Widths and CID → subset-gid map, indexed by CID.
    const widths: (number | number[])[] = [1, this.cids.slice(1).map((c) => (c.carrier ? 0 : Math.round(this.advance(c.gid) * k)))];
    const cidToGid = new Uint8Array(this.cids.length * 2);
    this.cids.forEach((c, cid) => {
      const sub = cid === 0 ? 0 : this.gidMap.get(c.gid)!;
      cidToGid[cid * 2] = sub >> 8;
      cidToGid[cid * 2 + 1] = sub & 0xff;
    });
    const toUnicodeMap = new Map(this.cids.slice(1).map((c, i) => [i + 1, c.text] as [number, string]));

    const bbox = this.fk.bbox;
    const descriptor = ctx.obj({
      Type: "FontDescriptor",
      FontName: baseFont,
      Flags: 4,
      FontBBox: [bbox.minX * k, bbox.minY * k, bbox.maxX * k, bbox.maxY * k].map(Math.round),
      ItalicAngle: 0,
      Ascent: Math.round(this.fk.ascent * k),
      Descent: Math.round(this.fk.descent * k),
      CapHeight: Math.round((this.fk.capHeight || this.fk.ascent) * k),
      StemV: 80,
      FontFile2: ctx.register(ctx.flateStream(fontBytes, { Length1: fontBytes.length })),
    });
    const cidFont = ctx.obj({
      Type: "Font",
      Subtype: "CIDFontType2",
      BaseFont: baseFont,
      CIDSystemInfo: { Registry: PDFString.of("Adobe"), Ordering: PDFString.of("Identity"), Supplement: 0 },
      FontDescriptor: ctx.register(descriptor),
      W: widths,
      CIDToGIDMap: ctx.register(ctx.flateStream(cidToGid)),
    });
    const toUnicode = ctx.register(ctx.flateStream(buildToUnicode(toUnicodeMap)));
    ctx.assign(
      this.ref,
      ctx.obj({
        Type: "Font",
        Subtype: "Type0",
        BaseFont: baseFont,
        Encoding: "Identity-H",
        DescendantFonts: [ctx.register(cidFont)],
        ToUnicode: toUnicode,
      })
    );
  }
}

function encodeSubset(subset: FkSubset): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const parts: Uint8Array[] = [];
    // fontkit's typings omit the "error" event of the encode stream.
    const stream = subset.encodeStream() as unknown as {
      on(event: string, cb: (arg: Uint8Array & Error) => void): typeof stream;
    };
    stream
      .on("data", (b) => parts.push(b))
      .on("end", () => {
        const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
        let o = 0;
        for (const p of parts) {
          out.set(p, o);
          o += p.length;
        }
        resolve(out);
      })
      .on("error", reject);
  });
}

function utf16Hex(s: string): string {
  let h = "";
  for (let i = 0; i < s.length; i++) h += s.charCodeAt(i).toString(16).padStart(4, "0");
  return h;
}

function buildToUnicode(map: Map<number, string>): string {
  const entries = [...map.entries()].sort((a, b) => a[0] - b[0]);
  const chunks: string[] = [];
  // bfchar blocks hold at most 100 entries each.
  for (let i = 0; i < entries.length; i += 100) {
    const block = entries.slice(i, i + 100);
    chunks.push(`${block.length} beginbfchar\n${block.map(([g, s]) => `<${g.toString(16).padStart(4, "0")}> <${utf16Hex(s)}>`).join("\n")}\nendbfchar`);
  }
  return [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
    "/CMapName /Adobe-Identity-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<0000> <FFFF>",
    "endcodespacerange",
    ...chunks,
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end",
  ].join("\n");
}

// ─── Segmentation + simplified bidi ──────────────────────────────────────────

type Kind = "base" | Slot;
type Strong = "L" | "R" | "N";

interface Segment {
  text: string;
  kind: Kind;
  strong: Strong;
  level: number;
}

const MIRROR: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "«": "»", "»": "«" };

function strongOf(kind: Kind, ch: string): Strong {
  if (kind === "arab") return /\p{L}|\p{M}/u.test(ch) ? "R" : "N";
  if (kind === "sym" || kind === "math") return "N";
  return /[\p{L}\p{M}\p{Nd}]/u.test(ch) ? "L" : "N";
}

// ─── Public renderer ─────────────────────────────────────────────────────────

export interface DrawOptions {
  color?: Color;
  /** OCR text layers: invisible text (render mode 3) */
  invisible?: boolean;
  /** Horizontal scaling (Tz) in percent */
  horizontalScale?: number;
  /**
   * For text drawn one word at a time (OCR): if the text starts with an RTL
   * run, its ToUnicode text gets a leading space. pdf.js only infers spaces
   * from gaps when moving right, so without it RTL words run together.
   */
  leadingSpace?: boolean;
}

export interface UnicodeTextRenderer {
  /** True if fallback fonts are in use (otherwise everything is standard-font text). */
  readonly hasFallback: boolean;
  /** Characters no bundled font covers; they are drawn as "?". */
  readonly unsupported: Set<string>;
  /** Replaces uncovered characters with "?" (call on text before measuring/drawing). */
  prepare(text: string): string;
  /** Whether a paragraph's base direction is right-to-left (first strong char is Arabic). */
  isRtl(paragraph: string): boolean;
  /** Width of a single line of text at `size`. */
  widthOf(text: string, size: number): number;
  /** Draws one line with its left edge at x and baseline at y. */
  drawLine(page: PDFPage, text: string, x: number, y: number, size: number, rtl: boolean, opts?: DrawOptions): void;
  /** Writes the embedded fonts. Must be awaited before doc.save(). */
  finalize(): Promise<void>;
}

/**
 * Creates a renderer for `text` drawn with `baseFont` (a standard font).
 * Only fetches the fonts / shaper needed for characters `baseFont` can't encode.
 */
export async function createUnicodeTextRenderer(
  doc: PDFDocument,
  baseFont: PDFFont,
  text: string
): Promise<UnicodeTextRenderer> {
  const baseSet = new Set(baseFont.getCharacterSet());
  const canBase = (cp: number) => baseSet.has(cp);

  // Which font files might be needed?
  const wanted = new Set<Slot>();
  for (const ch of new Set(text)) {
    const cp = ch.codePointAt(0)!;
    if (canBase(cp) || /\s/.test(ch)) continue;
    for (const s of SLOT_ORDER) if (inRanges(cp, FONTS[s].ranges)) wanted.add(s);
  }

  const fonts = new Map<Slot, EmbeddedFont>();
  if (wanted.size > 0) {
    const needsHb = wanted.has("deva") || wanted.has("arab");
    const [fontkit, hb] = await Promise.all([loadFontkit(), needsHb ? loadHarfBuzz() : Promise.resolve(null)]);
    const slots = [...wanted];
    const files = await Promise.all(slots.map((s) => fetchFont(FONTS[s].url)));
    slots.forEach((s, i) => {
      const bytes = files[i];
      const hbFont = hb && FONTS[s].hb ? hb.createFont(bytes) : null;
      fonts.set(s, new EmbeddedFont(s, doc, fontkit.create(bytes), hbFont));
    });
  }

  const unsupported = new Set<string>();
  const kindOf = (cp: number): Kind | null => {
    if (canBase(cp)) return "base";
    for (const s of SLOT_ORDER) {
      const f = fonts.get(s);
      if (f && inRanges(cp, FONTS[s].ranges) && f.covers(cp)) return s;
    }
    return null;
  };

  const prepare = (input: string): string => {
    let out = "";
    let prevKind: Kind | null = null;
    for (const ch of input) {
      const cp = ch.codePointAt(0)!;
      if (ch === "\n") {
        out += ch;
        prevKind = "base";
        continue;
      }
      if (/\s/.test(ch) && !canBase(cp)) {
        out += " ";
        prevKind = "base";
        continue;
      }
      if (isJoining(ch) && prevKind && prevKind !== "base" && fonts.get(prevKind)?.covers(cp)) {
        out += ch;
        continue;
      }
      if (isJoining(ch) && (ch === "\u200c" || ch === "\u200d") && prevKind && prevKind !== "base") {
        out += ch; // shaper control characters; HarfBuzz handles them
        continue;
      }
      const kind = kindOf(cp);
      if (kind) {
        out += ch;
        prevKind = kind;
      } else if (isJoining(ch)) {
        unsupported.add(ch); // stray mark: drop it
      } else {
        unsupported.add(ch);
        out += "?";
        prevKind = "base";
      }
    }
    return out;
  };

  const isRtl = (paragraph: string): boolean => {
    for (const ch of paragraph) {
      const cp = ch.codePointAt(0)!;
      if (isArabic(cp) && /\p{L}/u.test(ch)) return true;
      if (/\p{L}/u.test(ch)) return false;
    }
    return false;
  };

  /** Splits a (prepared) line into runs of one font and one strong direction. */
  const segment = (line: string): Segment[] => {
    const segs: Segment[] = [];
    let prevKind: Kind = "base";
    for (const ch of line) {
      const cp = ch.codePointAt(0)!;
      let kind: Kind = kindOf(cp) ?? "base";
      if (isJoining(ch) && prevKind !== "base") kind = prevKind;
      let strong = strongOf(kind, ch);
      const last = segs[segs.length - 1];
      // Marks / joiners continue the previous run.
      if (last && last.kind === kind && kind !== "base" && isJoining(ch)) strong = last.strong;
      if (last && last.kind === kind && last.strong === strong) last.text += ch;
      else segs.push({ text: ch, kind, strong, level: 0 });
      prevKind = kind;
    }
    // Spaces/punctuation between two runs of the same script join that run
    // (e.g. "مرحبا بالعالم" is shaped as one RTL run): the shaper then
    // orders and mirrors them, and extractors see real space glyphs.
    for (let i = 1; i < segs.length - 1; ) {
      const [prev, mid, next] = [segs[i - 1], segs[i], segs[i + 1]];
      const font = prev.kind !== "base" ? fonts.get(prev.kind) : undefined;
      const joinable =
        font && mid.strong === "N" && next.kind === prev.kind && next.strong === prev.strong &&
        (mid.kind === prev.kind || [...mid.text].every((c) => font.covers(c.codePointAt(0)!)));
      if (joinable) {
        prev.text += mid.text + next.text;
        segs.splice(i, 2);
      } else {
        i++;
      }
    }
    return segs;
  };

  /** Resolves embedding levels and returns segments in visual order. */
  const visualOrder = (segs: Segment[], rtl: boolean): Segment[] => {
    const para = rtl ? 1 : 0;
    const levelOf = (s: Strong) => (s === "R" ? 1 : para === 0 ? 0 : 2);
    const strongs = segs.map((s) => s.strong);
    segs.forEach((s, i) => {
      if (s.strong !== "N") {
        s.level = levelOf(s.strong);
        return;
      }
      let prev: Strong = rtl ? "R" : "L";
      for (let j = i - 1; j >= 0; j--) if (strongs[j] !== "N") { prev = strongs[j]; break; }
      let next: Strong = rtl ? "R" : "L";
      for (let j = i + 1; j < segs.length; j++) if (strongs[j] !== "N") { next = strongs[j]; break; }
      s.level = prev === next ? levelOf(prev) : para;
    });
    const out = [...segs];
    const max = Math.max(0, ...out.map((s) => s.level));
    for (let lvl = max; lvl >= 1; lvl--) {
      for (let i = 0; i < out.length; ) {
        if (out[i].level < lvl) { i++; continue; }
        let j = i;
        while (j < out.length && out[j].level >= lvl) j++;
        out.splice(i, j - i, ...out.slice(i, j).reverse());
        i = j;
      }
    }
    return out;
  };

  const shapeCache = new Map<string, Positioned[]>();
  const shaped = (seg: Segment): Positioned[] => {
    // Direction from the run's own script (not its resolved level) so that
    // measuring and drawing always shape identically.
    const rtl = seg.strong === "R";
    const key = `${seg.kind}|${rtl ? 1 : 0}|${seg.text}`;
    let g = shapeCache.get(key);
    if (!g) {
      g = fonts.get(seg.kind as Slot)!.shape(seg.text, rtl);
      shapeCache.set(key, g);
    }
    return g;
  };

  /** Text as drawn: neutral base runs inside RTL context are mirrored. */
  const drawnBaseText = (seg: Segment) =>
    seg.level % 2 === 1 ? [...seg.text].reverse().map((c) => MIRROR[c] ?? c).join("") : seg.text;

  const segWidth = (seg: Segment, size: number): number => {
    if (seg.kind === "base") return baseFont.widthOfTextAtSize(seg.text, size);
    const f = fonts.get(seg.kind)!;
    return (shaped(seg).reduce((w, g) => w + g.xAdvance, 0) * size) / f.upem;
  };

  const needsLayout = (line: string) => {
    for (const ch of line) if (!canBase(ch.codePointAt(0)!)) return true;
    return false;
  };

  const widthOf = (line: string, size: number): number => {
    if (!needsLayout(line)) return baseFont.widthOfTextAtSize(line, size);
    return segment(line).reduce((w, s) => w + segWidth(s, size), 0);
  };

  const drawLine = (page: PDFPage, line: string, x: number, y: number, size: number, rtl: boolean, opts: DrawOptions = {}) => {
    const baseOps = (text: string, at: number): PDFOperator[] => {
      const name = page.node.newFontDictionary(baseFont.name, baseFont.ref);
      return [beginText(), setFontAndSize(name, size), moveText(at, y), showText(baseFont.encodeText(text)), endText()];
    };
    const ops: PDFOperator[] = [pushGraphicsState()];
    if (opts.color) ops.push(setFillingColor(opts.color));
    if (opts.invisible) ops.push(setTextRenderingMode(TextRenderingMode.Invisible));
    const tz = opts.horizontalScale && opts.horizontalScale !== 100 ? [setCharacterSqueeze(opts.horizontalScale)] : [];
    const scale = (opts.horizontalScale ?? 100) / 100;

    if (!needsLayout(line) && !rtl) {
      ops.push(...wrapTz(tz, baseOps(line, x)));
    } else {
      // Positions come from the visual order; operators are emitted in
      // logical order so stream-order extractors read the text correctly.
      const logical = segment(line);
      const startX = new Map<Segment, number>();
      let px = x;
      for (const seg of visualOrder(logical, rtl)) {
        startX.set(seg, px);
        px += segWidth(seg, size) * scale;
      }
      for (const [segIndex, seg] of logical.entries()) {
        const cx = startX.get(seg)!;
        if (seg.kind === "base") {
          ops.push(...wrapTz(tz, baseOps(drawnBaseText(seg), cx)));
          continue;
        }
        const f = fonts.get(seg.kind)!;
        const { placed } = place(shaped(seg));
        const span = (actualText: string, drawOrder: Placed[]) => {
          // Glyphs mapped to U+200B go last: pdf.js skips them without
          // applying a TJ adjustment that follows, which would shift its
          // idea of where the next glyphs are (spurious spaces/splits).
          // Positions are absolute, so rendering is unaffected.
          const silent = drawOrder.filter((g) => g.text === ZWSP);
          const glyphs = [...drawOrder.filter((g) => g.text !== ZWSP), ...silent];
          const blank = f.blankGlyph();
          if (silent.length && silent.length < glyphs.length && blank !== null) {
            // Poppler takes an ActualText span's extent from its last glyph, so
            // end with an invisible zero-width glyph at the span's right edge.
            const right = Math.max(...drawOrder.map((g) => g.x + (g.carrier ? 0 : f.advance(g.gid))));
            glyphs.push({ gid: blank, cluster: 0, text: ZWSP, carrier: true, x: right, y: 0, mark: true });
          }
          // Inline property list; pdf-lib's operand type omits dicts but serialises them fine.
          const props = doc.context.obj({ ActualText: PDFHexString.fromText(actualText) }) as unknown as PDFArray;
          ops.push(
            PDFOperator.of(Ops.BeginMarkedContentSequence, [PDFName.of("Span"), props]),
            beginText(),
            ...tz,
            setFontAndSize(f.resourceName(page), size),
            moveText(cx, y),
            ...f.showOps(glyphs, size),
            endText(),
            PDFOperator.of(Ops.EndMarkedContent)
          );
        };
        if (seg.strong !== "R") {
          // LTR run: one span with the original text, glyphs in visual order.
          // (Emitting them in logical order instead, e.g. the consonant before
          // a pre-base matra, renders identically but makes pdf.js insert
          // spaces at every backward jump; the ToUnicode distribution in
          // layoutToUnicode gives logical text without reordering.)
          span(seg.text, placed);
        } else {
          // RTL run: one span per cluster. Extractors order RTL text by glyph
          // position, so a single span spread left-to-right would come out
          // reversed. Within a cluster the advancing glyph carries the text
          // and the zero-width glyphs (marks, carriers) get an empty
          // ActualText, so the span's extent matches the cluster (no spurious
          // word breaks). Clusters are emitted in logical order (positions
          // are absolute): extractors that read the content stream in order,
          // like pdf.js, then get logical text (see layoutToUnicode).
          const groups = clusterGroups(seg.text, placed).reverse();
          if (opts.leadingSpace && segIndex === 0) {
            // RTL strings are stored reversed (see layoutToUnicode): append.
            const first = groups[0]?.glyphs.find((g) => !g.mark && g.text !== ZWSP);
            if (first) first.text += " ";
          }
          for (const group of groups) {
            const base = group.glyphs.filter((g) => !g.mark);
            const marks = group.glyphs.filter((g) => g.mark);
            if (base.length === 0) {
              span(group.text, marks);
              continue;
            }
            span(group.text, base);
            if (marks.length) span("", marks);
          }
        }
      }
    }
    ops.push(popGraphicsState());
    page.pushOperators(...ops);
  };

  return {
    hasFallback: fonts.size > 0,
    unsupported,
    prepare,
    isRtl,
    widthOf,
    drawLine,
    async finalize() {
      for (const f of fonts.values()) await f.finalize();
    },
  };
}

/** Splits visually ordered glyphs into runs of one cluster each, with the cluster's text. */
function clusterGroups(text: string, glyphs: Placed[]): { text: string; glyphs: Placed[] }[] {
  const starts = [...new Set(glyphs.map((g) => g.cluster))].sort((a, b) => a - b);
  const groups: { cluster: number; glyphs: Placed[] }[] = [];
  for (const g of glyphs) {
    const last = groups[groups.length - 1];
    if (last && last.cluster === g.cluster) last.glyphs.push(g);
    else groups.push({ cluster: g.cluster, glyphs: [g] });
  }
  return groups.map((grp) => {
    const next = starts.find((st) => st > grp.cluster) ?? text.length;
    return { text: text.slice(grp.cluster, next), glyphs: grp.glyphs };
  });
}

function wrapTz(tz: PDFOperator[], ops: PDFOperator[]): PDFOperator[] {
  if (!tz.length) return ops;
  // Insert Tz right after BT so it applies to this text object.
  return [ops[0], ...tz, ...ops.slice(1)];
}
