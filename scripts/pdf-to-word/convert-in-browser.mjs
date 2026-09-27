#!/usr/bin/env node
/**
 * Converts PDFs with the real PDF to Word tool in headless Chromium, against a
 * running static build (see e2e/static-server.mjs).
 *
 *   BASE=http://localhost:4175 node scripts/pdf-to-word/convert-in-browser.mjs out-dir file1.pdf [file2.pdf ...]
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const base = process.env.BASE ?? "http://localhost:4175";
const [outDir, ...files] = process.argv.slice(2);
if (!outDir || !files.length) {
  console.error("usage: convert-in-browser.mjs out-dir file.pdf [...]");
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
let failed = 0;
for (const file of files) {
  const page = await browser.newPage({ acceptDownloads: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const t0 = Date.now();
  try {
    await page.goto(`${base}/tools/pdf-to-word`);
    await page.getByTestId("pdf-to-word-input").setInputFiles(file);
    // Record main-thread long tasks (>50 ms) during conversion: a responsiveness check.
    await page.evaluate(() => {
      const w = window;
      w.__longTasks = [];
      new PerformanceObserver((list) => w.__longTasks.push(...list.getEntries().map((e) => e.duration))).observe({ type: "longtask" });
    });
    await page.getByTestId("pdf-to-word-convert").click();
    await page.getByTestId("pdf-to-word-download").or(page.getByTestId("pdf-to-word-error")).waitFor({ timeout: 600_000 });
    const longTasks = await page.evaluate(() => window.__longTasks);
    const maxGap = longTasks.length ? Math.max(...longTasks) : 0;
    if (await page.getByTestId("pdf-to-word-error").isVisible()) throw new Error(await page.getByTestId("pdf-to-word-error").innerText());
    const summary = (await page.getByTestId("pdf-to-word-summary").innerText()).replace(/\s+/g, " ");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("pdf-to-word-download").click()]);
    const target = path.join(outDir, path.basename(file).replace(/\.pdf$/i, ".docx"));
    await download.saveAs(target);
    console.log(JSON.stringify({ file, docx: target, seconds: (Date.now() - t0) / 1000, longestTaskMs: Math.round(maxGap), longTasks: longTasks.length, summary, pageErrors: errors }));
  } catch (e) {
    failed++;
    console.log(JSON.stringify({ file, error: String(e?.message ?? e), pageErrors: errors }));
  } finally {
    await page.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
