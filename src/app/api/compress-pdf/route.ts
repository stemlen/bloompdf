import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

// Helper to determine the ghostscript binary name based on the OS
const getGsCommand = () => {
  return process.platform === "win32" ? "gswin64c" : "gs";
};

type CompressionStrategy = {
  name: string;
  args: string[];
};

const STRATEGIES: Record<string, CompressionStrategy> = {
  low: {
    name: "Low Compression (Printer)",
    args: ["-dPDFSETTINGS=/printer"],
  },
  medium: {
    name: "Recommended Compression (eBook)",
    args: ["-dPDFSETTINGS=/ebook"],
  },
  high: {
    name: "High Compression (Screen)",
    args: ["-dPDFSETTINGS=/screen"],
  },
  aggressive: {
    name: "Aggressive Optimization",
    args: [
      "-dPDFSETTINGS=/screen",
      "-dColorImageDownsampleType=/Bicubic",
      "-dColorImageResolution=50",
      "-dGrayImageDownsampleType=/Bicubic",
      "-dGrayImageResolution=50",
      "-dMonoImageDownsampleType=/Bicubic",
      "-dMonoImageResolution=50",
    ],
  },
  extreme: {
    name: "Extreme Optimization",
    args: [
      "-dPDFSETTINGS=/screen",
      "-dColorImageDownsampleType=/Bicubic",
      "-dColorImageResolution=30",
      "-dGrayImageDownsampleType=/Bicubic",
      "-dGrayImageResolution=30",
      "-dMonoImageDownsampleType=/Bicubic",
      "-dMonoImageResolution=30",
    ],
  },
};

const ITERATION_ORDER = ["medium", "high", "aggressive", "extreme"];

async function runCompressionPass(inputPath: string, outputPath: string, strategy: CompressionStrategy): Promise<number | null> {
  const gsCommand = getGsCommand();
  const args = [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    ...strategy.args,
    `-sOutputFile=${outputPath}`,
    inputPath,
  ];

  try {
    await execFileAsync(gsCommand, args);
    const stats = await fs.stat(outputPath);
    return stats.size;
  } catch (error) {
    console.error(`Ghostscript failed for strategy ${strategy.name}:`, error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const level = formData.get("level") as string | null; // "low", "medium", "high", "target"
  const targetSizeKbStr = formData.get("targetSizeKb") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const originalSize = file.size;
  const targetSizeBytes = targetSizeKbStr ? parseFloat(targetSizeKbStr) * 1024 : null;

  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  const inputPath = path.join(tempDir, `input_${timestamp}.pdf`);
  const bestOutputPath = path.join(tempDir, `best_output_${timestamp}.pdf`);
  const currentOutputPath = path.join(tempDir, `current_output_${timestamp}.pdf`);

  let bestSize = originalSize;
  let bestStrategyName = "None";
  let warningMessage = "";

  try {
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

    let strategiesToTry: string[] = [];

    if (level === "target" && targetSizeBytes) {
      strategiesToTry = ITERATION_ORDER;
    } else {
      strategiesToTry = [level || "medium"];
    }

    for (const stratKey of strategiesToTry) {
      const strategy = STRATEGIES[stratKey];
      if (!strategy) continue;

      const currentSize = await runCompressionPass(inputPath, currentOutputPath, strategy);

      if (currentSize !== null && currentSize < bestSize) {
        // We found a better compression
        bestSize = currentSize;
        bestStrategyName = strategy.name;
        await fs.rename(currentOutputPath, bestOutputPath); // Save the best result

        // If we hit our target size in "target" mode, we can stop early
        if (level === "target" && targetSizeBytes && bestSize <= targetSizeBytes) {
          break;
        }
      } else if (currentSize !== null) {
        // Ghostscript produced a file, but it was larger than the best we have (or original).
        // Clean it up.
        await fs.unlink(currentOutputPath).catch(() => {});
      }
    }

    // After all iterations, analyze results
    let finalBuffer: Buffer;
    let reduction = 0;

    if (bestSize < originalSize) {
      finalBuffer = await fs.readFile(bestOutputPath);
      reduction = Math.max(0, Math.round((1 - bestSize / originalSize) * 100));
    } else {
      // No meaningful reduction was achieved at all
      finalBuffer = await fs.readFile(inputPath);
      bestSize = originalSize;
      bestStrategyName = "Original (No reduction possible)";
      warningMessage = "PDF is already optimally compressed. No meaningful reduction could be achieved without destroying the document.";
    }

    if (level === "target" && targetSizeBytes && bestSize > targetSizeBytes) {
      warningMessage = `Requested target size (${(targetSizeBytes / 1024).toFixed(0)} KB) was unachievable. Returning the smallest possible file (${(bestSize / 1024).toFixed(0)} KB).`;
    }

    // Clean up temp files
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(bestOutputPath).catch(() => {});
    await fs.unlink(currentOutputPath).catch(() => {});

    // Send back the raw PDF with metadata in headers
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", `attachment; filename="${file.name.replace(/\.pdf$/i, "")}_compressed.pdf"`);
    headers.set("X-Original-Size", originalSize.toString());
    headers.set("X-Compressed-Size", bestSize.toString());
    headers.set("X-Reduction-Pct", reduction.toString());
    headers.set("X-Strategy-Used", bestStrategyName);
    
    // Header values can't easily contain special chars, so encode URI component
    if (warningMessage) {
      headers.set("X-Warning-Message", encodeURIComponent(warningMessage));
    }

    return new NextResponse(finalBuffer as any, { status: 200, headers });

  } catch (error) {
    console.error("PDF Compression Error:", error);
    // Cleanup on error
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(bestOutputPath).catch(() => {});
    await fs.unlink(currentOutputPath).catch(() => {});
    
    return NextResponse.json({ error: "Failed to compress PDF." }, { status: 500 });
  }
}
