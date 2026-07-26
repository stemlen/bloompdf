import { NextRequest, NextResponse } from "next/server";
import puppeteer, { PDFOptions } from "puppeteer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      text, 
      fontFamily = "sans-serif", 
      fontSize = "12pt", 
      lineSpacing = "1.5", 
      alignment = "left", 
      orientation = "portrait", 
      margin = "medium" 
    } = body;

    if (!text) {
      return NextResponse.json({ error: "Text content is required" }, { status: 400 });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });

    const page = await browser.newPage();

    // Map fonts
    const fontStr = fontFamily === "Inter" ? "'Inter', sans-serif" : 
                    fontFamily === "sans-serif" ? "Arial, Helvetica, sans-serif" : 
                    fontFamily === "serif" ? "'Times New Roman', Times, serif" : "monospace";

    // Build CSS
    const css = `
      body {
        margin: 0;
        padding: 0;
        font-family: ${fontStr};
        font-size: ${fontSize};
        line-height: ${lineSpacing};
        text-align: ${alignment};
        color: #000;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .content {
        /* Padding is handled by puppeteer margins instead to ensure page breaks work well, 
           but we can also use basic padding if we don't use puppeteer margins */
      }
    `;

    // We use a simple div to hold the pre-wrapped text. 
    // We escape HTML characters to prevent XSS and ensure proper rendering of plain text.
    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="content">${escapeHtml(text)}</div>
      </body>
      </html>
    `;

    await page.setContent(fullHtml, { waitUntil: 'load' });

    // Handle Margins
    let marginObj = { top: "1in", right: "1in", bottom: "1in", left: "1in" };
    if (margin === "small") {
      marginObj = { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" };
    } else if (margin === "large") {
      marginObj = { top: "1.5in", right: "1.5in", bottom: "1.5in", left: "1.5in" };
    }

    const pdfOptions: PDFOptions = {
      printBackground: true,
      format: "A4",
      margin: marginObj,
      landscape: orientation === "landscape"
    };

    const pdfBuffer = await page.pdf(pdfOptions);
    await browser.close();

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="converted.pdf"'
      }
    });

  } catch (error) {
    console.error("Text to PDF Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
