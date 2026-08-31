import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "@cantoo/pdf-lib";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const password = formData.get("password") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }

    if (password === null || password === undefined) {
      return NextResponse.json({ error: "No password provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    
    // Load the document using @cantoo/pdf-lib and the provided password
    let loadedDoc: PDFDocument;
    try {
      loadedDoc = await PDFDocument.load(arrayBuffer, { password });
    } catch (e: any) {
      const errMsg = e?.message?.toLowerCase() || "";
      if (
        errMsg.includes("password") ||
        errMsg.includes("encrypted") ||
        errMsg.includes("decrypt") ||
        e?.name === "InvalidPasswordError"
      ) {
        return NextResponse.json(
          { error: "Incorrect password. Please check your password and try again." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed to parse PDF document." },
        { status: 400 }
      );
    }

    // Create a clean document to ensure all encryption dictionaries are completely removed
    let pdfBytes: Uint8Array;
    try {
      const cleanDoc = await PDFDocument.create();
      const pageIndices = loadedDoc.getPageIndices();
      const copiedPages = await cleanDoc.copyPages(loadedDoc, pageIndices);
      for (const page of copiedPages) {
        cleanDoc.addPage(page);
      }

      try {
        const title = loadedDoc.getTitle();
        if (title) cleanDoc.setTitle(title);
        const author = loadedDoc.getAuthor();
        if (author) cleanDoc.setAuthor(author);
        const subject = loadedDoc.getSubject();
        if (subject) cleanDoc.setSubject(subject);
        const keywords = loadedDoc.getKeywords();
        if (keywords) cleanDoc.setKeywords(Array.isArray(keywords) ? keywords : [keywords]);
        const producer = loadedDoc.getProducer();
        if (producer) cleanDoc.setProducer(producer);
        const creator = loadedDoc.getCreator();
        if (creator) cleanDoc.setCreator(creator);
      } catch {
        // Ignore metadata copying errors if any
      }

      pdfBytes = await cleanDoc.save({ useObjectStreams: false });
    } catch {
      pdfBytes = await loadedDoc.save({ useObjectStreams: false });
    }

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

