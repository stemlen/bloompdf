/**
 * textToPdf.ts
 * Client-side plain text → PDF conversion with real, selectable text
 * (standard PDF fonts, no rasterisation). Runs entirely in the browser.
 * Characters outside the standard fonts' WinAnsi set (Hindi, Arabic, ✓, ...)
 * use on-demand Noto fallback fonts, see unicodeText.ts.
 */

import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";
import { createUnicodeTextRenderer } from "./unicodeText";

export type TextFontFamily = "sans-serif" | "serif" | "monospace" | "Inter";
export type TextFontSize = "10pt" | "12pt" | "14pt" | "16pt";
export type TextLineSpacing = "1" | "1.5" | "2";
export type TextAlignment = "left" | "center" | "right" | "justify";
export type TextOrientation = "portrait" | "landscape";
export type TextMargin = "small" | "medium" | "large";

export interface TextToPdfOptions {
  fontFamily?: TextFontFamily;
  fontSize?: TextFontSize;
  lineSpacing?: TextLineSpacing;
  alignment?: TextAlignment;
  orientation?: TextOrientation;
  margin?: TextMargin;
  title?: string;
}

export interface TextToPdfResult {
  bytes: Uint8Array;
  pageCount: number;
  /** Characters neither the standard font nor the bundled fallback fonts cover (replaced with "?") */
  unsupportedChars: string[];
  /** True if fallback (Noto) fonts were embedded for non-Latin text or symbols */
  usedFallbackFonts: boolean;
}

const A4: [number, number] = [595.28, 841.89];
const MARGINS_PT: Record<TextMargin, number> = { small: 36, medium: 72, large: 108 };
const FONTS: Record<TextFontFamily, StandardFonts> = {
  "sans-serif": StandardFonts.Helvetica,
  Inter: StandardFonts.Helvetica,
  serif: StandardFonts.TimesRoman,
  monospace: StandardFonts.Courier,
};

/** Normalises whitespace / control characters. Font coverage is handled by the renderer. */
function sanitize(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\t/g, "    ")
    .replace(/\u00a0/g, " ")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "");
}

/** Splits into user-perceived characters so hard breaks never cut a cluster. */
function graphemes(s: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].map((g) => g.segment);
  }
  return Array.from(s);
}

interface Line {
  text: string;
  /** Last line of a paragraph (never justified) */
  last: boolean;
}

function wrapParagraph(par: string, width: (s: string) => number, maxWidth: number): Line[] {
  if (par === "") return [{ text: "", last: true }];
  const tokens = par.match(/\S+|\s+/g) ?? [];
  const lines: Line[] = [];
  let current = "";

  const pushLine = (s: string) => lines.push({ text: s.replace(/\s+$/, ""), last: false });

  for (const token of tokens) {
    const candidate = current + token;
    if (width(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (/^\s+$/.test(token)) {
      // Whitespace overflowing the line: break here and drop it.
      pushLine(current);
      current = "";
      continue;
    }
    if (current.trim() !== "") {
      pushLine(current);
      current = "";
    }
    // Hard-break words longer than a full line.
    let chars = graphemes(token);
    while (chars.length > 1 && width(chars.join("")) > maxWidth) {
      let cut = chars.length - 1;
      while (cut > 1 && width(chars.slice(0, cut).join("")) > maxWidth) cut--;
      pushLine(chars.slice(0, cut).join(""));
      chars = chars.slice(cut);
    }
    current = chars.join("");
  }
  lines.push({ text: current.replace(/\s+$/, ""), last: true });
  return lines;
}

export async function textToPdf(text: string, options: TextToPdfOptions = {}): Promise<TextToPdfResult> {
  const {
    fontFamily = "sans-serif",
    fontSize = "12pt",
    lineSpacing = "1.5",
    alignment = "left",
    orientation = "portrait",
    margin = "medium",
    title,
  } = options;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(FONTS[fontFamily] ?? StandardFonts.Helvetica);
  if (title) doc.setTitle(title);
  doc.setCreator("BloomPDF");
  doc.setProducer("BloomPDF (client-side)");

  const size = parseInt(fontSize, 10) || 12;
  const spacing = parseFloat(lineSpacing) || 1.5;
  const lineHeight = size * (spacing <= 1 ? 1.2 : spacing);
  const [pw, ph] = orientation === "landscape" ? [A4[1], A4[0]] : A4;
  const m = MARGINS_PT[margin] ?? 72;
  const maxWidth = pw - m * 2;

  const input = sanitize(text.replace(/\r\n?/g, "\n"));
  // Loads fallback fonts (and the shaper) only if the text needs them.
  const renderer = await createUnicodeTextRenderer(doc, font, input);
  const clean = renderer.prepare(input);
  const width = (s: string) => renderer.widthOf(s, size);

  const lines: (Line & { rtl: boolean })[] = [];
  for (const par of clean.split("\n")) {
    const rtl = renderer.isRtl(par);
    for (const l of wrapParagraph(par, width, maxWidth)) lines.push({ ...l, rtl });
  }
  // Drop trailing empty lines so we don't emit blank trailing pages.
  while (lines.length > 1 && lines[lines.length - 1].text === "") lines.pop();

  const ascent = font.heightAtSize(size, { descender: false });
  let page = doc.addPage([pw, ph]);
  let y = ph - m - ascent;
  const color = rgb(0, 0, 0);
  const draw = (s: string, x: number, rtl: boolean) => {
    if (renderer.hasFallback) renderer.drawLine(page, s, x, y, size, rtl, { color });
    else page.drawText(s, { x, y, size, font, color });
  };

  for (const line of lines) {
    if (y < m) {
      page = doc.addPage([pw, ph]);
      y = ph - m - ascent;
    }
    if (line.text) {
      const w = width(line.text);
      // Right-to-left paragraphs start at the right margin ("left" = start).
      const align = line.rtl && (alignment === "left" || alignment === "justify") ? "right" : alignment;
      if (align === "justify" && !line.last && / /.test(line.text.trim())) {
        const words = line.text.trim().split(/ +/);
        const wordsWidth = words.reduce((acc, wd) => acc + width(wd), 0);
        const gap = (maxWidth - wordsWidth) / (words.length - 1);
        let x = m;
        for (const wd of words) {
          draw(wd, x, false);
          x += width(wd) + gap;
        }
      } else {
        const x =
          align === "center" ? m + (maxWidth - w) / 2 :
          align === "right" ? m + maxWidth - w :
          m;
        draw(line.text, x, line.rtl);
      }
    }
    y -= lineHeight;
  }

  await renderer.finalize();
  const bytes = await doc.save();
  return {
    bytes,
    pageCount: doc.getPageCount(),
    unsupportedChars: [...renderer.unsupported],
    usedFallbackFonts: renderer.hasFallback,
  };
}
