/**
 * pdfPageCopy.ts
 * Build a new PDF that contains only the requested pages of a source document.
 *
 * Why: pdf-lib's `removePage()` only unlinks a page from the page tree; the
 * page's content streams, images and fonts stay in the file because pdf-lib
 * does not garbage-collect unreferenced objects. Split / Extract / Remove used
 * to load the whole file, remove pages and save, so every output was as large
 * as the source. Copying the wanted pages into a fresh document only carries
 * over the objects those pages actually reference.
 */
import { PDFDocument } from "@cantoo/pdf-lib";

/** Copy document-level info (title, author, ...) so outputs keep their metadata. */
function copyInfo(src: PDFDocument, out: PDFDocument): void {
  try {
    const title = src.getTitle();
    const author = src.getAuthor();
    const subject = src.getSubject();
    const keywords = src.getKeywords();
    const creator = src.getCreator();
    if (title) out.setTitle(title);
    if (author) out.setAuthor(author);
    if (subject) out.setSubject(subject);
    if (keywords) out.setKeywords([keywords]);
    if (creator) out.setCreator(creator);
  } catch {
    // Metadata is best-effort; a broken Info dict must not fail the operation.
  }
}

/**
 * Returns the bytes of a new PDF containing `pageIndices` (0-based, in the
 * given order) copied from `src`.
 */
export async function buildPdfWithPages(src: PDFDocument, pageIndices: number[]): Promise<Uint8Array> {
  if (pageIndices.length === 0) throw new Error("No pages selected.");
  const out = await PDFDocument.create();
  copyInfo(src, out);
  const copied = await out.copyPages(src, pageIndices);
  for (const page of copied) out.addPage(page);
  return out.save({ useObjectStreams: false });
}
