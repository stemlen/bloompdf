/**
 * Layout reconstruction for PDF → Word.
 *
 * Input: positioned text pieces and image boxes per page (see extract.ts).
 * Output: Word-ish blocks (headings, paragraphs, lists, tables, images) in
 * reading order.
 *
 * Pipeline per page:
 *  1. Group pieces into rows (shared baseline band) and split rows into
 *     fragments at wide horizontal gaps (column gutters, table cells).
 *  2. Look for a column gutter: an x position no fragment crosses, with
 *     full text lines on both sides. The page is cut into horizontal bands;
 *     full-width bands are read as-is, column bands left column first.
 *     This recurses once more for 3-column layouts.
 *  3. Inside each column: rows whose fragments line up in the same x
 *     columns for several consecutive rows become a table.
 *  4. Remaining rows become lines, lines become paragraphs (spacing,
 *     indentation, short last lines, font changes), paragraphs are
 *     classified as headings by relative font size / bold, and lists by
 *     their leading bullet or number.
 *
 * Pure functions with no DOM access, so they can be unit-tested in Node.
 */
import type { Block, PageBlocks, PageContent, ParagraphBlock, Run, TableBlock, TextPiece } from "./types";

// ─── Geometry helpers ────────────────────────────────────────────────────────

interface Frag {
  pieces: TextPiece[];
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  base: number;
  fs: number;
}

interface Row {
  frags: Frag[];
  top: number;
  bottom: number;
  base: number;
  fs: number;
}

interface Line {
  frags: Frag[];
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  base: number;
  fs: number;
  runs: Run[];
  text: string;
  bold: boolean;
}

interface Bounds {
  left: number;
  right: number;
}

const ASC = 0.8;
const DESC = 0.22;

const topOf = (p: TextPiece) => p.y - ASC * p.fs;
const bottomOf = (p: TextPiece) => p.y + DESC * p.fs;

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
}

/** Font size of the piece carrying the most characters. */
function dominantSize(pieces: TextPiece[]): number {
  const w = new Map<number, number>();
  for (const p of pieces) {
    const k = Math.round(p.fs * 2) / 2;
    w.set(k, (w.get(k) ?? 0) + p.str.length);
  }
  let best = pieces[0]?.fs ?? 10;
  let bestN = -1;
  for (const [k, n] of w) if (n > bestN) [best, bestN] = [k, n];
  return best;
}

function makeFrag(pieces: TextPiece[]): Frag {
  const fs = dominantSize(pieces);
  const main = pieces.reduce((a, b) => (Math.abs(b.fs - fs) < Math.abs(a.fs - fs) || (Math.abs(b.fs - fs) === Math.abs(a.fs - fs) && b.str.length > a.str.length) ? b : a));
  return {
    pieces,
    x0: Math.min(...pieces.map((p) => p.x)),
    x1: Math.max(...pieces.map((p) => p.x + p.w)),
    top: Math.min(...pieces.map(topOf)),
    bottom: Math.max(...pieces.map(bottomOf)),
    base: main.y,
    fs,
  };
}

// ─── 1. Rows and fragments ──────────────────────────────────────────────────

/**
 * Groups items into rows by vertical overlap with the row's main (largest)
 * item, so superscripts and subscripts stay on their line.
 */
function groupIntoRows<T>(items: T[], span: (t: T) => [number, number, number]): T[][] {
  // span → [top, bottom, size]
  const sorted = [...items].sort((a, b) => {
    const [at, ab] = span(a);
    const [bt, bb] = span(b);
    return (at + ab) / 2 - (bt + bb) / 2;
  });
  const rows: { items: T[]; top: number; bottom: number; size: number }[] = [];
  for (const it of sorted) {
    const [t, b, s] = span(it);
    let target: (typeof rows)[number] | undefined;
    for (let i = rows.length - 1; i >= 0 && i >= rows.length - 6; i--) {
      const r = rows[i];
      const ov = overlap(t, b, r.top, r.bottom);
      if (ov >= 0.5 * Math.min(b - t, r.bottom - r.top)) {
        target = r;
        break;
      }
    }
    if (target) {
      target.items.push(it);
      if (s > target.size * 1.05) {
        target.top = t;
        target.bottom = b;
        target.size = s;
      }
    } else {
      rows.push({ items: [it], top: t, bottom: b, size: s });
    }
  }
  return rows.map((r) => r.items);
}

