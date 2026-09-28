import { test, expect, type Browser, type Page } from "@playwright/test";
import { unzipSync, strFromU8 } from "fflate";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * PDF to Word, end to end against the static export. Fixture PDFs are
 * printed by Chromium at test time, so no binaries live in the repo.
 */

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p2w-e2e-"));

async function printPdf(browser: Browser, html: string, name: string): Promise<string> {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  const file = path.join(tmp, name);
  await page.pdf({ path: file, format: "Letter", margin: { top: "0.75in", bottom: "0.75in", left: "0.75in", right: "0.75in" } });
  await page.close();
  return file;
}

/** A small PNG made on a canvas (so the fixture contains a real image XObject). */
const pngDataUrl = async (page: Page, text: string, w = 360, h = 200) =>
  page.evaluate(
    ([t, width, height]) => {
      const c = document.createElement("canvas");
      c.width = width as number;
      c.height = height as number;
      const ctx = c.getContext("2d")!;
      const g = ctx.createLinearGradient(0, 0, c.width, c.height);
      g.addColorStop(0, "#E8607A");
      g.addColorStop(1, "#2563EB");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#000";
      ctx.font = "bold 64px sans-serif";
      ctx.fillText(t as string, 20, (height as number) / 2 + 20);
      return c.toDataURL("image/png");
    },
    [text, w, h] as const
  );

async function convert(page: Page, file: string): Promise<{ xml: string; zip: Record<string, Uint8Array> }> {
  await page.goto("/tools/pdf-to-word");
  await page.getByTestId("pdf-to-word-input").setInputFiles(file);
  await expect(page.getByTestId("pdf-to-word-filename")).toHaveText(path.basename(file));
  await page.getByTestId("pdf-to-word-convert").click();
  await expect(page.getByTestId("pdf-to-word-download")).toBeVisible({ timeout: 170_000 });
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("pdf-to-word-download").click()]);
  expect(download.suggestedFilename()).toBe(path.basename(file).replace(/\.pdf$/, ".docx"));
  const out = path.join(tmp, download.suggestedFilename());
  await download.saveAs(out);
  const zip = unzipSync(new Uint8Array(fs.readFileSync(out)));
  return { xml: strFromU8(zip["word/document.xml"]), zip };
}

const plainText = (xml: string) =>
  (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [])
    .map((p) => [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(""))
    .join("\n")
    .replace(/&amp;/g, "&");

test("tool is live, not 'coming soon'", async ({ page }) => {
  await page.goto("/tools/pdf-to-word");
  await expect(page.getByTestId("pdf-to-word-dropzone")).toBeVisible();
  await expect(page.getByTestId("tool-coming-soon")).toHaveCount(0);
  await expect(page.getByTestId("pdf-to-word-convert")).toBeDisabled();
});

test("keeps headings, bold/italic, a table, an image and column order", async ({ page, browser }) => {
  const img = await pngDataUrl(page, "LOGO");
  const left = "Leftcolumn alpha text flows down the first column before anything else. ".repeat(9);
  const right = "Rightcolumn omega text starts only after the first column has ended. ".repeat(9);
  const html = `<!doctype html><html><head><style>
    body { font-family: "DejaVu Serif", "Liberation Serif", serif; font-size: 12pt; line-height: 1.35; }
    h1 { font-size: 26pt; } h2 { font-size: 17pt; }
    table { border-collapse: collapse; margin: 12pt 0; } td, th { border: 1px solid #444; padding: 4pt 14pt; text-align: left; }
    .cols { column-count: 2; column-gap: 28pt; text-align: justify; }
  </style></head><body>
    <h1>Quarterly Report</h1>
    <p>This paragraph has <b>important bold words</b> and <i>gently italic words</i> inside normal text.</p>
    <h2>Results Table</h2>
    <table>
      <tr><th>Region</th><th>Units</th><th>Revenue</th></tr>
      <tr><td>North</td><td>120</td><td>4,300</td></tr>
      <tr><td>South</td><td>95</td><td>3,150</td></tr>
      <tr><td>East</td><td>143</td><td>5,020</td></tr>
      <tr><td>West</td><td>88</td><td>2,760</td></tr>
    </table>
    <h2>Figure</h2>
    <p><img src="${img}" width="240" height="133" alt=""></p>
    <h2>Two Columns</h2>
    <div class="cols"><p>${left}</p><p>${right}</p></div>
  </body></html>`;
  const pdf = await printPdf(browser, html, "report.pdf");
  const { xml, zip } = await convert(page, pdf);
  const text = plainText(xml);

  // Headings, bold, italic
  expect(xml).toMatch(/<w:pStyle w:val="Heading1"\/>[\s\S]*?Quarterly Report/);
  expect(xml).toMatch(/<w:pStyle w:val="Heading2"\/>[\s\S]*?Results Table/);
  expect(xml).toMatch(/<w:b\/>(?:(?!<\/w:r>)[\s\S])*important bold words/);
  expect(xml).toMatch(/<w:i\/>(?:(?!<\/w:r>)[\s\S])*gently italic words/);

  // A real Word table with the right cells
  const tbl = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/)?.[0] ?? "";
  expect(tbl).not.toBe("");
  expect(tbl.match(/<w:tr[ >]/g)?.length).toBe(5);
  expect(tbl.match(/<w:tc>/g)?.length).toBe(15);
  expect(plainText(tbl)).toContain("East\n143\n5,020");

  // An embedded image
  expect(xml).toContain("<w:drawing>");
  expect(Object.keys(zip).some((k) => k.startsWith("word/media/") && !k.endsWith("/"))).toBe(true);

  // Column by column: every left-column word comes before the right column.
  const lastLeft = text.lastIndexOf("Leftcolumn");
  const firstRight = text.indexOf("Rightcolumn");
  expect(lastLeft).toBeGreaterThan(-1);
  expect(firstRight).toBeGreaterThan(lastLeft);
  expect(text.match(/Leftcolumn/g)?.length).toBe(9);
  expect(text.match(/Rightcolumn/g)?.length).toBe(9);
});

