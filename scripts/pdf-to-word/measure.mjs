#!/usr/bin/env node
/**
 * Measures a PDF → Word conversion against poppler's `pdftotext`.
 *
 *   node scripts/pdf-to-word/measure.mjs input.pdf output.docx [--ref ref.txt] [--json]
 *
 * Reports:
 *  - word recall: share of reference words present in the .docx (bag of words)
 *  - ordered recall: longest common subsequence / reference words, i.e. words
 *    that come through *in reading order*; also per page (the converter starts
 *    every PDF page on a new Word page). Strict: any block pdftotext places
 *    differently (figure labels, table cells, which pdftotext reads column by
 *    column) counts against it.
 *  - run coverage: reference words inside a 12-word run found verbatim in the
 *    output (block-order tolerant, but catches interleaved columns)
 *  - structure found in word/document.xml: headings, bold/italic runs,
 *    tables (rows × cols), embedded images
 *  - whether LibreOffice opens the file (soffice --headless --convert-to txt)
 *
 * The reference is `pdftotext input.pdf` unless --ref is given (needed for
 * scanned PDFs, which have no text layer). With --raw it is `pdftotext -raw`
 * (content-stream order), which for LaTeX output is usually the true
 * reading order, while pdftotext's default layout analysis sometimes reads a
 * right column before the left one or scatters figure labels.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--") && !a.includes("=")));
const refIdx = args.indexOf("--ref");
const refFile = refIdx >= 0 ? args[refIdx + 1] : null;
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--ref");
const [pdfPath, docxPath] = positional;
if (!pdfPath || !docxPath) {
  console.error("usage: measure.mjs input.pdf output.docx [--ref ref.txt] [--json]");
  process.exit(2);
}

// ─── Text normalisation ──────────────────────────────────────────────────────

export function words(text) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u00ad\u2010\u2011\u2012\u2013\u2014-]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Length of the longest common subsequence (O(n·m) time, O(m) memory). */
function lcs(a, b) {
  const ids = new Map();
  const id = (w) => {
    let v = ids.get(w);
    if (v === undefined) ids.set(w, (v = ids.size));
    return v;
  };
  const A = Int32Array.from(a, id);
  const B = Int32Array.from(b, id);
  let prev = new Int32Array(B.length + 1);
  let cur = new Int32Array(B.length + 1);
  for (let i = 1; i <= A.length; i++) {
    const ai = A[i - 1];
    for (let j = 1; j <= B.length; j++) {
      cur[j] = ai === B[j - 1] ? prev[j - 1] + 1 : cur[j - 1] > prev[j] ? cur[j - 1] : prev[j];
    }
    [prev, cur] = [cur, prev];
  }
  return prev[B.length];
}

/**
 * Share of reference words covered by a run of RUN consecutive words that also
 * appears verbatim in the output. Tolerates whole blocks (figures, tables,
 * footnotes) being placed elsewhere, but not text read in the wrong order
 * inside a paragraph, e.g. two columns interleaved line by line (a column
 * line is shorter than RUN words).
 */
const RUN = 12;
function runCoverage(ref, out) {
  if (ref.length < RUN) return bagRecall(ref, out);
  const key = (arr, i) => arr.slice(i, i + RUN).join(" ");
  const grams = new Set();
  for (let j = 0; j + RUN <= out.length; j++) grams.add(key(out, j));
  const covered = new Uint8Array(ref.length);
  for (let i = 0; i + RUN <= ref.length; i++) if (grams.has(key(ref, i))) covered.fill(1, i, i + RUN);
  return covered.reduce((a, b) => a + b, 0) / ref.length;
}

function bagRecall(ref, out) {
  const counts = new Map();
  for (const w of out) counts.set(w, (counts.get(w) ?? 0) + 1);
  let hit = 0;
  for (const w of ref) {
    const n = counts.get(w) ?? 0;
    if (n > 0) {
      hit++;
      counts.set(w, n - 1);
    }
  }
  return ref.length ? hit / ref.length : 1;
}

// ─── .docx parsing ───────────────────────────────────────────────────────────

const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function paragraphText(xml) {
  let t = "";
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g;
  let m;
  while ((m = re.exec(xml))) t += m[1] !== undefined ? decode(m[1]) : " ";
  return t;
}