function buildFragments(pieces: TextPiece[]): Frag[] {
  const rows = groupIntoRows(pieces, (p) => [topOf(p), bottomOf(p), p.fs]);
  const frags: Frag[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let cur: TextPiece[] = [];
    let curEnd = -Infinity;
    for (const p of row) {
      if (cur.length) {
        const gap = p.x - curEnd;
        const fs = Math.min(p.fs, cur[cur.length - 1].fs);
        if (gap > 0.9 * fs) {
          frags.push(makeFrag(cur));
          cur = [];
        }
      }
      cur.push(p);
      curEnd = cur.length === 1 ? p.x + p.w : Math.max(curEnd, p.x + p.w);
    }
    if (cur.length) frags.push(makeFrag(cur));
  }
  return frags;
}

function rowsFromFrags(frags: Frag[]): Row[] {
  return groupIntoRows(frags, (f) => [f.base - ASC * f.fs, f.base + DESC * f.fs, f.fs])
    .map((fs) => {
      fs.sort((a, b) => a.x0 - b.x0);
      const main = fs.reduce((a, b) => (b.fs > a.fs ? b : a));
      return {
        frags: fs,
        top: Math.min(...fs.map((f) => f.top)),
        bottom: Math.max(...fs.map((f) => f.bottom)),
        base: main.base,
        fs: main.fs,
      };
    })
    .sort((a, b) => a.base - b.base);
}

// ─── 2. Columns ─────────────────────────────────────────────────────────────

/** A finished block with a position: an image, or a table found page-wide. */
interface Box {
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  block: Block;
}

interface Region {
  frags: Frag[];
  boxes: Box[];
  bounds: Bounds;
}

const crosses = (x0: number, x1: number, g: number, tol = 3) => x0 < g - tol && x1 > g + tol;

/**
 * Finds a column gutter x in the fragments, or null for single-column text.
 *
 * Candidates are x ranges crossed by the same (locally minimal) number of
 * fragments. A candidate is a gutter when both sides hold running text lines
 * that fill their column (or one side does and the other holds a figure's
 * labels). Lines crossing the gutter (titles, full-width figures, a form
 * above two-column instructions) are allowed; they become full-width bands.
 */
function findGutter(frags: Frag[], nested = false): number | null {
  const textFrags = frags.filter((f) => f.pieces.reduce((n, p) => n + p.str.length, 0) >= 2);
  if (textFrags.length < 10) return null;
  const L = Math.min(...textFrags.map((f) => f.x0));
  const R = Math.max(...textFrags.map((f) => f.x1));
  const W = R - L;
  if (W < 150) return null;

  // Runs of constant crossing count across the middle of the text block.
  const runs: { x0: number; x1: number; cross: number }[] = [];
  for (let x = Math.ceil(L + 0.2 * W); x <= L + 0.8 * W; x++) {
    let cross = 0;
    for (const f of textFrags) if (crosses(f.x0, f.x1, x, 1)) cross++;
    const last = runs[runs.length - 1];
    if (last && last.cross === cross) last.x1 = x;
    else runs.push({ x0: x, x1: x, cross });
  }

  let best: { g: number; score: number } | null = null;
  runs.forEach((run, i) => {
    // Only local minima: fewer crossings than both neighbours.
    const prev = runs[i - 1];
    const next = runs[i + 1];
    if ((prev && prev.cross < run.cross) || (next && next.cross < run.cross)) return;
    if (run.x1 - run.x0 < 4) return;
    const g = (run.x0 + run.x1) / 2;
    const left = textFrags.filter((f) => f.x1 <= g + 3);
    const right = textFrags.filter((f) => f.x0 >= g - 3);
    if (left.length < 6 || right.length < 6) return;
    // Column text fills its column; table cells and form labels do not.
    const leftW = g - L;
    const rightW = R - g;
    const fullL = left.filter((f) => f.x1 - f.x0 >= 0.7 * leftW).length;
    const fullR = right.filter((f) => f.x1 - f.x0 >= 0.7 * rightW).length;
    const twoText = fullL >= 4 && fullR >= 4 && fullL + fullR >= 0.15 * (left.length + right.length);
    const textBesideFigure = (fullL >= 0.4 * left.length && fullL >= 8) || (fullR >= 0.4 * right.length && fullR >= 8);
    // Inside a column only more running text counts (3-column pages); a
    // column holding a two-column table must not be split.
    if (!twoText && (nested || !textBesideFigure)) return;
    // Crossing lines must be a minority of the column lines.
    if (run.cross > 2 * (fullL + fullR)) return;
    const score = 2 * Math.min(fullL, fullR) + Math.max(fullL, fullR) - run.cross;
    if (!best || score > best.score) best = { g, score };
  });
  return best ? (best as { g: number; score: number }).g : null;
}

