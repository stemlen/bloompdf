/**
 * markdownPdfConverter.ts
 * 100% client-side Markdown to PDF conversion. The markdown is laid out by the
 * browser in a hidden container, then drawn into the PDF as real, selectable
 * text (see markdownPdfVector.ts); Mermaid diagrams and images are embedded as
 * images. Runs entirely in the browser with zero server dependencies.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  renderMarkdownToHtml,
  getThemeStyles,
  type MarkdownTheme,
  type PageFormat,
  type PageOrientation,
  type PageMargin,
} from "./markdownStyles";
import { renderMermaidInElement } from "./mermaidRenderer";
import { renderMarkdownDomToPdf, hexToRgb } from "./markdownPdfVector";

// ─── Types & Options ────────────────────────────────────────────────────────

export interface MarkdownPdfOptions {
  theme?: MarkdownTheme;
  pageSize?: PageFormat;
  orientation?: PageOrientation;
  margins?: PageMargin;
  fontSize?: "small" | "medium" | "large";
  showPageNumbers?: boolean;
  headerTitle?: string;
  onProgress?: (progress: number, stage: string) => void;
}

// ─── Dimensions (Points: 1 pt = 1/72 inch) ──────────────────────────────────

const PAGE_SIZES_PT: Record<PageFormat, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612.0, 792.0],
  Legal: [612.0, 1008.0],
};

const MARGIN_PT: Record<PageMargin, number> = {
  none: 0,
  small: 28.35,   // ~10 mm
  medium: 56.7,   // ~20 mm
  large: 85.05,   // ~30 mm
};

// ─── Helper: Convert Blob/DataURL to Uint8Array ──────────────────────────────

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(",");
  const base64 = dataUrl.slice(commaIdx + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Helper: Wait for images to load inside DOM element ──────────────────────

async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));
  if (images.length === 0) return;

  const promises = images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve(); // continue even if an image fails
    });
  });

  await Promise.all(promises);
}

// ─── Main Conversion Function ───────────────────────────────────────────────

interface PdfGeometry {
  pageW: number;
  pageH: number;
  marginPt: number;
  usableWidthPt: number;
  usableHeightPt: number;
  /** PDF y of the bottom edge of the content box. */
  contentBottom: number;
  theme: MarkdownTheme;
  bgColor: string;
  showPageNumbers: boolean;
  headerTitle: string;
}

function drawPageDecorations(page: PDFPage, index: number, total: number, g: PdfGeometry, font: PDFFont): void {
  const color = g.theme === "obsidian" ? rgb(0.6, 0.65, 0.7) : rgb(0.5, 0.5, 0.5);
  if (g.headerTitle) {
    const title = g.headerTitle.replace(/[^\x20-\x7e\u00a0-\u00ff]/g, "?");
    page.drawText(title, { x: g.marginPt, y: g.pageH - g.marginPt / 2 - 10, size: 9, color, font });
  }
  if (g.showPageNumbers) {
    const pageText = `Page ${index + 1} of ${total}`;
    const x = g.pageW - Math.max(g.marginPt, 20) - font.widthOfTextAtSize(pageText, 9);
    page.drawText(pageText, { x, y: g.marginPt / 2 + 5, size: 9, color, font });
  }
}

