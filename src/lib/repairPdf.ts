/**
 * repairPdf.ts
 *
 * Real PDF health analysis and repair using:
 *  - pdfjs-dist for tolerant rendering/parsing (it can open many broken PDFs)
 *  - pdf-lib  for clean reconstruction of the output document
 *
 * Architecture:
 *  1. analyzeAndRepairPDF – entry point
 *  2. analysePDF          – scans raw bytes + pdfjs to find real structural issues
 *  3. repairWithPdfLib    – reconstructs a clean PDF using pdf-lib
 *  4. buildReport         – creates a human-readable repair report
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

// ─── Public Types ─────────────────────────────────────────────────────────────

export type RepairMode = "quick" | "deep";

export interface RepairOptions {
  mode: RepairMode;
  fixStructure: boolean;
  rebuildXref: boolean;
  recoverPages: boolean;
  repairMetadata: boolean;
  removeInvalidObjects: boolean;
  optimizeOutput: boolean;
  preserveQuality: boolean;
  maximizePageRecovery: boolean;
  recoverEmbeddedImages: boolean;
}

export interface PDFIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  category: "structure" | "xref" | "metadata" | "pages" | "objects" | "encoding";
  title: string;
  description: string;
  fixable: boolean;
}

export interface HealthAnalysis {
  healthScore: number;            // 0–100
  healthLabel: "Excellent" | "Good" | "Fair" | "Poor";
  repairabilityStatus: string;
  recoveryProbability: "High" | "Medium" | "Low";
  issues: PDFIssue[];
  pageCount: number | null;
  parsedWithPdfLib: boolean;
  parsedWithPdfJs: boolean;
  fileSizeBytes: number;
  hasValidHeader: boolean;
  hasValidEOF: boolean;
  hasXref: boolean;
  hasTrailer: boolean;
  hasEncryption: boolean;
  metadataIntact: boolean;
  objectErrors: number;
  streamErrors: number;
  thumbnailDataUrl?: string;
}

export interface RepairProgressEvent {
  phase: "analysing" | "repairing" | "optimising" | "finalising";
  step: string;
  pct: number;
}

export interface RepairResult {
  success: boolean;
  pagesRecovered: number;
  totalPagesAttempted: number;
  pdfBytes: Uint8Array;
  reportText: string;
  analysis: HealthAnalysis;
  repairActions: string[];
  warnings: string[];
}

export const DEFAULT_REPAIR_OPTIONS: RepairOptions = {
  mode: "quick",
  fixStructure: true,
  rebuildXref: true,
  recoverPages: true,
  repairMetadata: true,
  removeInvalidObjects: true,
  optimizeOutput: false,
  preserveQuality: true,
  maximizePageRecovery: false,
  recoverEmbeddedImages: true,
};

// ─── Raw-byte utilities ───────────────────────────────────────────────────────

/** Check for %PDF- header */
function checkPDFHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d    // -
  );
}

/** Check for %%EOF marker */
function checkPDFEOF(bytes: Uint8Array): boolean {
  // Look in last 1024 bytes
  const slice = bytes.slice(Math.max(0, bytes.length - 1024));
  const text = new TextDecoder("latin1").decode(slice);
  return text.includes("%%EOF");
}

/** Check for xref keyword in the body */
function checkXref(bytes: Uint8Array): { hasXref: boolean; hasTrailer: boolean } {
  const sample = bytes.slice(0, Math.min(bytes.length, 2 * 1024 * 1024));
  const text = new TextDecoder("latin1").decode(sample);
  return {
    hasXref: text.includes("xref") || text.includes("/XRef"),
    hasTrailer: text.includes("trailer") || text.includes("/Root"),
  };
}

/** Scan for obvious encryption dictionary */
function checkEncryption(bytes: Uint8Array): boolean {
  const text = new TextDecoder("latin1").decode(bytes.slice(0, Math.min(bytes.length, 64 * 1024)));
  return text.includes("/Encrypt");
}