/** Splits a region into reading-order leaf regions (bands × columns). */
function splitRegions(region: Region, depth: number, stats: { columns: number }): Region[] {
  const g = depth < 2 ? findGutter(region.frags, depth > 0) : null;
  if (g === null) return [region];
  stats.columns = Math.max(stats.columns, depth + 2);

  type Item = { top: number; bottom: number; x0: number; x1: number; frag?: Frag; box?: Box };
  const items: Item[] = [
    ...region.frags.map((f) => ({ top: f.top, bottom: f.bottom, x0: f.x0, x1: f.x1, frag: f })),
    ...region.boxes.map((b) => ({ top: b.top, bottom: b.bottom, x0: b.x0, x1: b.x1, box: b })),
  ].sort((a, b) => a.top - b.top);

  const leftFrags = region.frags.filter((f) => !crosses(f.x0, f.x1, g) && f.x1 <= g + 3);
  const rightFrags = region.frags.filter((f) => !crosses(f.x0, f.x1, g) && f.x0 >= g - 3);
  const leftBounds: Bounds = { left: region.bounds.left, right: leftFrags.length ? percentile(leftFrags.map((f) => f.x1), 0.9) : g };
  const rightBounds: Bounds = { left: rightFrags.length ? percentile(rightFrags.map((f) => f.x0), 0.1) : g, right: region.bounds.right };

  const bands: { span: boolean; items: Item[] }[] = [];
  for (const it of items) {
    const span = crosses(it.x0, it.x1, g);
    const last = bands[bands.length - 1];
    if (last && last.span === span) last.items.push(it);
    else bands.push({ span, items: [it] });
  }

  // A "column" band is only real if both sides have content side by side;
  // otherwise (a heading or the short last line of a full-width paragraph
  // that happens to sit left of the gutter) it joins the full-width flow.
  for (const band of bands) {
    if (band.span) continue;
    const l = band.items.filter((i) => (i.x0 + i.x1) / 2 < g);
    const r = band.items.filter((i) => (i.x0 + i.x1) / 2 >= g);
    const ext = (its: Item[]) => [Math.min(...its.map((i) => i.top)), Math.max(...its.map((i) => i.bottom))];
    if (!l.length || !r.length) {
      band.span = true;
      continue;
    }
    const [lt, lb] = ext(l);
    const [rt, rb] = ext(r);
    if (overlap(lt, lb, rt, rb) < 0.3 * Math.min(lb - lt, rb - rt)) band.span = true;
  }
  // Left-side lines above everything on the right side continue the
  // full-width flow above them (e.g. the short last line of a paragraph).
  for (let i = 1; i < bands.length; i++) {
    const band = bands[i];
    if (band.span || !bands[i - 1].span) continue;
    const rTop = Math.min(...band.items.filter((it) => (it.x0 + it.x1) / 2 >= g).map((it) => it.top));
    let k = 0;
    while (k < band.items.length && (band.items[k].x0 + band.items[k].x1) / 2 < g && band.items[k].bottom <= rTop + 1) k++;
    if (k > 0 && k < band.items.length) bands[i - 1].items.push(...band.items.splice(0, k));
  }
  for (let i = bands.length - 1; i > 0; i--) {
    if (bands[i].span && bands[i - 1].span) {
      bands[i - 1].items.push(...bands[i].items);
      bands.splice(i, 1);
    }
  }

  const out: Region[] = [];
  const toRegion = (its: Item[], bounds: Bounds): Region => ({
    frags: its.filter((i) => i.frag).map((i) => i.frag!),
    boxes: its.filter((i) => i.box).map((i) => i.box!),
    bounds,
  });
  for (const band of bands) {
    if (band.span) {
      out.push(toRegion(band.items, region.bounds));
    } else {
      const l = band.items.filter((i) => (i.x0 + i.x1) / 2 < g);
      const r = band.items.filter((i) => (i.x0 + i.x1) / 2 >= g);
      if (l.length) out.push(...splitRegions(toRegion(l, leftBounds), depth + 1, stats));
      if (r.length) out.push(...splitRegions(toRegion(r, rightBounds), depth + 1, stats));
    }
  }
  return out;
}

// ─── Runs ───────────────────────────────────────────────────────────────────

function pushRun(runs: Run[], r: Run) {
  const last = runs[runs.length - 1];
  if (last && last.bold === r.bold && last.italic === r.italic && last.script === r.script && Math.abs(last.size - r.size) < 0.6) {
    last.text += r.text;
  } else {
    runs.push({ ...r });
  }
}

