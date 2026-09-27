/**
 * textToPdf.ts
 * Client-side plain text → PDF conversion with real, selectable text
 * (standard PDF fonts, no rasterisation). Runs entirely in the browser.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "@cantoo/pdf-lib";

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
  /** Characters the standard PDF fonts cannot encode (replaced with "?") */
  unsupportedChars: string[];
}

const A4: [number, number] = [595.28, 841.89];
const MARGINS_PT: Record<TextMargin, number> = { small: 36, medium: 72, large: 108 };
const FONTS: Record<TextFontFamily, StandardFonts> = {
  "sans-serif": StandardFonts.Helvetica,
  Inter: StandardFonts.Helvetica,
  serif: StandardFonts.TimesRoman,
  monospace: StandardFonts.Courier,
};

/** Replaces characters the (WinAnsi) standard font cannot encode. */
function sanitize(text: string, font: PDFFont, unsupported: Set<string>): string {
  const cache = new Map<string, string>();
  // @cantoo/pdf-lib silently encodes unsupported glyphs as "?", so check the
  // font's character set explicitly to be able to tell the user.
  const supported = new Set(font.getCharacterSet());
  let out = "";
  for (const ch of text) {
    let mapped = cache.get(ch);
    if (mapped === undefined) {
      if (ch === "\n") mapped = "\n";
      else if (ch === "\t") mapped = "    ";
      else if (/[\u0000-\u001f\u007f]/.test(ch)) mapped = "";
      else if (ch === "\u00a0") mapped = " ";
      else {
        const cp = ch.codePointAt(0) ?? 0;
        if (supported.has(cp)) {
          mapped = ch;
        } else if (/\p{M}/u.test(ch)) {
          // Combining marks of an unsupported script: fold into the "?" of the base char.
          unsupported.add(ch);
          mapped = "";
        } else {
          unsupported.add(ch);
          mapped = "?";
        }
      }
      cache.set(ch, mapped);
    }
    out += mapped;
  }
  return out;
}

interface Line {
  text: string;
  /** Last line of a paragraph (never justified) */
  last: boolean;
}

function wrapParagraph(par: string, font: PDFFont, size: number, maxWidth: number): Line[] {
  if (par === "") return [{ text: "", last: true }];
  const tokens = par.match(/\S+|\s+/g) ?? [];
  const lines: Line[] = [];
  let current = "";
  const width = (s: string) => font.widthOfTextAtSize(s, size);

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
    let word = token;
    while (width(word) > maxWidth) {
      let cut = word.length - 1;
      while (cut > 1 && width(word.slice(0, cut)) > maxWidth) cut--;
      pushLine(word.slice(0, cut));
      word = word.slice(cut);
    }
    current = word;
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

  const unsupported = new Set<string>();
  const clean = sanitize(text.replace(/\r\n?/g, "\n"), font, unsupported);

  const lines: Line[] = [];
  for (const par of clean.split("\n")) lines.push(...wrapParagraph(par, font, size, maxWidth));
  // Drop trailing empty lines so we don't emit blank trailing pages.
  while (lines.length > 1 && lines[lines.length - 1].text === "") lines.pop();

  const ascent = font.heightAtSize(size, { descender: false });
  let page = doc.addPage([pw, ph]);
  let y = ph - m - ascent;
  const color = rgb(0, 0, 0);

  for (const line of lines) {
    if (y < m) {
      page = doc.addPage([pw, ph]);
      y = ph - m - ascent;
    }
    if (line.text) {
      const w = font.widthOfTextAtSize(line.text, size);
      if (alignment === "justify" && !line.last && / /.test(line.text.trim())) {
        const words = line.text.trim().split(/ +/);
        const wordsWidth = words.reduce((acc, wd) => acc + font.widthOfTextAtSize(wd, size), 0);
        const gap = (maxWidth - wordsWidth) / (words.length - 1);
        let x = m;
        for (const wd of words) {
          page.drawText(wd, { x, y, size, font, color });
          x += font.widthOfTextAtSize(wd, size) + gap;
        }
      } else {
        const x =
          alignment === "center" ? m + (maxWidth - w) / 2 :
          alignment === "right" ? m + maxWidth - w :
          m;
        page.drawText(line.text, { x, y, size, font, color });
      }
    }
    y -= lineHeight;
  }

  const bytes = await doc.save();
  return { bytes, pageCount: doc.getPageCount(), unsupportedChars: [...unsupported] };
}