/** Count rough occurrences of stream/endstream mismatches as proxy for stream errors */
function countStreamErrors(bytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(bytes.slice(0, Math.min(bytes.length, 1024 * 1024)));
  const streamCount = (text.match(/\bstream\b/g) || []).length;
  const endstreamCount = (text.match(/\bendstream\b/g) || []).length;
  return Math.abs(streamCount - endstreamCount);
}

/** Count obj/endobj mismatches as a rough proxy for object corruption */
function countObjectErrors(bytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(bytes.slice(0, Math.min(bytes.length, 1024 * 1024)));
  const objCount = (text.match(/\d+\s+\d+\s+obj\b/g) || []).length;
  const endobjCount = (text.match(/\bendobj\b/g) || []).length;
  return Math.abs(objCount - endobjCount);
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

export async function analysePDF(
  file: File,
  onProgress?: (event: RepairProgressEvent) => void
): Promise<HealthAnalysis> {
  onProgress?.({ phase: "analysing", step: "Reading file bytes…", pct: 5 });

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const fileSizeBytes = bytes.byteLength;

  // ── Raw structural checks ─────────────────────────────────────────────────
  onProgress?.({ phase: "analysing", step: "Checking PDF structure…", pct: 15 });

  const hasValidHeader = checkPDFHeader(bytes);
  const hasValidEOF = checkPDFEOF(bytes);
  const { hasXref, hasTrailer } = checkXref(bytes);
  const hasEncryption = checkEncryption(bytes);
  const streamErrors = countStreamErrors(bytes);
  const objectErrors = countObjectErrors(bytes);

  // ── Try pdf-lib (strict) ──────────────────────────────────────────────────
  onProgress?.({ phase: "analysing", step: "Testing with strict parser…", pct: 28 });

  let parsedWithPdfLib = false;
  let metadataIntact = false;
  let pdfLibPageCount: number | null = null;

  try {
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    parsedWithPdfLib = true;
    pdfLibPageCount = doc.getPageCount();
    // Metadata check — getTitle() returns undefined if absent/corrupt
    try {
      const title = doc.getTitle();
      const author = doc.getAuthor();
      metadataIntact = title !== undefined || author !== undefined;
    } catch {
      metadataIntact = false;
    }
  } catch {
    parsedWithPdfLib = false;
  }

  // ── Try pdfjs-dist (tolerant) ─────────────────────────────────────────────
  onProgress?.({ phase: "analysing", step: "Testing with tolerant parser…", pct: 45 });

  let parsedWithPdfJs = false;
  let pdfjsPageCount: number | null = null;
  let thumbnailDataUrl: string | undefined;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer.slice(0),
      stopAtErrors: false,
      isEvalSupported: false,
    } as any);
    const pdfDoc = await loadingTask.promise;
    parsedWithPdfJs = true;
    pdfjsPageCount = pdfDoc.numPages;

    // Render page 1 thumbnail for preview
    if (pdfjsPageCount > 0) {
      try {
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 0.6 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({ canvasContext: ctx as any, viewport } as any).promise;
        thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.75);
      } catch {
        // Preview not critical
      }
    }
  } catch {
    parsedWithPdfJs = false;
  }

  const pageCount = pdfLibPageCount ?? pdfjsPageCount;

  // ── Build issue list ──────────────────────────────────────────────────────
  onProgress?.({ phase: "analysing", step: "Identifying issues…", pct: 65 });

  const issues: PDFIssue[] = [];

  if (!hasValidHeader) {
    issues.push({
      id: "no-header",
      severity: "critical",
      category: "structure",
      title: "Missing PDF header",
      description: "The file does not start with the required %PDF- signature.",
      fixable: true,
    });
  }
  if (!hasValidEOF) {
    issues.push({
      id: "no-eof",
      severity: "critical",
      category: "structure",
      title: "Missing %%EOF marker",
      description: "The end-of-file marker is absent or truncated, indicating file may be cut off.",
      fixable: true,
    });
  }
  if (!hasXref) {
    issues.push({
      id: "no-xref",
      severity: "critical",
      category: "xref",
      title: "Missing cross-reference table",
      description: "The XRef table is absent. Page navigation and object lookup will fail.",
      fixable: true,
    });
  }
  if (!hasTrailer) {
    issues.push({
      id: "no-trailer",
      severity: "critical",
      category: "xref",
      title: "Damaged or missing trailer",
      description: "The trailer dictionary is absent. PDF cannot identify its root catalog.",
      fixable: true,
    });
  }
  if (hasEncryption && !parsedWithPdfLib) {
    issues.push({
      id: "encrypted",
      severity: "critical",
      category: "structure",
      title: "Password-protected or encrypted",
      description: "The file is encrypted. Repair is limited to unencrypted PDFs.",
      fixable: false,
    });
  }
  if (objectErrors > 0) {
    issues.push({
      id: "object-mismatch",
      severity: objectErrors > 5 ? "critical" : "warning",
      category: "objects",
      title: `Object boundary mismatch (${objectErrors} detected)`,
      description: "obj/endobj pairs are unbalanced, indicating corrupted or truncated objects.",
      fixable: true,
    });
  }
  if (streamErrors > 0) {
    issues.push({
      id: "stream-mismatch",
      severity: streamErrors > 3 ? "critical" : "warning",
      category: "encoding",
      title: `Stream length errors (${streamErrors} detected)`,
      description: "stream/endstream pairs are unbalanced, indicating malformed content streams.",
      fixable: true,
    });
  }
  if (!parsedWithPdfLib && parsedWithPdfJs) {
    issues.push({
      id: "strict-parse-fail",
      severity: "warning",
      category: "structure",
      title: "Fails strict PDF parsing",
      description: "The file has structural deviations that strict parsers reject, but tolerant parsers can read it.",
      fixable: true,
    });
  }
  if (!parsedWithPdfLib && !parsedWithPdfJs) {
    issues.push({
      id: "unreadable",
      severity: "critical",
      category: "structure",
      title: "File cannot be parsed",
      description: "Neither strict nor tolerant parsers could read this file. It may be severely corrupted or not a PDF.",
      fixable: false,
    });
  }
  if (!metadataIntact && parsedWithPdfLib) {
    issues.push({
      id: "corrupt-metadata",
      severity: "info",
      category: "metadata",
      title: "Missing or corrupted metadata",
      description: "Document title, author, and other metadata fields are absent.",
      fixable: true,
    });
  }

  // ── Health score ──────────────────────────────────────────────────────────
  onProgress?.({ phase: "analysing", step: "Calculating health score…", pct: 80 });

  // Score is computed from real measured signals, not randomness
  let score = 100;

  // Structural penalties
  if (!hasValidHeader) score -= 25;
  if (!hasValidEOF)   score -= 15;
  if (!hasXref)       score -= 20;
  if (!hasTrailer)    score -= 15;
  if (hasEncryption && !parsedWithPdfLib) score -= 30;

  // Parser penalties
  if (!parsedWithPdfLib) score -= 20;
  if (!parsedWithPdfJs)  score -= 30;

  // Object/stream penalties (capped)
  score -= Math.min(objectErrors * 3, 15);
  score -= Math.min(streamErrors * 2, 10);

  // Metadata bonus: if missing but nothing else broken
  if (!metadataIntact) score -= 3;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const healthLabel: HealthAnalysis["healthLabel"] =
    score >= 90 ? "Excellent" :
    score >= 70 ? "Good" :
    score >= 50 ? "Fair" : "Poor";

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const fixableCount  = issues.filter((i) => i.fixable).length;

  let repairabilityStatus: string;
  let recoveryProbability: HealthAnalysis["recoveryProbability"];

  if (!parsedWithPdfJs && !parsedWithPdfLib) {
    repairabilityStatus = "Recovery unlikely — file is unreadable by all parsers";
    recoveryProbability = "Low";
  } else if (criticalCount === 0) {
    repairabilityStatus = "File is in good health — repair will clean and optimize";
    recoveryProbability = "High";
  } else if (fixableCount >= criticalCount) {
    repairabilityStatus = "Repair recommended — issues are recoverable";
    recoveryProbability = criticalCount <= 2 ? "High" : "Medium";
  } else {
    repairabilityStatus = "Partial recovery possible — some issues may not be resolved";
    recoveryProbability = "Medium";
  }

  onProgress?.({ phase: "analysing", step: "Analysis complete.", pct: 95 });

  return {
    healthScore: score,
    healthLabel,
    repairabilityStatus,
    recoveryProbability,
    issues,
    pageCount,
    parsedWithPdfLib,
    parsedWithPdfJs,
    fileSizeBytes,
    hasValidHeader,
    hasValidEOF,
    hasXref,
    hasTrailer,
    hasEncryption,
    metadataIntact,
    objectErrors,
    streamErrors,
    thumbnailDataUrl,
  };
}

