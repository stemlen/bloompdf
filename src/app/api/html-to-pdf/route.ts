import { NextRequest, NextResponse } from "next/server";
import puppeteer, { PaperFormat, PDFOptions } from "puppeteer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      inputType,
      inputValue,
      screenSize,
      pageSize,
      margins,
      orientation,
      features,
      pdfSettings
    } = body;

    if (!inputValue) {
      return NextResponse.json({ error: "Input value is required" }, { status: 400 });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });

    const page = await browser.newPage();

    // Set viewport
    let width = 1920, height = 1080;
    if (screenSize === "laptop") { width = 1366; height = 768; }
    else if (screenSize === "tablet") { width = 768; height = 1024; }
    else if (screenSize === "mobile") { width = 375; height = 667; }
    
    await page.setViewport({ width, height });

    // Intercept requests if we want to block ads at the network level
    if (features?.blockAds) {
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url().toLowerCase();
        if (
          url.includes('doubleclick.net') ||
          url.includes('googleadservices.com') ||
          url.includes('adnxs.com') ||
          url.includes('ads')
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });
    }

    // Navigate or set content
    if (inputType === "url") {
      let targetUrl = inputValue;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      await page.goto(targetUrl, { waitUntil: 'networkidle2' as any, timeout: 30000 });
    } else {
      await page.setContent(inputValue, { waitUntil: 'networkidle2' as any, timeout: 30000 });
    }

    // Inject CSS to clean up page
    const cssToInject: string[] = [];
    
    if (features?.removeCookieBanners) {
      cssToInject.push('[id*="cookie" i], [class*="cookie" i], [id*="cmp" i], [class*="cmp" i], [id*="consent" i], [class*="consent" i], [id*="gdpr" i], [class*="gdpr" i] { display: none !important; }');
    }
    if (features?.removePopups) {
      cssToInject.push('[class*="popup" i], [class*="overlay" i], [id*="popup" i], [id*="overlay" i], [class*="modal" i] { display: none !important; }');
    }
    if (features?.blockAds) {
      cssToInject.push('iframe, [class*="ad-" i], [id*="ad-" i], [class*="ads-" i], [id*="ads-" i], ins.adsbygoogle { display: none !important; }');
    }
    if (features?.printFriendly) {
      cssToInject.push('header, footer, nav, aside, .sidebar { display: none !important; }');
      cssToInject.push('body { background: transparent !important; color: #000 !important; }');
    }

    if (cssToInject.length > 0) {
      await page.addStyleTag({ content: cssToInject.join('\n') });
      // Give a tiny moment for styles to apply and any animations to finish hiding things
      await new Promise(r => setTimeout(r, 500));
    }

    if (action === "preview") {
      const screenshot = await page.screenshot({ type: "jpeg", quality: 80, fullPage: true });
      await browser.close();
      
      return NextResponse.json({
        success: true,
        data: `data:image/jpeg;base64,${Buffer.from(screenshot).toString('base64')}`
      });
    }

    if (action === "pdf") {
      const pdfOptions: PDFOptions = {
        printBackground: pdfSettings?.backgroundGraphics ?? true,
        landscape: orientation === "landscape",
      };

      // Handle Margins
      if (margins === "none") {
        pdfOptions.margin = { top: 0, right: 0, bottom: 0, left: 0 };
      } else if (margins === "small") {
        pdfOptions.margin = { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" };
      } else if (margins === "medium") {
        pdfOptions.margin = { top: "1in", right: "1in", bottom: "1in", left: "1in" };
      } else if (margins === "large") {
        pdfOptions.margin = { top: "1.5in", right: "1.5in", bottom: "1.5in", left: "1.5in" };
      }

      // Handle Page Format vs Single Page
      if (pdfSettings?.singlePage) {
        // Evaluate the full page height and set format to those dimensions
        const dimensions = await page.evaluate(() => {
          return {
            width: document.documentElement.clientWidth,
            height: Math.max(
              document.body.scrollHeight,
              document.body.offsetHeight,
              document.documentElement.clientHeight,
              document.documentElement.scrollHeight,
              document.documentElement.offsetHeight
            )
          };
        });
        pdfOptions.width = `${dimensions.width}px`;
        pdfOptions.height = `${dimensions.height + 20}px`; // Add a tiny buffer
      } else {
        pdfOptions.format = (pageSize as PaperFormat) || "A4";
      }
      
      // We could use CSS scaling for scaleToFit, but puppeteer has a scale option
      if (pdfSettings?.scaleToFit) {
        // Simple scaling, defaults to 1. Advanced users might adjust this.
        pdfOptions.scale = 1;
      }

      const pdfBuffer = await page.pdf(pdfOptions);
      await browser.close();

      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="converted.pdf"'
        }
      });
    }

    await browser.close();
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("HTML to PDF Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
