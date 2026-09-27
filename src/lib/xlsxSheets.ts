/**
 * xlsxSheets.ts
 * Reads worksheet names from an .xlsx file in the browser (no upload, no
 * dependencies): locates `xl/workbook.xml` in the ZIP central directory and
 * inflates it with the native DecompressionStream API.
 */

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntry(buf: Uint8Array, wanted: string): Promise<Uint8Array | null> {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // End of central directory record: search backwards for its signature.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const entries = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  for (let n = 0; n < entries && p + 46 <= buf.length; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) return null;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(buf.subarray(p + 46, p + 46 + nameLen));
    if (name === wanted) {
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(start, start + compSize);
      if (method === 0) return data;
      if (method === 8) return inflateRaw(data);
      return null;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

/** Returns the worksheet names of an .xlsx workbook, or [] if unreadable. */
export async function getXlsxSheetNames(file: File | Blob): Promise<string[]> {
  try {
    if (typeof DecompressionStream === "undefined") return [];
    const buf = new Uint8Array(await file.arrayBuffer());
    const xml = await readZipEntry(buf, "xl/workbook.xml");
    if (!xml) return [];
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(xml), "application/xml");
    return Array.from(doc.getElementsByTagNameNS("*", "sheet"))
      .map((el) => el.getAttribute("name") || "")
      .filter(Boolean);
  } catch {
    return [];
  }
}
