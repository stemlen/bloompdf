/**
 * mergePdf.ts
 * Client-side PDF merging utility using pdf-lib.
 * All processing happens in the browser — no server required.
 */

import { PDFDocument } from "pdf-lib";

/** Max file size allowed per PDF (50 MB) */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Max number of files allowed */
export const MAX_FILE_COUNT = 20;

/**
 * Reads a File as an ArrayBuffer.
 */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Returns the page count of a PDF file.
 * Throws if the file cannot be parsed (corrupt, password-protected, etc.)
 */
export async function getPDFPageCount(file: File): Promise<number> {
  const buffer = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
  return doc.getPageCount();
}

/**
 * Merges an ordered array of PDF Files into a single PDF.
 * Reports progress via the `onProgress` callback (0–100).
 * Returns the merged PDF as a Uint8Array.
 */
export async function mergePDFs(
  files: File[],
  onProgress?: (pct: number) => void
): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error("No files provided.");
  }

  const merged = await PDFDocument.create();
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const buffer = await readFileAsArrayBuffer(files[i]);
    let srcDoc: PDFDocument;

    try {
      srcDoc = await PDFDocument.load(buffer);
    } catch {
      throw new Error(
        `Could not parse "${files[i].name}". The file may be corrupt or password-protected.`
      );
    }

    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await merged.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => merged.addPage(page));

    // Report progress: loading each file = (i+1)/total * 90%, saving = last 10%
    onProgress?.(Math.round(((i + 1) / total) * 90));
  }

  const bytes = await merged.save();
  onProgress?.(100);
  return bytes;
}

/**
 * Triggers a browser download of the given bytes as a PDF file.
 */
export function downloadBlob(bytes: Uint8Array, filename: string): void {
  // Slice to a concrete ArrayBuffer — required by TypeScript's strict Blob types
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([buffer as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Revoke after a brief delay so the browser can initiate the download
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
