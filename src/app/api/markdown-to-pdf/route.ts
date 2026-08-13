import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { marked } from "marked";
import { GITHUB_MARKDOWN_CSS } from "@/lib/markdownStyles";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { markdown } = body;

    if (!markdown || typeof markdown !== "string") {
      return NextResponse.json({ error: "Markdown content is required" }, { status: 400 });
    }

    // ── Configure marked with GFM (v18 API: use marked.use()) ────────────────
    marked.use({
      gfm: true,         // GitHub-Flavored Markdown: tables, strikethrough, task lists
      breaks: false,     // Don't convert single newlines to <br> (matches GitHub behaviour)
    });

    const htmlContent = marked.parse(markdown) as string;

    // ── Full HTML document ────────────────────────────────────────────────────
    // We embed Prism.js from CDN for syntax highlighting inside Puppeteer.
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Document</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css">
  <style>
    ${GITHUB_MARKDOWN_CSS}
    /* Override font with Inter when available */
    body { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
  </style>
</head>
<body>
  <div class="markdown-body">
    ${htmlContent}
  </div>
  <!-- Prism.js for syntax highlighting -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
</body>
</html>`;

    // ── Puppeteer: launch, render, export PDF ─────────────────────────────────
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        // Allow loading CDN resources inside Puppeteer
        "--disable-web-security",
      ],
    });

    const page = await browser.newPage();

    // Set generous viewport so nothing wraps unexpectedly
    await page.setViewport({ width: 1200, height: 900 });

    await page.setContent(fullHtml, {
      // 'load' waits for all synchronous resources; CDN scripts may load async after
      waitUntil: "load",
      timeout: 30000,
    });

    // Give Prism autoloader time to fetch and apply language grammars
    await new Promise((r) => setTimeout(r, 1200));

    const pdfBuffer = await page.pdf({
      printBackground: true,
      format: "A4",
      // These margins become the page inset — body has no extra padding
      margin: {
        top: "1in",
        right: "1in",
        bottom: "1in",
        left: "1in",
      },
      // Render as screen (not print) so colours and backgrounds render correctly
      preferCSSPageSize: false,
    });

    await browser.close();

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="document.pdf"',
      },
    });
  } catch (error) {
    console.error("[markdown-to-pdf] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
