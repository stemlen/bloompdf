/**
 * convertApi.ts
 * Single entry point for conversions that genuinely need a server
 * (Word / PowerPoint / Excel / HTML → PDF).
 *
 * The site is a static export on Cloudflare Pages, so there is no Next.js
 * server. The conversion backend (Gotenberg behind a Cloudflare Pages Function
 * at `functions/api/convert.ts`) ships separately. Until it is live, set
 * nothing: `NEXT_PUBLIC_CONVERT_ENABLED` defaults to off, the UI shows a
 * "temporarily unavailable" state and **no request is sent**.
 *
 * Contract (same-origin, never a cross-origin URL):
 *   POST /api/convert   multipart/form-data
 *     type    "word" | "powerpoint" | "excel" | "html"
 *     target  "pdf" (or "png" for the HTML preview screenshot)
 *     file    the source document (for type=html with inline HTML: index.html)
 *     url     (type=html only) page to render instead of a file
 *     options JSON string with tool specific options (optional)
 *   200 → application/pdf (or image/png) body
 *   4xx/5xx → JSON { error: string }
 */

export const CONVERT_ENDPOINT = "/api/convert";

/** Build-time flag; inlined by Next.js. Anything other than "true" = disabled. */
export const CONVERT_ENABLED = process.env.NEXT_PUBLIC_CONVERT_ENABLED === "true";

export type ConvertType = "word" | "powerpoint" | "excel" | "html";
export type ConvertTarget = "pdf" | "png";

export const CONVERT_UNAVAILABLE_MESSAGE =
  "This converter is temporarily unavailable. It needs a conversion server, which is being set up. All other BloomPDF tools keep working in your browser.";

export class ConvertUnavailableError extends Error {
  constructor(message = CONVERT_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "ConvertUnavailableError";
  }
}

export interface ConvertRequest {
  type: ConvertType;
  target?: ConvertTarget;
  file?: File | Blob;
  fileName?: string;
  url?: string;
  options?: Record<string, unknown>;
  signal?: AbortSignal;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b);
}

/**
 * Sends a conversion request to the same-origin backend.
 * Throws ConvertUnavailableError without any network activity when the
 * backend is disabled, and also when the endpoint is missing (404/405/501/503).
 */
export async function convertWithBackend(req: ConvertRequest): Promise<Blob> {
  if (!CONVERT_ENABLED) throw new ConvertUnavailableError();

  const target = req.target ?? "pdf";
  const form = new FormData();
  form.append("type", req.type);
  form.append("target", target);
  if (req.file) form.append("file", req.file, req.fileName ?? (req.file instanceof File ? req.file.name : "input"));
  if (req.url) form.append("url", req.url);
  if (req.options) form.append("options", JSON.stringify(req.options));

  let res: Response;
  try {
    res = await fetch(CONVERT_ENDPOINT, { method: "POST", body: form, signal: req.signal });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new Error("Could not reach the conversion server. Check your connection and try again.");
  }

  if ([404, 405, 501, 502, 503].includes(res.status)) throw new ConvertUnavailableError();
  if (!res.ok) {
    let msg = `Conversion failed (HTTP ${res.status}).`;
    try {
      const data = await res.json();
      if (data?.error) msg = String(data.error);
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }

  // Never hand an HTML error page to the user as a ".pdf".
  const buf = new Uint8Array(await res.arrayBuffer());
  const magic = target === "png" ? PNG_MAGIC : PDF_MAGIC;
  if (!startsWith(buf, magic)) {
    throw new Error("The conversion server returned an unexpected response. Please try again later.");
  }
  return new Blob([buf], { type: target === "png" ? "image/png" : "application/pdf" });
}