/** Runs for a set of pieces on one visual line (sorted left to right). */
function runsForPieces(pieces: TextPiece[], lineFs: number, lineBase: number): Run[] {
  const runs: Run[] = [];
  let prevEnd: number | null = null;
  let prevStr = "";
  for (const p of pieces) {
    let script: Run["script"];
    if (p.fs < 0.85 * lineFs) {
      if (p.y < lineBase - 0.15 * lineFs) script = "sup";
      else if (p.y > lineBase + 0.1 * lineFs) script = "sub";
    }
    let text = p.str;
    if (prevEnd !== null) {
      const gap = p.x - prevEnd;
      const needsSpace = gap > 0.12 * Math.min(p.fs, lineFs) && !/\s$/.test(prevStr) && !/^\s/.test(text);
      if (needsSpace) text = " " + text;
    }
    pushRun(runs, { text, bold: p.bold || undefined, italic: p.italic || undefined, script, size: script ? lineFs : p.fs });
    prevEnd = p.x + p.w;
    prevStr = p.str;
  }
  return runs;
}

function lineFromRow(row: Row): Line {
  const pieces = row.frags.flatMap((f) => f.pieces).sort((a, b) => a.x - b.x);
  const runs = runsForPieces(pieces, row.fs, row.base);
  const text = runs.map((r) => r.text).join("");
  const chars = pieces.reduce((n, p) => n + p.str.length, 0);
  const boldChars = pieces.reduce((n, p) => n + (p.bold ? p.str.length : 0), 0);
  return {
    frags: row.frags,
    x0: Math.min(...row.frags.map((f) => f.x0)),
    x1: Math.max(...row.frags.map((f) => f.x1)),
    top: row.top,
    bottom: row.bottom,
    base: row.base,
    fs: row.fs,
    runs,
    text,
    bold: chars > 0 && boldChars / chars > 0.9,
  };
}

// ─── 3. Tables ──────────────────────────────────────────────────────────────

interface Interval {
  x0: number;
  x1: number;
}

interface TableFound {
  start: number;
  end: number; // inclusive
  cols: Interval[];
}

/**
 * Column intervals of a table zone: x ranges covered by cells, separated by
 * gaps that (almost) no row crosses. A few spanning cells are tolerated.
 */
function tableColumns(rows: Row[], fs: number): Interval[] {
  const x0 = Math.floor(Math.min(...rows.flatMap((r) => r.frags.map((f) => f.x0))));
  const x1 = Math.ceil(Math.max(...rows.flatMap((r) => r.frags.map((f) => f.x1))));
  const cover = new Int32Array(x1 - x0 + 1);
  for (const r of rows) {
    const mark = new Uint8Array(cover.length);
    for (const f of r.frags) for (let x = Math.floor(f.x0) - x0; x <= Math.ceil(f.x1) - x0; x++) mark[x] = 1;
    for (let i = 0; i < cover.length; i++) cover[i] += mark[i];
  }
  const allowed = Math.floor(rows.length * 0.12);
  const cols: Interval[] = [];
  let start = -1;
  let gapRun = 0;
  const minGap = Math.max(2, 0.5 * fs);
  for (let i = 0; i < cover.length; i++) {
    const busy = cover[i] > allowed;
    if (busy) {
      if (start < 0) start = i;
      else if (gapRun >= minGap) {
        cols.push({ x0: x0 + start, x1: x0 + i - gapRun });
        start = i;
      }
      gapRun = 0;
    } else if (start >= 0) {
      gapRun++;
    }
  }
  if (start >= 0) cols.push({ x0: x0 + start, x1: x0 + cover.length - 1 - gapRun });
  return cols;
}

