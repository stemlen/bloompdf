# Legacy Next.js API routes (not deployed)

BloomPDF is built with `output: "export"` and served as static files from
Cloudflare Pages, so **none of these route handlers run in production**
(`/api/*` returns 404/405 on bloompdf.app). They are kept only as reference for
the upcoming conversion backend.

- `compress-pdf`, `protect-pdf`, `unlock-pdf`, `markdown-to-pdf`, `text-to-pdf`:
  superseded by client-side implementations in `src/lib`. The UI no longer
  calls them.
- `word-to-pdf`, `pptx-to-pdf`, `excel-to-pdf`, `html-to-pdf`: need a real
  server (LibreOffice / Chromium). The UI now calls a single same-origin
  endpoint, `POST /api/convert` (see `src/lib/convertApi.ts` for the contract),
  gated by `NEXT_PUBLIC_CONVERT_ENABLED=true`. That endpoint will be a
  Cloudflare Pages Function (`functions/api/convert.ts`) in front of Gotenberg.
