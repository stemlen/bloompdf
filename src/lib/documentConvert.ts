import { promisify } from "util";

/**
 * Converts a document buffer (DOCX, PPTX, etc.) to a target format (e.g. '.pdf')
 * using the LibreOffice engine.
 * 
 * Note: LibreOffice must be installed on the host system.
 * 
 * @param inputBuffer The file buffer to convert
 * @param targetExtension The target extension including dot (default: '.pdf')
 * @returns The converted file buffer
 */
export async function convertDocument(inputBuffer: Buffer, targetExtension: string = '.pdf'): Promise<Buffer> {
  try {
    // Require inside to avoid blocking cold starts or causing import errors
    const libre = require("libreoffice-convert");
    const libreConvertAsync = promisify(libre.convert);
    
    // libreConvertAsync(document, targetFormat, filterOptions)
    const convertedBuffer = await libreConvertAsync(inputBuffer, targetExtension, undefined);
    
    return convertedBuffer as Buffer;
  } catch (error) {
    console.error("Document conversion error:", error);
    throw new Error("Failed to convert document. Make sure LibreOffice is installed and in your system PATH.");
  }
}