export async function convertMarkdownToPdfBlob(
  markdown: string,
  options: MarkdownPdfOptions = {}
): Promise<Blob> {
  const {
    theme = "github",
    pageSize = "A4",
    orientation = "portrait",
    margins = "medium",
    fontSize = "medium",
    showPageNumbers = true,
    headerTitle = "",
    onProgress,
  } = options;

  onProgress?.(10, "Parsing markdown & diagrams...");

  const htmlContent = renderMarkdownToHtml(markdown);
  const themeCss = getThemeStyles(theme, fontSize);

  // Compute Page Dimensions
  let [pageW, pageH] = PAGE_SIZES_PT[pageSize] || PAGE_SIZES_PT.A4;
  if (orientation === "landscape") {
    const tmp = pageW;
    pageW = pageH;
    pageH = tmp;
  }

  const marginPt = MARGIN_PT[margins] ?? MARGIN_PT.medium;
  const headerFooterPt = (headerTitle ? 25 : 0) + (showPageNumbers ? 25 : 0);

  // Usable area in points
  const usableWidthPt = Math.max(200, pageW - marginPt * 2);
  const usableHeightPt = Math.max(200, pageH - marginPt * 2 - headerFooterPt);

  const bgColor = theme === "obsidian" ? "#0a0b0e" : theme === "crimson" ? "#fcfbf9" : "#ffffff";
  const geometry: PdfGeometry = {
    pageW,
    pageH,
    marginPt,
    usableWidthPt,
    usableHeightPt,
    contentBottom: marginPt + (showPageNumbers ? 20 : 0),
    theme,
    bgColor,
    showPageNumbers,
    headerTitle,
  };

  onProgress?.(25, "Rendering visual diagrams...");

  const cssWidthPx = usableWidthPt * (96 / 72); // convert pt to standard CSS px
  const cssHeightPx = usableHeightPt * (96 / 72);
  const maxMediaHeightPx = Math.floor(cssHeightPx * 0.9);

  // 1. Create a hidden render container in the DOM to measure and render cleanly
  const container = document.createElement("div");
  container.className = "markdown-container";
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = `${cssWidthPx}px`;
  container.style.boxSizing = "border-box";
  container.style.padding = "0";
  container.style.margin = "0";
  container.style.overflow = "visible";
  container.style.background = bgColor;
  container.style.zIndex = "-1000";

  // Inject styles & markdown. The PDF-only rules wrap long code lines and
  // cap image/diagram height so nothing is clipped or cut across pages.
  container.innerHTML = `
    <style>
      ${themeCss}
      .markdown-body {
        width: ${cssWidthPx}px !important;
        box-sizing: border-box !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .markdown-body pre.code-block,
      .markdown-body pre.code-block > code {
        white-space: pre-wrap !important;
        overflow-wrap: anywhere !important;
      }
      .markdown-body th, .markdown-body td { overflow-wrap: anywhere; }
      .markdown-body img { max-height: ${maxMediaHeightPx}px; width: auto; }
      .markdown-body .mermaid-svg-wrapper svg { max-height: ${maxMediaHeightPx}px; }
    </style>
    <div class="markdown-body">
      ${htmlContent}
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Render Mermaid diagrams into SVGs
    await renderMermaidInElement(container, theme);
    await waitForImages(container);
    if (document.fonts?.ready) await document.fonts.ready;
    // Give browser brief tick to paint SVG dimensions
    await new Promise((r) => setTimeout(r, 100));

    const markdownBody = container.querySelector(".markdown-body") as HTMLElement;

    onProgress?.(50, "Laying out text...");

    let pdfDoc: PDFDocument;
    try {
      // 2. Real, selectable text drawn from the laid-out DOM.
      pdfDoc = await PDFDocument.create();
      const decorFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const result = await renderMarkdownDomToPdf({
        pdfDoc,
        root: markdownBody,
        pageSize: [pageW, pageH],
        contentLeft: marginPt,
        contentTop: geometry.contentBottom + usableHeightPt,
        contentWidth: usableWidthPt,
        contentHeight: usableHeightPt,
        pageBackground: hexToRgb(bgColor),
        decorate: (page, i, total) => drawPageDecorations(page, i, total, geometry, decorFont),
      });
      if (result.warnings.length) console.warn("Markdown PDF:", result.warnings.join("; "));
    } catch (vectorErr) {
      // 3. Fallback: page images (text not selectable).
      console.warn("Text PDF export failed, falling back to image pages:", vectorErr);
      pdfDoc = await rasterizeToPdf(markdownBody, htmlContent, themeCss, cssWidthPx, cssHeightPx, geometry, onProgress);
    }

    onProgress?.(95, "Finalizing PDF...");

    const pdfBytes = await pdfDoc.save();
    onProgress?.(100, "Done!");

    const pdfArrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    ) as ArrayBuffer;
    return new Blob([pdfArrayBuffer], { type: "application/pdf" });
  } finally {
    // Clean up temporary DOM element
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/** Image-based export (previous behaviour), kept as a fallback. */
async function rasterizeToPdf(
  markdownBody: HTMLElement,
  htmlContent: string,
  themeCss: string,
  cssWidthPx: number,
  cssHeightPx: number,
  g: PdfGeometry,
  onProgress?: (progress: number, stage: string) => void
): Promise<PDFDocument> {
  const scale = 2;
  const bgColor = g.bgColor;
  const totalContentHeightPx = Math.max(markdownBody ? markdownBody.scrollHeight : 100, markdownBody ? markdownBody.offsetHeight : 100, 100);

  onProgress?.(60, "Rasterizing document pages...");

  let serializedBodyHtml = "";
  try {
    serializedBodyHtml = typeof XMLSerializer !== "undefined" && markdownBody
      ? new XMLSerializer().serializeToString(markdownBody)
      : markdownBody ? markdownBody.innerHTML : htmlContent;
  } catch {
    serializedBodyHtml = markdownBody ? markdownBody.innerHTML : htmlContent;
  }

  // Sanitize any named HTML entities that break strict SVG XML parsers
  serializedBodyHtml = serializedBodyHtml
    .replace(/&nbsp;/g, "&#160;")
    .replace(/&mdash;/g, "&#8212;")
    .replace(/&ndash;/g, "&#8211;")
    .replace(/&bull;/g, "&#8226;")
    .replace(/&copy;/g, "&#169;")
    .replace(/&reg;/g, "&#174;")
    .replace(/&trade;/g, "&#8482;")
    .replace(/&hellip;/g, "&#8230;")
    .replace(/&ldquo;/g, "&#8220;")
    .replace(/&rdquo;/g, "&#8221;")
    .replace(/&lsquo;/g, "&#8216;")
    .replace(/&rsquo;/g, "&#8217;");

  // The theme CSS contains characters such as "&" that are illegal in XML
  // text, so it is wrapped in CDATA. The wrapper carries the
  // "markdown-container" class because the theme variables live there.
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${cssWidthPx}" height="${totalContentHeightPx}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" class="markdown-container" style="background: ${bgColor}; width: ${cssWidthPx}px; min-height: ${totalContentHeightPx}px;">
          <style><![CDATA[
            ${themeCss.replace(/\]\]>/g, "] ]>")}
            *, *::before, *::after { box-sizing: border-box; }
            body { margin: 0; padding: 0; background: ${bgColor}; }
            .markdown-body { width: ${cssWidthPx}px !important; padding: 0 !important; margin: 0 !important; }
          ]]></style>
          ${serializedBodyHtml.startsWith("<div") ? serializedBodyHtml : `<div class="markdown-body">${serializedBodyHtml}</div>`}
        </div>
      </foreignObject>
    </svg>
  `;

  // A data: URL (not blob:) so the canvas is not tainted in Chromium.
  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
  const fullImg = new Image();
  await new Promise<void>((resolve, reject) => {
    fullImg.onload = () => resolve();
    fullImg.onerror = () => reject(new Error("Failed to render SVG image for PDF."));
    fullImg.src = svgUrl;
  });

  // Pages are sliced straight from the SVG image instead of one full-height
  // canvas, which exceeded browser canvas limits on long documents.
  const pageSliceHeightPx = cssHeightPx * scale;
  const pageCanvasWidth = Math.round(cssWidthPx * scale);
  const totalCanvasHeight = totalContentHeightPx * scale;
  const estimatedPages = Math.max(1, Math.ceil(totalCanvasHeight / pageSliceHeightPx));

  const pdfDoc = await PDFDocument.create();
  const decorFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let currentY = 0;
  let pageIndex = 0;
  while (currentY < totalCanvasHeight) {
    const currentSliceH = Math.min(pageSliceHeightPx, totalCanvasHeight - currentY);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = pageCanvasWidth;
    pageCanvas.height = pageSliceHeightPx;
    const pageCtx = pageCanvas.getContext("2d");
    if (!pageCtx) break;
    pageCtx.fillStyle = bgColor;
    pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageCtx.drawImage(fullImg, 0, currentY / scale, cssWidthPx, currentSliceH / scale, 0, 0, pageCanvasWidth, currentSliceH);

    const embeddedJpg = await pdfDoc.embedJpg(dataUrlToUint8Array(pageCanvas.toDataURL("image/jpeg", 0.95)));
    const pdfPage = pdfDoc.addPage([g.pageW, g.pageH]);
    pdfPage.drawImage(embeddedJpg, { x: g.marginPt, y: g.contentBottom, width: g.usableWidthPt, height: g.usableHeightPt });
    drawPageDecorations(pdfPage, pageIndex, estimatedPages, g, decorFont);

    pageIndex++;
    currentY += pageSliceHeightPx;
  }
  return pdfDoc;
}

