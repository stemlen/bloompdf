import { NextRequest, NextResponse } from "next/server";
import { unlockPDF } from "@/lib/unlockPdf";

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

    try {
      const pdfBytes = await unlockPDF(file, password);
      return new NextResponse(pdfBytes as any, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${file.name.replace(/\.pdf$/i, '')}_unlocked.pdf"`,
        },
      });
    } catch (e: any) {
      const errMsg = e?.message || "";
      const lower = errMsg.toLowerCase();
      if (lower.includes("incorrect password") || lower.includes("invalid password")) {
        return NextResponse.json(
          { error: "Incorrect password. Please check your password and try again." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: errMsg || "Failed to parse PDF document." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Unlock PDF API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unlock PDF." },
      { status: 500 }
    );
  }
}
