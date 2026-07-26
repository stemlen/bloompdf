/**
 * scanner.ts
 * Core logic for document scanning, edge detection, and image processing
 * using OpenCV.js (loaded globally via CDN).
 */

export interface Point {
  x: number;
  y: number;
}

export type ScanFilter = "original" | "color" | "grayscale" | "bw" | "enhanced";

/**
 * Loads an image from a File or Blob into an HTMLImageElement.
 */
export function loadImageElement(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * Orders 4 points into Top-Left, Top-Right, Bottom-Right, Bottom-Left.
 */
function orderPoints(pts: Point[]): Point[] {
  // Sort by x to separate left and right points
  const xSorted = [...pts].sort((a, b) => a.x - b.x);
  const left = xSorted.slice(0, 2);
  const right = xSorted.slice(2, 4);

  // Sort left points by y: top-left has smaller y, bottom-left has larger y
  left.sort((a, b) => a.y - b.y);
  const tl = left[0];
  const bl = left[1];

  // Sort right points by y: top-right has smaller y, bottom-right has larger y
  right.sort((a, b) => a.y - b.y);
  const tr = right[0];
  const br = right[1];

  return [tl, tr, br, bl];
}

/**
 * Detects the document edges (largest quadrilateral) in an image.
 * Uses OpenCV.js which must be available on the window object.
 */
export function detectDocumentEdges(cv: any, imgElement: HTMLImageElement): Point[] {
  const mat = cv.imread(imgElement);
  
  // 1. Grayscale
  const gray = new cv.Mat();
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY, 0);
  
  // 2. Blur to reduce noise
  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
  
  // 3. Edge detection
  const edges = new cv.Mat();
  cv.Canny(blurred, edges, 75, 200);

  // 4. Find contours
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

  // 5. Find the largest quadrilateral
  let maxArea = 0;
  let bestApprox = new cv.Mat();

  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);
    if (area > 1000) {
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
      if (approx.rows === 4 && area > maxArea) {
        maxArea = area;
        approx.copyTo(bestApprox);
      }
      approx.delete();
    }
    cnt.delete();
  }

  let points: Point[] = [];
  
  if (bestApprox.rows === 4) {
    // Extract points
    for (let i = 0; i < 4; i++) {
      points.push({
        x: bestApprox.data32S[i * 2],
        y: bestApprox.data32S[i * 2 + 1]
      });
    }
  } else {
    // Fallback: Use image bounds padded by 10%
    const w = imgElement.naturalWidth;
    const h = imgElement.naturalHeight;
    const px = w * 0.1;
    const py = h * 0.1;
    points = [
      { x: px, y: py },
      { x: w - px, y: py },
      { x: w - px, y: h - py },
      { x: px, y: h - py }
    ];
  }

  // Cleanup
  mat.delete(); gray.delete(); blurred.delete(); edges.delete();
  contours.delete(); hierarchy.delete(); bestApprox.delete();

  return orderPoints(points);
}

/**
 * Applies perspective transform, rotation, and filters to the image.
 * Returns a Data URL (JPEG).
 */
export function processDocumentScan(
  cv: any,
  imgElement: HTMLImageElement,
  pts: Point[],
  filter: ScanFilter,
  rotation: number
): string {
  const mat = cv.imread(imgElement);

  // 1. Perspective Transform
  const orderedPts = orderPoints(pts);
  const tl = orderedPts[0], tr = orderedPts[1], br = orderedPts[2], bl = orderedPts[3];
  
  const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
  const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const maxWidth = Math.max(widthA, widthB);

  const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
  const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
  const maxHeight = Math.max(heightA, heightB);

  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
     0, 0,
     maxWidth - 1, 0,
     maxWidth - 1, maxHeight - 1,
     0, maxHeight - 1
  ]);

  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
     tl.x, tl.y,
     tr.x, tr.y,
     br.x, br.y,
     bl.x, bl.y
  ]);

  const M = cv.getPerspectiveTransform(srcPts, dstPts);
  const warped = new cv.Mat();
  cv.warpPerspective(mat, warped, M, new cv.Size(maxWidth, maxHeight));

  // 2. Rotate
  if (rotation === 90) cv.rotate(warped, warped, cv.ROTATE_90_CLOCKWISE);
  else if (rotation === 180) cv.rotate(warped, warped, cv.ROTATE_180);
  else if (rotation === 270) cv.rotate(warped, warped, cv.ROTATE_90_COUNTERCLOCKWISE);

  // 3. Apply Filter
  const finalMat = new cv.Mat();
  
  if (filter === "grayscale") {
    cv.cvtColor(warped, finalMat, cv.COLOR_RGBA2GRAY, 0);
  } else if (filter === "bw") {
    const gray = new cv.Mat();
    cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.adaptiveThreshold(gray, finalMat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 10);
    gray.delete();
  } else if (filter === "color" || filter === "enhanced") {
    // Basic color enhancement: contrast and brightness
    warped.convertTo(finalMat, -1, 1.2, 10); 
  } else {
    // "original"
    warped.copyTo(finalMat);
  }

  // 4. Extract data URL
  const canvas = document.createElement("canvas");
  cv.imshow(canvas, finalMat);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

  // Cleanup
  mat.delete(); dstPts.delete(); srcPts.delete(); M.delete(); warped.delete(); finalMat.delete();

  return dataUrl;
}