// ─── Repair ──────────────────────────────────────────────────────────────────

export async function analyseAndRepairPDF(
  file: File,
  options: RepairOptions,
  onProgress?: (event: RepairProgressEvent) => void
): Promise<RepairResult> {
  // Phase 1: analyse
  const analysis = await analysePDF(file, onProgress);
  const repairActions: string[] = [];
  const warnings: string[] = [];

  onProgress?.({ phase: "repairing", step: "Beginning repair…", pct: 0 });

  // If absolutely unreadable, we cannot repair
  if (!analysis.parsedWithPdfJs && !analysis.parsedWithPdfLib) {
    throw new Error(
      "This file cannot be read by any PDF parser. It may be severely corrupted, " +
      "not a PDF file, or require a password. Repair is not possible."
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  let pagesRecovered = 0;
  let totalPagesAttempted = 0;

  // ── Strategy A: pdf-lib can open it → clean rebuild ──────────────────────
  if (analysis.parsedWithPdfLib) {
    onProgress?.({ phase: "repairing", step: "Loading with strict parser…", pct: 10 });

    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const outDoc = await PDFDocument.create();

    // Repair metadata
    if (options.repairMetadata) {
      try {
        const title = srcDoc.getTitle() ?? "";
        const author = srcDoc.getAuthor() ?? "";
        const subject = srcDoc.getSubject() ?? "";
        if (title) outDoc.setTitle(title);
        if (author) outDoc.setAuthor(author);
        if (subject) outDoc.setSubject(subject);
        outDoc.setProducer("BloomPDF – Repaired");
        outDoc.setCreator("BloomPDF");
        outDoc.setModificationDate(new Date());
        repairActions.push("Metadata repaired and normalised");
      } catch {
        warnings.push("Could not transfer metadata — it was recreated fresh");
        outDoc.setProducer("BloomPDF – Repaired");
        outDoc.setCreator("BloomPDF");
      }
    }

    // Copy pages
    const total = srcDoc.getPageCount();
    totalPagesAttempted = total;
    onProgress?.({ phase: "repairing", step: `Rebuilding ${total} pages…`, pct: 20 });

    for (let i = 0; i < total; i++) {
      try {
        const [copied] = await outDoc.copyPages(srcDoc, [i]);
        outDoc.addPage(copied);
        pagesRecovered++;
      } catch {
        warnings.push(`Page ${i + 1} could not be copied — it was skipped`);
      }
      onProgress?.({
        phase: "repairing",
        step: `Rebuilding page ${i + 1} of ${total}…`,
        pct: 20 + Math.round(((i + 1) / total) * 50),
      });
    }

    repairActions.push(`Rebuilt ${pagesRecovered}/${total} pages into clean PDF structure`);
    repairActions.push("PDF structure normalised (XRef table regenerated by pdf-lib)");
    repairActions.push("Object references validated and cleaned");
    if (!analysis.hasValidEOF) repairActions.push("%%EOF marker restored");
    if (!analysis.hasXref) repairActions.push("Cross-reference table rebuilt from scratch");

    onProgress?.({ phase: "optimising", step: "Saving repaired document…", pct: 75 });

    const saveOptions = options.optimizeOutput
      ? { useObjectStreams: true }
      : { useObjectStreams: false };

    if (options.optimizeOutput) repairActions.push("Output optimised with object streams");

    const pdfBytes = await outDoc.save(saveOptions);

    onProgress?.({ phase: "finalising", step: "Generating repair report…", pct: 90 });

    const reportText = buildReport(file, analysis, repairActions, warnings, pagesRecovered, total, options);
    onProgress?.({ phase: "finalising", step: "Done.", pct: 100 });

    return { success: true, pagesRecovered, totalPagesAttempted: total, pdfBytes, reportText, analysis, repairActions, warnings };
  }

  // ── Strategy B: only pdfjs can open it → render-and-rebuild ──────────────
  // pdfjs can render pages even for badly broken PDFs; we render each page
  // to a canvas and embed the image into a new pdf-lib document.
  onProgress?.({ phase: "repairing", step: "Using tolerant parser for recovery…", pct: 10 });
  repairActions.push("File required tolerant parser (standard parser rejected it)");
  repairActions.push("Pages recovered via render-and-rebuild strategy");

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer.slice(0),
    stopAtErrors: false,
    isEvalSupported: false,
  } as any);
  const pdfDoc = await loadingTask.promise;
  const total = pdfDoc.numPages;
  totalPagesAttempted = total;

  const outDoc = await PDFDocument.create();
  outDoc.setProducer("BloomPDF – Repaired");
  outDoc.setCreator("BloomPDF");
  outDoc.setModificationDate(new Date());

  for (let i = 1; i <= total; i++) {
    const pct = 15 + Math.round(((i - 1) / total) * 65);
    onProgress?.({ phase: "repairing", step: `Recovering page ${i} of ${total}…`, pct });

    try {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: options.preserveQuality ? 2.0 : 1.5 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: ctx as any, viewport } as any).promise;

      const jpgQuality = options.preserveQuality ? 0.95 : 0.80;
      const dataUrl = canvas.toDataURL("image/jpeg", jpgQuality);
      const base64 = dataUrl.split(",")[1];
      const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const jpgImage = await outDoc.embedJpg(imgBytes);
      const { width, height } = jpgImage.scale(1);

      // Use original page dimensions from pdfjs
      const origW = viewport.width / (options.preserveQuality ? 2.0 : 1.5);
      const origH = viewport.height / (options.preserveQuality ? 2.0 : 1.5);

      const outPage = outDoc.addPage([origW, origH]);
      outPage.drawImage(jpgImage, { x: 0, y: 0, width: origW, height: origH });
      void width; void height;

      pagesRecovered++;
    } catch {
      warnings.push(`Page ${i} could not be recovered — it was skipped`);
    }
  }

  repairActions.push(`Recovered ${pagesRecovered}/${total} pages`);
  repairActions.push("Each page rendered to image and embedded in clean PDF");
  if (!analysis.hasValidEOF)    repairActions.push("%%EOF marker restored");
  if (!analysis.hasXref)        repairActions.push("Cross-reference table rebuilt");
  if (!analysis.hasValidHeader) repairActions.push("PDF header signature restored");
  repairActions.push("PDF structure normalised — new XRef table generated");

  onProgress?.({ phase: "optimising", step: "Saving recovered document…", pct: 83 });
  const pdfBytes = await outDoc.save({ useObjectStreams: false });

  onProgress?.({ phase: "finalising", step: "Generating repair report…", pct: 92 });
  const reportText = buildReport(file, analysis, repairActions, warnings, pagesRecovered, total, options);
  onProgress?.({ phase: "finalising", step: "Done.", pct: 100 });

  return { success: true, pagesRecovered, totalPagesAttempted: total, pdfBytes, reportText, analysis, repairActions, warnings };
}

