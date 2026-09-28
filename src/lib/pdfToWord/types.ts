/**
 * Shared types for the in-browser PDF → Word converter.
 *
 * Coordinates are PDF points in "viewport" space: origin at the top-left of
 * the (rotated) page, y growing downwards.
 */

/** One positioned piece of text, from pdf.js or from OCR. */
export interface TextPiece {
  str: string;
  /** Left edge. */
  x: number;
  /** Baseline. */
  y: number;
  /** Advance width. */
  w: number;
  /** Font size (em height). */
  fs: number;
  bold: boolean;
  italic: boolean;
  /** Serif hint for picking a Word font. */
  serif?: boolean;
}

/** An image drawn on the page, cropped from a page render. */
export interface PageImage {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** JPEG bytes (absent in environments without a canvas, e.g. tests). */
  data?: Uint8Array;
  /** Pixel size of `data`. */
  pxWidth?: number;
  pxHeight?: number;
}

export interface PageContent {
  pageNumber: number;
  width: number;
  height: number;
  pieces: TextPiece[];
  /** Text that is not horizontal (e.g. margin stamps), kept in reading order at the end of the page. */
  rotatedText: string[];
  images: PageImage[];
  /** True when the text came from OCR. */
  ocr?: boolean;
}

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  script?: "sup" | "sub";
  /** Font size in points. */
  size: number;
}

export interface ParagraphBlock {
  kind: "paragraph";
  runs: Run[];
  /** Heading level (1 = biggest). */
  heading?: number;
  list?: "bullet" | "number";
  align?: "center";
  /** Left indent in points relative to the text column. */
  indent?: number;
  /** Dominant font size in points. */
  size: number;
}

export interface TableBlock {
  kind: "table";
  /** rows → cells → runs */
  rows: Run[][][];
  /** Relative column widths (points). */
  colWidths: number[];
}

export interface ImageBlock {
  kind: "image";
  data: Uint8Array;
  /** Displayed size in points. */
  width: number;
  height: number;
}

export type Block = ParagraphBlock | TableBlock | ImageBlock;

export interface PageBlocks {
  pageNumber: number;
  width: number;
  height: number;
  blocks: Block[];
  /** Left/right text margins seen on the page (points), used for Word page margins. */
  textLeft: number;
  textRight: number;
  ocr?: boolean;
  columns: number;
}
