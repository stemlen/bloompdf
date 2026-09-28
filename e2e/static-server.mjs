#!/usr/bin/env node
/**
 * Minimal static server for the `out/` export (Cloudflare Pages-style clean
 * URLs: /tools/pdf-to-word → out/tools/pdf-to-word.html). Test-only.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.OUT_DIR ?? "out");
const port = Number(process.env.PORT ?? 4175);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
};

function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/\/+$/, "") || "/index";
  const base = path.join(root, path.normalize(clean).replace(/^(\.\.[/\\])+/, ""));
  if (!base.startsWith(root)) return null;
  for (const p of [base, `${base}.html`, path.join(base, "index.html")]) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

http
  .createServer((req, res) => {
    const file = resolve(req.url ?? "/");
    if (!file) {
      res.writeHead(404, { "content-type": "text/html" });
      fs.createReadStream(path.join(root, "404.html")).on("error", () => res.end("not found")).pipe(res);
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