function parseDocx(file) {
  const zip = unzipSync(new Uint8Array(fs.readFileSync(file)));
  const xml = strFromU8(zip["word/document.xml"]);
  const body = xml.slice(xml.indexOf("<w:body>"), xml.lastIndexOf("</w:body>"));
  const pages = [[]];
  const paras = body.match(/<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g) ?? [];
  for (const p of paras) {
    if (/<w:pageBreakBefore\/>|<w:pageBreakBefore w:val="(true|1|on)"\/>/.test(p)) pages.push([]);
    pages[pages.length - 1].push(paragraphText(p));
  }
  const headings = {};
  for (const m of body.matchAll(/<w:pStyle w:val="(Heading\d|Title)"\/>/g)) headings[m[1]] = (headings[m[1]] ?? 0) + 1;
  const runs = body.match(/<w:r>[\s\S]*?<\/w:r>|<w:r [\s\S]*?<\/w:r>/g) ?? [];
  const isOn = (r, tag) => new RegExp(`<w:${tag}/>|<w:${tag} w:val="(true|1|on)"/>`).test(r);
  const boldRuns = runs.filter((r) => isOn(r, "b")).length;
  const italicRuns = runs.filter((r) => isOn(r, "i")).length;
  const tables = [...body.matchAll(/<w:tbl>([\s\S]*?)<\/w:tbl>/g)].map((m) => {
    const rows = m[1].match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? [];
    const cols = Math.max(0, ...rows.map((r) => (r.match(/<w:tc>/g) ?? []).length));
    const cells = rows.map((r) => (r.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []).map((c) => paragraphText(c).trim()));
    return { rows: rows.length, cols, sample: cells.slice(0, 2).map((r) => r.join(" | ")) };
  });
  const drawings = (body.match(/<w:drawing>/g) ?? []).length;
  const media = Object.keys(zip).filter((k) => k.startsWith("word/media/") && !k.endsWith("/"));
  return { pages, headings, boldRuns, italicRuns, tables, drawings, media: media.length };
}

// ─── LibreOffice ─────────────────────────────────────────────────────────────

function libreOfficeCheck(file) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "p2w-lo-"));
  const profile = `file://${fs.mkdtempSync(path.join(os.tmpdir(), "p2w-lo-profile-"))}`;
  try {
    execFileSync("soffice", [`-env:UserInstallation=${profile}`, "--headless", "--convert-to", "pdf", "--outdir", outDir, file], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180_000,
    });
    const pdf = path.join(outDir, path.basename(file).replace(/\.docx$/i, ".pdf"));
    if (!fs.existsSync(pdf)) return { ok: false, error: "no PDF produced" };
    const info = execFileSync("pdfinfo", [pdf], { encoding: "utf8" });
    const pages = Number(/Pages:\s+(\d+)/.exec(info)?.[1] ?? 0);
    const text = execFileSync("pdftotext", [pdf, "-"], { encoding: "utf8", maxBuffer: 64 << 20 });
    return { ok: pages > 0, pages, words: words(text).length };
  } catch (e) {
    return { ok: false, error: String(e.stderr || e.message).slice(0, 300) };
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

const refText = refFile
  ? fs.readFileSync(refFile, "utf8")
  : execFileSync("pdftotext", [...(flags.has("--raw") ? ["-raw"] : []), pdfPath, "-"], { encoding: "utf8", maxBuffer: 64 << 20 });
const refPages = refFile ? [refText] : refText.split("\f");
const doc = parseDocx(docxPath);
const outText = doc.pages.map((p) => p.join("\n")).join("\n");
const refWords = words(refText);
const outWords = words(outText);

const perPage = [];
if (!refFile && doc.pages.length === refPages.length - (refPages[refPages.length - 1].trim() ? 0 : 1)) {
  doc.pages.forEach((p, i) => {
    const r = words(refPages[i] ?? "");
    const o = words(p.join("\n"));
    if (r.length) perPage.push({ page: i + 1, refWords: r.length, ordered: lcs(r, o) / r.length, runs: runCoverage(r, o) });
  });
}

const result = {
  pdf: path.basename(pdfPath),
  refWords: refWords.length,
  outWords: outWords.length,
  recall: bagRecall(refWords, outWords),
  orderedRecall: refWords.length ? lcs(refWords, outWords) / refWords.length : 1,
  runCoverage: runCoverage(refWords, outWords),
  perPage,
  headings: doc.headings,
  boldRuns: doc.boldRuns,
  italicRuns: doc.italicRuns,
  tables: doc.tables,
  images: { drawings: doc.drawings, mediaFiles: doc.media },
  libreoffice: flags.has("--no-soffice") ? null : libreOfficeCheck(docxPath),
};

if (flags.has("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const pct = (x) => `${(x * 100).toFixed(2)}%`;
  console.log(`${result.pdf}: ${result.refWords} reference words, ${result.outWords} in .docx`);
  console.log(`  word recall ${pct(result.recall)}, in reading order: LCS ${pct(result.orderedRecall)}, ${RUN}-word runs ${pct(result.runCoverage)}`);
  if (perPage.length) console.log(`  lowest pages: ${[...perPage].sort((a, b) => a.ordered - b.ordered).slice(0, 4).map((p) => `p${p.page} ${pct(p.ordered)}`).join(", ")}`);
  console.log(`  headings ${JSON.stringify(result.headings)}, bold runs ${result.boldRuns}, italic runs ${result.italicRuns}`);
  console.log(`  tables ${result.tables.length}: ${result.tables.map((t) => `${t.rows}x${t.cols}`).join(", ")}`);
  console.log(`  images ${result.images.drawings} (media files ${result.images.mediaFiles})`);
  if (result.libreoffice) console.log(`  LibreOffice: ${result.libreoffice.ok ? `opened, ${result.libreoffice.pages} pages` : `FAILED ${result.libreoffice.error}`}`);
}
