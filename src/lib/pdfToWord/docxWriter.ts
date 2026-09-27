/**
 * Turns laid-out blocks into a .docx document with the `docx` library.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  type FileChild,
  type ParagraphChild,
} from "docx";
import type { Block, PageBlocks, ParagraphBlock, Run } from "./types";

const TWIPS_PER_PT = 20;
const PX_PER_PT = 96 / 72;

const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
] as const;

/** Characters that are not allowed in XML 1.0 (would corrupt the .docx). */
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function cleanText(s: string): string {
  return s.replace(INVALID_XML, "");
}

const halfPoints = (pt: number) => Math.max(2, Math.round(pt * 2));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface DocxOptions {
  bodySize: number;
  serif: boolean;
  title?: string;
}

function textRuns(runs: Run[], bodySize: number, inHeading: boolean): TextRun[] {
  return runs
    .map((r) => ({ ...r, text: cleanText(r.text) }))
    .filter((r) => r.text.length > 0)
    .map(
      (r) =>
        new TextRun({
          text: r.text,
          // Headings take bold and size from their style.
          bold: inHeading ? undefined : r.bold,
          italics: r.italic,
          superScript: r.script === "sup" || undefined,
          subScript: r.script === "sub" || undefined,
          size: !inHeading && Math.abs(r.size - bodySize) >= 1 ? halfPoints(r.size) : undefined,
        })
    );
}

function paragraph(b: ParagraphBlock, opts: DocxOptions, pageBreakBefore: boolean): Paragraph {
  const heading = b.heading ? HEADINGS[Math.min(b.heading, HEADINGS.length) - 1] : undefined;
  const children: ParagraphChild[] = textRuns(b.runs, opts.bodySize, !!heading);
  return new Paragraph({
    children,
    heading,
    alignment: b.align === "center" ? AlignmentType.CENTER : undefined,
    bullet: b.list === "bullet" ? { level: 0 } : undefined,
    indent: b.list === "number" ? { left: 360, hanging: 360 } : b.indent ? { left: Math.round(b.indent * TWIPS_PER_PT) } : undefined,
    spacing: heading ? undefined : { after: 120 },
    pageBreakBefore: pageBreakBefore || undefined,
  });
}

const thin = { style: BorderStyle.SINGLE, size: 4, color: "999999" };

function table(b: Extract<Block, { kind: "table" }>, opts: DocxOptions, contentWidthPt: number): Table {
  const total = b.colWidths.reduce((a, c) => a + Math.max(c, 1), 0) || 1;
  const widthPt = Math.min(contentWidthPt, Math.max(total, contentWidthPt * 0.5));
  const cols = b.colWidths.map((c) => Math.max(360, Math.round((Math.max(c, 1) / total) * widthPt * TWIPS_PER_PT)));
  return new Table({
    width: { size: cols.reduce((a, c) => a + c, 0), type: WidthType.DXA },
    columnWidths: cols,
    layout: TableLayoutType.FIXED,
    borders: { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin },
    rows: b.rows.map(
      (cells, ri) =>
        new TableRow({
          tableHeader: ri === 0 || undefined,
          children: cells.map(
            (runs, ci) =>
              new TableCell({
                width: { size: cols[ci], type: WidthType.DXA },
                children: [new Paragraph({ children: textRuns(runs, opts.bodySize, false) })],
              })
          ),
        })
    ),
  });
}

function image(b: Extract<Block, { kind: "image" }>, contentWidthPt: number, pageBreakBefore: boolean): Paragraph {
  const scale = Math.min(1, contentWidthPt / b.width);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    pageBreakBefore: pageBreakBefore || undefined,
    children: [
      new ImageRun({
        type: "jpg",
        data: b.data,
        transformation: {
          width: Math.max(1, Math.round(b.width * scale * PX_PER_PT)),
          height: Math.max(1, Math.round(b.height * scale * PX_PER_PT)),
        },
      }),
    ],
  });
}

/** Median font size used by each heading level, so Word headings look like the PDF's. */
function headingSizes(pages: PageBlocks[], bodySize: number): number[] {
  const byLevel: number[][] = [[], [], [], []];
  for (const p of pages) for (const b of p.blocks) if (b.kind === "paragraph" && b.heading) byLevel[Math.min(b.heading, 4) - 1].push(b.size);
  return byLevel.map((s, i) => {
    if (!s.length) return bodySize * [1.6, 1.35, 1.15, 1.05][i];
    const sorted = [...s].sort((a, b) => a - b);
    return sorted[sorted.length >> 1];
  });
}

export function buildDocx(pages: PageBlocks[], opts: DocxOptions): Document {
  const first = pages[0];
  const pageW = first?.width ?? 612;
  const pageH = first?.height ?? 792;
  const lefts = pages.map((p) => p.textLeft).sort((a, b) => a - b);
  const rights = pages.map((p) => pageW - p.textRight).sort((a, b) => a - b);
  const marginL = clamp(lefts[lefts.length >> 1] ?? 72, 36, 108);
  const marginR = clamp(rights[rights.length >> 1] ?? 72, 36, 108);
  const contentWidth = pageW - marginL - marginR;

  const children: FileChild[] = [];
  pages.forEach((p, pi) => {
    let needBreak = pi > 0;
    p.blocks.forEach((b, bi) => {
      if (b.kind === "paragraph") {
        children.push(paragraph(b, opts, needBreak));
        needBreak = false;
      } else if (b.kind === "image") {
        children.push(image(b, contentWidth, needBreak));
        needBreak = false;
      } else {
        if (needBreak) {
          children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
          needBreak = false;
        }
        children.push(table(b, opts, contentWidth));
        // Word needs a paragraph between adjacent tables and at the end of the body.
        const next = p.blocks[bi + 1];
        if (!next || next.kind === "table") children.push(new Paragraph({ children: [] }));
      }
    });
    if (needBreak) children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
  });
  if (!children.length) children.push(new Paragraph({ children: [] }));

  const hs = headingSizes(pages, opts.bodySize);
  const font = opts.serif ? "Times New Roman" : "Arial";
  const headingStyle = (i: number) => ({
    run: { size: halfPoints(hs[i]), bold: true, font, color: "000000" },
    paragraph: { spacing: { before: 240, after: 120 } },
  });

  return new Document({
    creator: "BloomPDF",
    title: opts.title,
    description: "Converted from PDF in the browser by BloomPDF",
    styles: {
      default: {
        document: { run: { font, size: halfPoints(opts.bodySize) } },
        heading1: headingStyle(0),
        heading2: headingStyle(1),
        heading3: headingStyle(2),
        heading4: headingStyle(3),
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: Math.round(pageW * TWIPS_PER_PT), height: Math.round(pageH * TWIPS_PER_PT) },
            margin: {
              top: 1080,
              bottom: 1080,
              left: Math.round(marginL * TWIPS_PER_PT),
              right: Math.round(marginR * TWIPS_PER_PT),
            },
          },
        },
        children,
      },
    ],
  });
}