test("scanned page is OCR'd, not left empty", async ({ page, browser }) => {
  test.slow(); // downloads the OCR engine on first use
  // A text-free PDF page that only holds a picture of text.
  const scan = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1275;
    c.height = 1650;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.translate(120, 160);
    ctx.rotate((1.5 * Math.PI) / 180); // slightly skewed, like a real scan
    ctx.fillStyle = "#111";
    ctx.font = "bold 64px sans-serif";
    ctx.fillText("Invoice Summary", 0, 60);
    ctx.font = "40px serif";
    ["Total amount due is ninety nine dollars.", "Payment is expected within thirty days.", "Thank you for your business."].forEach((l, i) =>
      ctx.fillText(l, 0, 180 + i * 70)
    );
    return c.toDataURL("image/png");
  });
  const pdf = await printPdf(
    browser,
    `<!doctype html><html><body style="margin:0"><img src="${scan}" style="width:7in"></body></html>`,
    "scan.pdf"
  );
  const { xml } = await convert(page, pdf);
  await expect(page.getByTestId("pdf-to-word-summary")).toContainText("OCR used on page 1");
  const text = plainText(xml).toLowerCase();
  for (const w of ["invoice", "summary", "ninety", "dollars", "payment", "thirty", "business"]) expect(text).toContain(w);
});

test("rejects a file that is not a PDF", async ({ page }) => {
  const bogus = path.join(tmp, "notes.txt");
  fs.writeFileSync(bogus, "hello");
  await page.goto("/tools/pdf-to-word");
  await page.getByTestId("pdf-to-word-input").setInputFiles(bogus);
  await expect(page.getByTestId("pdf-to-word-error")).toContainText("PDF");
  await expect(page.getByTestId("pdf-to-word-convert")).toBeDisabled();
});

test("reports a damaged PDF instead of hanging", async ({ page }) => {
  const broken = path.join(tmp, "broken.pdf");
  fs.writeFileSync(broken, "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\ntrailer << >>\n%%EOF");
  await page.goto("/tools/pdf-to-word");
  await page.getByTestId("pdf-to-word-input").setInputFiles(broken);
  await page.getByTestId("pdf-to-word-convert").click();
  await expect(page.getByTestId("pdf-to-word-error")).toBeVisible({ timeout: 30_000 });
});
