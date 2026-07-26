import { NextRequest, NextResponse } from "next/server";
import { convertDocument } from "@/lib/documentConvert";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfBuf = await convertDocument(buffer, '.pdf');

    return new NextResponse(pdfBuf as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.docx?$/i, '.pdf')}"`
      }
    });

  } catch (error) {
    console.error("Word to PDF Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to convert document" },
      { status: 500 }
    );
  }
}
