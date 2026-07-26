import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib-plus-encrypt";

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
    
    // Load the document using pdf-lib-plus-encrypt
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    // Encrypt the PDF
    pdfDoc.encrypt({
      userPassword: password,
      ownerPassword: password,
      permissions: {
        printing: 'highResolution',
        modifying: false,
        copying: false,
        annotating: false,
        fillingForms: false,
        contentAccessibility: false,
        documentAssembly: false,
      },
    });

    // Save the encrypted document
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${file.name.replace(/\.pdf$/i, '')}_protected.pdf"`,
      },
    });
  } catch (error) {
    console.error("Protect PDF API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to protect PDF." },
      { status: 500 }
    );
  }
}