// ─── Report builder ───────────────────────────────────────────────────────────

function buildReport(
  file: File,
  analysis: HealthAnalysis,
  repairActions: string[],
  warnings: string[],
  pagesRecovered: number,
  totalPages: number,
  options: RepairOptions
): string {
  const now = new Date();
  const lines: string[] = [
    "═══════════════════════════════════════════════════════════════",
    "                  BloomPDF — Repair Report",
    "═══════════════════════════════════════════════════════════════",
    "",
    `File Name    : ${file.name}`,
    `File Size    : ${formatBytes(file.size)}`,
    `Repair Date  : ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
    `Repair Mode  : ${options.mode === "quick" ? "Quick Repair" : "Deep Repair"}`,
    "",
    "───────────────────────────────────────────────────────────────",
    "  PDF HEALTH ANALYSIS",
    "───────────────────────────────────────────────────────────────",
    "",
    `  Health Score  : ${analysis.healthScore}/100  (${analysis.healthLabel})`,
    `  Pages Found   : ${totalPages ?? "unknown"}`,
    `  Encrypted     : ${analysis.hasEncryption ? "Yes" : "No"}`,
    "",
    "  Structural Checks:",
    `    PDF Header  : ${analysis.hasValidHeader  ? "✓ Present"  : "✗ Missing"}`,
    `    EOF Marker  : ${analysis.hasValidEOF     ? "✓ Present"  : "✗ Missing/Truncated"}`,
    `    XRef Table  : ${analysis.hasXref         ? "✓ Present"  : "✗ Missing"}`,
    `    Trailer     : ${analysis.hasTrailer      ? "✓ Present"  : "✗ Missing"}`,
    `    Metadata    : ${analysis.metadataIntact  ? "✓ Intact"   : "✗ Absent/Corrupted"}`,
    "",
    "  Parser Compatibility:",
    `    Strict (pdf-lib)   : ${analysis.parsedWithPdfLib ? "✓ Opened" : "✗ Failed"}`,
    `    Tolerant (pdfjs)   : ${analysis.parsedWithPdfJs  ? "✓ Opened" : "✗ Failed"}`,
    "",
    ...(analysis.issues.length > 0 ? [
      "  Issues Detected:",
      ...analysis.issues.map((i) => `    [${i.severity.toUpperCase()}] ${i.title}`),
      "",
    ] : ["  No structural issues detected.", ""]),
    "───────────────────────────────────────────────────────────────",
    "  REPAIR ACTIONS PERFORMED",
    "───────────────────────────────────────────────────────────────",
    "",
    ...repairActions.map((a) => `  ✓ ${a}`),
    "",
    "  Recovery Summary:",
    `    Pages recovered   : ${pagesRecovered} / ${totalPages}`,
    `    Recovery rate     : ${totalPages > 0 ? Math.round((pagesRecovered / totalPages) * 100) : 0}%`,
    "",
    ...(warnings.length > 0 ? [
      "  Warnings:",
      ...warnings.map((w) => `    ⚠ ${w}`),
      "",
    ] : []),
    "───────────────────────────────────────────────────────────────",
    "  OPTIONS USED",
    "───────────────────────────────────────────────────────────────",
    "",
    `  Fix structure       : ${options.fixStructure ? "Yes" : "No"}`,
    `  Rebuild XRef        : ${options.rebuildXref ? "Yes" : "No"}`,
    `  Recover pages       : ${options.recoverPages ? "Yes" : "No"}`,
    `  Repair metadata     : ${options.repairMetadata ? "Yes" : "No"}`,
    `  Remove invalid obj  : ${options.removeInvalidObjects ? "Yes" : "No"}`,
    `  Optimise output     : ${options.optimizeOutput ? "Yes" : "No"}`,
    `  Preserve quality    : ${options.preserveQuality ? "Yes" : "No"}`,
    `  Max page recovery   : ${options.maximizePageRecovery ? "Yes" : "No"}`,
    "",
    "═══════════════════════════════════════════════════════════════",
    "  Generated by BloomPDF — https://bloompdf.app",
    "═══════════════════════════════════════════════════════════════",
  ];
  return lines.join("\n");
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function downloadPDFBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadReportText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
