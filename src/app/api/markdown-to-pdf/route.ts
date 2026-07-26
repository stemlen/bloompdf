import { NextRequest, NextResponse } from "next/server";
import puppeteer, { PDFOptions } from "puppeteer";
import { marked } from "marked";

const getThemeCSS = (theme: string) => {
  const base = `
    body { margin: 0; padding: 2in 1in; font-size: 14px; line-height: 1.6; color: #333; }
    img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
    code { font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; background: #f4f4f4; padding: 2px 4px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 1em; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; padding-left: 1em; color: #666; margin-left: 0; }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
  `;

  switch (theme) {
    case "professional":
      return base + `
        body { font-family: 'Times New Roman', Times, serif; color: #000; text-align: justify; }
        h1, h2, h3 { font-family: 'Arial', sans-serif; color: #222; border-bottom: 1px solid #ccc; padding-bottom: 0.2em; }
        code, pre { background: #fff; border: 1px solid #ccc; border-radius: 0; }
        blockquote { border-left-color: #000; color: #333; font-style: italic; }
      `;
    case "modern":
      return base + `
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; }
        h1, h2, h3 { color: #E8607A; font-weight: 700; }
        a { color: #2563EB; text-decoration: none; }
        pre { background: #111; color: #f8f8f2; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        code { background: #f1f1f1; color: #E8607A; }
        pre code { background: transparent; color: inherit; }
        blockquote { border-left-color: #E8607A; background: #FFF0F3; padding: 1em; border-radius: 0 8px 8px 0; }
        table th { background-color: #E8607A; color: white; }
      `;
    case "minimal":
      return base + `
        body { font-family: 'Courier New', Courier, monospace; color: #000; padding: 1in; }
        h1, h2, h3 { border-bottom: 1px dashed #000; padding-bottom: 0.2em; text-transform: uppercase; }
        code, pre { background: transparent; border: 1px dashed #000; border-radius: 0; }
        table, th, td { border: 1px dashed #000; }
        blockquote { border-left: 2px dashed #000; }
      `;
    case "default":
    default:
      return base + `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
        h1, h2 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
      `;
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { markdown, theme = "default", orientation = "auto" } = body;

    if (!markdown) {
      return NextResponse.json({ error: "Markdown content is required" }, { status: 400 });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });

    const page = await browser.newPage();

    // Convert Markdown to HTML
    const htmlContent = await marked.parse(markdown);

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <style>${getThemeCSS(theme)}</style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    await page.setContent(fullHtml, { waitUntil: 'load' });

    const pdfOptions: PDFOptions = {
      printBackground: true,
      format: "A4",
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" }
    };

    if (orientation === "landscape") {
      pdfOptions.landscape = true;
    }

    const pdfBuffer = await page.pdf(pdfOptions);
    await browser.close();

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="converted.pdf"'
      }
    });

  } catch (error) {
    console.error("Markdown to PDF Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
