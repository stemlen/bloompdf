/**
 * pdfRender.ts
 * Uses pdfjs-dist to render PDF pages as image Data URLs (thumbnails).
 */
import * as pdfjsLib from 'pdfjs-dist';

// Use CDN for the worker to avoid complex webpack config in Next.js App Router
// Fallback to local if necessary, but CDN is most reliable for generic usage.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export async function loadPdfForRendering(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

export async function renderPageToDataURL(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number = 0.5 // Default to 0.5 for thumbnails to save memory
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error("Could not create canvas context.");
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderContext: any = {
    canvasContext: ctx,
    viewport: viewport,
  };

  await page.render(renderContext).promise;
  
  return canvas.toDataURL('image/jpeg', 0.8);
}
