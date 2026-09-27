/**
 * zipDownload.ts
 * Bundle several generated files into one ZIP and download it.
 *
 * Firing N downloads in a row makes browsers show an "allow multiple
 * downloads?" prompt (or silently drop all but the first), so multi-file
 * results are delivered as a single archive instead.
 */
import { zipSync, type Zippable } from "fflate";

export interface ZipEntry {
  name: string;
  bytes: Uint8Array;
}

/** Build the ZIP bytes. Duplicate names get a " (2)", " (3)" ... suffix. */
export function buildZip(files: ZipEntry[]): Uint8Array {
  const entries: Zippable = {};
  for (const f of files) {
    let name = f.name;
    let n = 2;
    while (name in entries) {
      name = f.name.replace(/(\.[^.]*)?$/, (ext) => ` (${n})${ext}`);
      n++;
    }
    // PDFs are mostly compressed already; storing (level 0) keeps this fast.
    entries[name] = [f.bytes, { level: 0 }];
  }
  return zipSync(entries);
}

export function downloadZip(files: ZipEntry[], zipName: string): void {
  const zipBytes = buildZip(files);
  const blob = new Blob([zipBytes as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