function detectTables(rows: Row[], width: number): TableFound[] {
  const found: TableFound[] = [];
  const strong = (r: Row) => r.frags.length >= 2;
  const weakOk = (r: Row) => r.frags.length === 1 && r.frags[0].x1 - r.frags[0].x0 < 0.45 * width;
  let i = 0;
  while (i < rows.length) {
    if (!strong(rows[i])) {
      i++;
      continue;
    }
    // Grow a zone of rows that look tabular (cells, or short labels between them).
    let j = i;
    while (j + 1 < rows.length) {
      const next = rows[j + 1];
      const fs = Math.max(rows[j].fs, next.fs);
      if (next.top - rows[j].bottom > 2.5 * fs) break;
      if (!strong(next) && !weakOk(next)) break;
      j++;
    }
    while (j > i && !strong(rows[j])) j--;
    const zone = rows.slice(i, j + 1);
    const strongRows = zone.filter(strong).length;
    const fs = median(zone.map((r) => r.fs));
    const cols = strongRows >= 2 ? tableColumns(zone, fs) : [];
    let ok = cols.length >= 2 && (strongRows >= 3 || (strongRows >= 2 && cols.length >= 3));
    if (ok) {
      // Two wide "columns" are running text (or a list with long items), not a table.
      const colMeanW = cols.map((c) => {
        const ws: number[] = [];
        for (const r of zone) for (const f of r.frags) if (overlap(f.x0, f.x1, c.x0, c.x1) > 0.5 * (f.x1 - f.x0)) ws.push(f.x1 - f.x0);
        return ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : 0;
      });
      if (cols.length === 2) {
        const bothWide = colMeanW[0] > 0.3 * width && colMeanW[1] > 0.3 * width;
        // "1." / "•" / "[12]" markers beside long text: a list, not a table.
        const firstCol = zone.flatMap((r) => r.frags.filter((f) => overlap(f.x0, f.x1, cols[0].x0, cols[0].x1) > 0.5 * (f.x1 - f.x0)));
        const markers = firstCol.filter((f) => f.pieces.map((p) => p.str).join("").length <= 4).length >= 0.7 * firstCol.length;
        if (bothWide || (markers && colMeanW[1] > 0.3 * width)) ok = false;
      }
      if (Math.max(...colMeanW) > 0.6 * width) ok = false;
      // Mostly-empty grids are scattered labels, not tables.
      let filled = 0;
      for (const r of zone) filled += cols.filter((c) => r.frags.some((f) => overlap(f.x0, f.x1, c.x0, c.x1) > 0)).length;
      if (filled / (zone.length * cols.length) < 0.3) ok = false;
    }
    if (ok) {
      found.push({ start: i, end: j, cols });
      i = j + 1;
    } else {
      i++;
    }
  }
  return found;
}

// ─── 4. Paragraphs ──────────────────────────────────────────────────────────

const BULLET_RE = /^[•●◦▪■□–—‣⁃∙·*\-]\s*/;
const NUMBER_RE = /^(\(?\d{1,2}[.)]|\(?[a-zA-Z][.)]|\(?[ivxIVX]{1,4}[.)])\s+/;

interface RawPara {
  lines: Line[];
  top: number;
  centered: boolean;
  list?: "bullet" | "number";
  indent?: number;
}

function isCentered(line: Line, bounds: Bounds): boolean {
  const center = (bounds.left + bounds.right) / 2;
  const w = bounds.right - bounds.left;
  const lw = line.x1 - line.x0;
  return lw < 0.85 * w && Math.abs((line.x0 + line.x1) / 2 - center) < Math.max(1.5 * line.fs, 0.03 * w) && line.x0 > bounds.left + 2 * line.fs;
}

