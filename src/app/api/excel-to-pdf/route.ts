import { NextRequest, NextResponse } from "next/server";
import { convertDocument } from "@/lib/documentConvert";
import ExcelJS from "exceljs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const action = formData.get("action") as string || "convert";
    const selectedSheetsRaw = formData.get("selectedSheets") as string;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const isXlsx = file.name.toLowerCase().endsWith(".xlsx");
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // Analyze action: Return list of sheets (Only for .xlsx)
    if (action === "analyze") {
      if (!isXlsx) {
        return NextResponse.json({ sheets: [] }); // .xls unsupported for sheet parsing
      }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const sheets: string[] = [];
      workbook.eachSheet((worksheet) => {
        sheets.push(worksheet.name);
      });
      return NextResponse.json({ sheets });
    }

    // Convert action
    if (action === "convert") {
      // Handle selective sheet conversion for .xlsx
      if (isXlsx && selectedSheetsRaw) {
        const selectedSheets: string[] = JSON.parse(selectedSheetsRaw);
        if (selectedSheets.length > 0) {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer as any);
          
          // Find sheets to remove
          const sheetsToRemove: string[] = [];
          workbook.eachSheet((worksheet) => {
            if (!selectedSheets.includes(worksheet.name)) {
              sheetsToRemove.push(worksheet.name);
            }
          });
          
          // Remove them
          for (const sheetName of sheetsToRemove) {
            workbook.removeWorksheet(sheetName);
          }
          
          // Generate new buffer
          const newArrayBuffer = await workbook.xlsx.writeBuffer();
          buffer = Buffer.from(newArrayBuffer);
        }
      }

      // Convert using LibreOffice Headless
      const pdfBuf = await convertDocument(buffer, '.pdf');

      return new NextResponse(pdfBuf as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${file.name.replace(/\.xlsx?$/i, '.pdf')}"`
        }
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Excel to PDF Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to convert document" },
      { status: 500 }
    );
  }
}
