import { NextResponse } from 'next/server';
import { convertDocument } from "@/lib/documentConvert";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert PPTX to PDF using LibreOffice engine
    const pdfBuffer = await convertDocument(buffer, '.pdf');
    
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.pptx?$/i, '.pdf')}"`
      },
    });
  } catch (error: any) {
    console.error('PPTX to PDF error:', error);
    return NextResponse.json({ error: error.message || 'Conversion failed' }, { status: 500 });
  }
}