function groupParagraphs(lines: Line[], bounds: Bounds): RawPara[] {
  if (!lines.length) return [];
  const leftEdge = lines.length >= 4 ? percentile(lines.map((l) => l.x0), 0.1) : bounds.left;
  const rightEdge = lines.length >= 4 ? percentile(lines.map((l) => l.x1), 0.9) : bounds.right;
  const width = Math.max(1, rightEdge - leftEdge);
  const justified = lines.filter((l) => l.x1 >= rightEdge - 1.5 * l.fs).length > 0.5 * lines.length;

  const deltas: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const d = lines[i].base - lines[i - 1].base;
    if (Math.abs(lines[i].fs - lines[i - 1].fs) < 0.5 && d > 0.9 * lines[i].fs && d < 2.5 * lines[i].fs) deltas.push(d / lines[i].fs);
  }
  const spacing = deltas.length >= 3 ? median(deltas) : 1.25;

  const paras: RawPara[] = [];
  let cur: RawPara | null = null;
  for (const line of lines) {
    const listKind = BULLET_RE.test(line.text) && line.text.length > 2 ? "bullet" : NUMBER_RE.test(line.text) ? "number" : undefined;
    const centered = isCentered(line, bounds);
    let start = !cur;
    if (cur) {
      const prev = cur.lines[cur.lines.length - 1];
      const fsChange = Math.abs(line.fs - prev.fs) > 0.12 * Math.max(line.fs, prev.fs);
      const d = (line.base - prev.base) / Math.max(line.fs, prev.fs);
      const bigGap = d > spacing * 1.3 + 0.1 || d < 0;
      const styleChange = prev.bold !== line.bold && (prev.text.length < 90 || line.text.length < 90);
      const prevShort = justified
        ? prev.x1 < rightEdge - Math.max(2 * prev.fs, 0.06 * width)
        : prev.x1 < rightEdge - 0.25 * width && /[.!?:]["')\]]?$/.test(prev.text);
      // First-line indent after a sentence end starts a paragraph...
      const indented =
        !cur.list && line.x0 > leftEdge + 0.8 * line.fs && line.x0 < leftEdge + 5 * line.fs && prev.x0 < leftEdge + 0.5 * line.fs && /[.!?:]["')\]]?$/.test(prev.text);
      // ...and so does going back out past a hanging indent (reference lists).
      const body = cur.lines.slice(1);
      const outdent = body.length > 0 && line.x0 < Math.min(...body.map((l) => l.x0)) - 0.8 * line.fs && body.every((l) => l.x0 > cur!.lines[0].x0 + 0.8 * line.fs);
      // A centred short line after full-width lines is just a paragraph's last line.
      const fullPrev = prev.x1 - prev.x0 > 0.85 * width;
      const centerChange = centered !== cur.centered && !(centered && !cur.centered && fullPrev);
      start = !!listKind || fsChange || bigGap || styleChange || (prevShort && !(centered && cur.centered)) || indented || outdent || centerChange;
      if (cur.list && !listKind && !bigGap && !fsChange && line.x0 > leftEdge + 0.5 * line.fs && !prevShort) start = false;
    }
    if (start) {
      cur = { lines: [line], top: line.top, centered, list: listKind };
      paras.push(cur);
    } else {
      cur!.lines.push(line);
    }
  }
  for (const p of paras) {
    if (!p.centered) {
      const x0 = p.lines.length > 1 ? Math.min(...p.lines.slice(1).map((l) => l.x0)) : p.lines[0].x0;
      const ind = x0 - leftEdge;
      if (ind > 1.5 * p.lines[0].fs && ind < 0.5 * width) p.indent = ind;
    }
  }
  return paras;
}

/** Joins the lines of a paragraph into runs, undoing end-of-line hyphenation. */
function paragraphRuns(lines: Line[]): Run[] {
  const runs: Run[] = [];
  lines.forEach((line, idx) => {
    const lr = line.runs.map((r) => ({ ...r }));
    if (idx > 0 && runs.length && lr.length) {
      const last = runs[runs.length - 1];
      const hyphen = /[A-Za-z]-$/.test(last.text) && /^[a-z]/.test(lr[0].text);
      if (hyphen) last.text = last.text.slice(0, -1);
      else if (!/\s$/.test(last.text)) lr[0].text = " " + lr[0].text;
    }
    for (const r of lr) pushRun(runs, r);
  });
  return runs;
}

// ─── Page and document ──────────────────────────────────────────────────────

interface Positioned {
  top: number;
  block: Block | { kind: "raw"; para: RawPara };
}

function buildTable(rows: Row[], t: TableFound): TableBlock {
  const tableRows: Run[][][] = [];
  const colOf = (f: Frag) => {
    // The column holding most of the fragment (spanning cells go to their widest overlap).
    let ci = 0;
    let best = -1;
    t.cols.forEach((c, k) => {
      const ov = overlap(f.x0, f.x1, c.x0, c.x1);
      if (ov > best) [best, ci] = [ov, k];
    });
    return ci;
  };
  // Wrapped cell text: a row set as tight as body lines, under filled cells,
  // continues the row above when the table's rows are otherwise spaced out
  // (or it is a lone fragment).
  const pitches: number[] = [];
  for (let r = t.start + 1; r <= t.end; r++) pitches.push((rows[r].base - rows[r - 1].base) / rows[r].fs);
  const loose = median(pitches) >= 1.45;
  let prevCells: Run[][] | null = null;
  for (let r = t.start; r <= t.end; r++) {
    const row = rows[r];
    if (prevCells && r > t.start) {
      const pitch = (row.base - rows[r - 1].base) / row.fs;
      const cont = pitch <= 1.3 && (loose || row.frags.length === 1) && row.frags.every((f) => prevCells![colOf(f)].length > 0);
      if (cont) {
        for (const f of row.frags) {
          const cell = prevCells[colOf(f)];
          const fr = runsForPieces([...f.pieces].sort((a, b) => a.x - b.x), f.fs, f.base);
          if (fr.length) {
            const last = cell[cell.length - 1];
            if (/[A-Za-z]-$/.test(last.text) && /^[a-z]/.test(fr[0].text)) last.text = last.text.slice(0, -1);
            else fr[0].text = " " + fr[0].text;
          }
          for (const run of fr) pushRun(cell, run);
        }
        continue;
      }
    }
    const cells: Run[][] = t.cols.map(() => []);
    prevCells = cells;
    for (const f of row.frags) {
      const ci = colOf(f);
      const fr = runsForPieces([...f.pieces].sort((a, b) => a.x - b.x), f.fs, f.base);
      if (cells[ci].length && fr.length) fr[0].text = " " + fr[0].text;
      for (const run of fr) pushRun(cells[ci], run);
    }
    tableRows.push(cells);
  }
  return { kind: "table", rows: tableRows, colWidths: t.cols.map((c, k) => (k + 1 < t.cols.length ? t.cols[k + 1].x0 : c.x1) - c.x0) };
}

function processLeaf(region: Region): Positioned[] {
  const out: Positioned[] = [];
  const rows = rowsFromFrags(region.frags);
  const width = Math.max(50, region.bounds.right - region.bounds.left);
  const tables = detectTables(rows, width);
  const inTable = new Set<number>();
  for (const t of tables) {
    for (let r = t.start; r <= t.end; r++) inTable.add(r);
    out.push({ top: rows[t.start].top, block: buildTable(rows, t) });
  }

  // Paragraphs from the remaining rows, split around tables so order is kept.
  let chunk: Line[] = [];
  const flush = () => {
    for (const p of groupParagraphs(chunk, region.bounds)) out.push({ top: p.top, block: { kind: "raw", para: p } });
    chunk = [];
  };
  rows.forEach((row, idx) => {
    if (inTable.has(idx)) {
      flush();
      return;
    }
    chunk.push(lineFromRow(row));
  });
  flush();

  for (const b of region.boxes) out.push({ top: b.top, block: b.block });
  return out.sort((a, b) => a.top - b.top);
}

interface PageLayout {
  page: PageContent;
  items: Positioned[];
  textLeft: number;
  textRight: number;
  columns: number;
}

function layoutPageRaw(page: PageContent): PageLayout {
  let frags = buildFragments(page.pieces);
  const textLeft = frags.length ? percentile(frags.map((f) => f.x0), 0.02) : 72;
  const textRight = frags.length ? percentile(frags.map((f) => f.x1), 0.98) : page.width - 72;
  const boxes: Box[] = [];
  // Full-page images behind text are scan backgrounds or decoration.
  const pageArea = page.width * page.height;
  for (const im of page.images) {
    if (!im.data || (frags.length > 20 && (im.x1 - im.x0) * (im.y1 - im.y0) > 0.85 * pageArea)) continue;
    boxes.push({ x0: im.x0, x1: im.x1, top: im.y0, bottom: im.y1, block: { kind: "image", data: im.data, width: im.x1 - im.x0, height: im.y1 - im.y0 } });
  }
  // Clear-cut tables (3+ columns, 4+ rows of cells, no column of long text
  // lines) that straddle the column gutter are taken out page-wide first, so a
  // wide table on a two-column page is not cut in half by the gutter.
  const g0 = findGutter(frags);
  const pageRows = g0 === null ? [] : rowsFromFrags(frags);
  const W = Math.max(50, textRight - textLeft);
  const taken = new Set<Frag>();
  for (const t of g0 === null ? [] : detectTables(pageRows, W)) {
    const zone = pageRows.slice(t.start, t.end + 1);
    if (t.cols.length < 3 || zone.filter((r) => r.frags.length >= 2).length < 4) continue;
    // Its rows must have cells on both sides of the gutter (not a table in one
    // column next to unrelated text in the other).
    const both = zone.filter((r) => r.frags.some((f) => f.x1 <= g0! + 3) && r.frags.some((f) => f.x0 >= g0! - 3)).length;
    if (both < 0.5 * zone.length) continue;
    const longCol = t.cols.some((c) => {
      const fs = zone.flatMap((r) => r.frags.filter((f) => overlap(f.x0, f.x1, c.x0, c.x1) > 0.5 * (f.x1 - f.x0)));
      const words = (f: Frag) => f.pieces.map((p) => p.str).join(" ").split(/\s+/).filter(Boolean).length;
      // Long lines or sentence-like lines (e.g. margin notes beside the table).
      return fs.filter((f) => f.x1 - f.x0 > 0.35 * W || words(f) >= 5).length > 0.5 * fs.length;
    });
    if (longCol) continue;
    const zf = zone.flatMap((r) => r.frags);
    zf.forEach((f) => taken.add(f));
    boxes.push({
      x0: Math.min(...zf.map((f) => f.x0)),
      x1: Math.max(...zf.map((f) => f.x1)),
      top: Math.min(...zone.map((r) => r.top)),
      bottom: Math.max(...zone.map((r) => r.bottom)),
      block: buildTable(pageRows, t),
    });
  }
  if (taken.size) frags = frags.filter((f) => !taken.has(f));
  const stats = { columns: 1 };
  const leaves = splitRegions({ frags, boxes, bounds: { left: textLeft, right: textRight } }, 0, stats);
  const items: Positioned[] = [];
  for (const leaf of leaves) items.push(...processLeaf(leaf));
  for (const s of page.rotatedText) {
    items.push({ top: Infinity, block: { kind: "paragraph", runs: [{ text: s, size: 8 }], size: 8 } });
  }
  return { page, items, textLeft, textRight, columns: stats.columns };
}

/** Most common font size (by characters) across the document. */
function bodyFontSize(pages: PageContent[]): number {
  const w = new Map<number, number>();
  for (const pg of pages) for (const p of pg.pieces) {
    const k = Math.round(p.fs * 2) / 2;
    w.set(k, (w.get(k) ?? 0) + p.str.length);
  }
  let best = 10;
  let bestN = -1;
  for (const [k, n] of w) if (n > bestN) [best, bestN] = [k, n];
  return best;
}

function paraStats(p: RawPara) {
  const pieces = p.lines.flatMap((l) => l.frags.flatMap((f) => f.pieces));
  const size = dominantSize(pieces);
  const text = p.lines.map((l) => l.text).join(" ").trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const allBold = p.lines.every((l) => l.bold);
  return { size, text, words, allBold };
}

/**
 * Lays out every page. Heading levels are decided across the whole
 * document so the same font size maps to the same level everywhere.
 */
export function layoutDocument(pages: PageContent[]): PageBlocks[] {
  const body = bodyFontSize(pages);
  const layouts = pages.map(layoutPageRaw);

  // Text repeated on many pages (running heads, figure labels) is never a heading.
  const norm = (t: string) => t.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
  const textCounts = new Map<string, number>();
  for (const l of layouts) for (const it of l.items) {
    if (it.block.kind !== "raw") continue;
    const k = norm(paraStats(it.block.para).text);
    textCounts.set(k, (textCounts.get(k) ?? 0) + 1);
  }
  const repeated = (t: string) => (textCounts.get(norm(t)) ?? 0) >= 3;

  // Heading sizes: font sizes clearly above body text used by short paragraphs.
  // Sizes within ~8% of each other share a level.
  const candSizes: number[] = [];
  for (const l of layouts) for (const it of l.items) {
    if (it.block.kind !== "raw") continue;
    const s = paraStats(it.block.para);
    if (s.size >= body * 1.15 && s.words <= 20 && it.block.para.lines.length <= 3 && /[A-Za-z]{2}/.test(s.text) && !repeated(s.text)) candSizes.push(s.size);
  }
  const levelTops: number[] = [];
  for (const sz of [...new Set(candSizes.map((x) => Math.round(x * 2) / 2))].sort((a, b) => b - a)) {
    if (!levelTops.length || sz < levelTops[levelTops.length - 1] * 0.92) levelTops.push(sz);
  }
  const headingLevels = levelTops.slice(0, 3);
  const levelForSize = (sz: number) => {
    if (sz < body * 1.15) return -1;
    for (let i = headingLevels.length - 1; i >= 0; i--) if (sz <= headingLevels[i] * 1.001 && sz >= headingLevels[i] * 0.92) return i;
    return sz > (headingLevels[0] ?? Infinity) ? 0 : -1;
  };
  const boldLevel = Math.min(headingLevels.length + 1, 4);

  return layouts.map((l) => {
    const blocks: Block[] = [];
    for (const it of l.items) {
      if (it.block.kind !== "raw") {
        blocks.push(it.block);
        continue;
      }
      const p = it.block.para;
      const s = paraStats(p);
      if (!s.text) continue;
      const runs = paragraphRuns(p.lines);
      const block: ParagraphBlock = { kind: "paragraph", runs, size: s.size };
      const lvl = repeated(s.text) ? -1 : levelForSize(Math.round(s.size * 2) / 2);
      if (lvl >= 0 && s.words <= 20 && p.lines.length <= 3 && /[A-Za-z]{2}/.test(s.text)) {
        block.heading = lvl + 1;
      } else if (
        s.allBold &&
        !repeated(s.text) &&
        p.lines.length <= 2 &&
        s.words <= 14 &&
        s.size >= body * 0.95 &&
        !/[.,;:]$/.test(s.text) &&
        /^[\p{Lu}\d]/u.test(s.text) &&
        /[A-Za-z]{2}/.test(s.text)
      ) {
        block.heading = boldLevel;
      }
      if (!block.heading && p.list) {
        block.list = p.list;
        if (p.list === "bullet") {
          const first = runs[0];
          first.text = first.text.replace(BULLET_RE, "");
          if (!first.text) runs.shift();
          if (runs[0]) runs[0].text = runs[0].text.replace(/^\s+/, "");
        }
      }
      if (p.centered) block.align = "center";
      if (p.indent && !block.list && !block.heading) block.indent = p.indent;
      blocks.push(block);
    }
    return {
      pageNumber: l.page.pageNumber,
      width: l.page.width,
      height: l.page.height,
      blocks,
      textLeft: l.textLeft,
      textRight: l.textRight,
      ocr: l.page.ocr,
      columns: l.columns,
    };
  });
}

/** Body font size of the document, for the Word default style. */
export { bodyFontSize };