// ─── Browser Native Print / Save Vector PDF ─────────────────────────────────

export async function printMarkdownDocument(
  markdown: string,
  options: MarkdownPdfOptions = {}
): Promise<void> {
  const {
    theme = "github",
    pageSize = "A4",
    orientation = "portrait",
    margins = "medium",
    fontSize = "medium",
    headerTitle = "Markdown Document",
  } = options;

  const htmlContent = renderMarkdownToHtml(markdown);
  const themeCss = getThemeStyles(theme, fontSize);
  const marginInch = margins === "none" ? "0.3in" : margins === "small" ? "0.5in" : margins === "large" ? "1.5in" : "1.0in";

  // Pre-render Mermaid diagrams in a temporary offscreen element
  const tempDiv = document.createElement("div");
  tempDiv.className = "markdown-container";
  tempDiv.style.position = "fixed";
  tempDiv.style.left = "-9999px";
  tempDiv.style.top = "0";
  tempDiv.innerHTML = `<div class="markdown-body">${htmlContent}</div>`;
  document.body.appendChild(tempDiv);
  
  try {
    await renderMermaidInElement(tempDiv, theme);
    await waitForImages(tempDiv);
  } catch (e) {
    console.warn("Diagram pre-render warning:", e);
  }

  const finalBodyHtml = (tempDiv.querySelector(".markdown-body") as HTMLElement)?.innerHTML || htmlContent;
  if (tempDiv.parentNode) {
    tempDiv.parentNode.removeChild(tempDiv);
  }

  const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(headerTitle)}</title>
  <style>
    @page {
      size: ${pageSize} ${orientation};
      margin: ${marginInch};
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #111111 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    ${themeCss}
    .markdown-body {
      background: transparent !important;
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .mermaid-svg-wrapper svg {
      max-width: 100% !important;
      height: auto !important;
    }
    .code-block-wrapper,
    .mermaid-diagram-container,
    table,
    blockquote,
    img {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
  </style>
</head>
<body class="markdown-container">
  <div class="markdown-body">
    ${finalBodyHtml}
  </div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.zIndex = "-1000";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(printHtml);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Print error:", err);
    }
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  }, 400);
}

// ─── Helper: Trigger File Download ──────────────────────────────────────────

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
