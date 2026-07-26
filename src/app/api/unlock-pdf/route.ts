import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const password = formData.get("password") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "No password provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    
    // Load the document using pdf-lib-plus-encrypt and the provided password
    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(arrayBuffer, { password } as any);
    } catch (e: any) {
      // Typically pdf-lib throws an error if the password is wrong or not provided
      if (e.message?.toLowerCase().includes("password") || e.name === "InvalidPasswordError") {
        return NextResponse.json(
          { error: "Incorrect password or corrupted PDF." },
          { status: 401 }
        );
      }
      throw e;
    }

    // Since we don't call pdfDoc.encrypt(), saving it will generate an unencrypted PDF buffer.
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${file.name.replace(/\.pdf$/i, '')}_unlocked.pdf"`,
      },
    });
  } catch (error) {
    console.error("Unlock PDF API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unlock PDF." },
      { status: 500 }
    );
  }
}
