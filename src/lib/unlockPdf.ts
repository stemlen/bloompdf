/**
 * unlockPdf.ts
 * Client-side PDF decryption and restriction removal using @cantoo/pdf-lib.
 * Supports AES-256, AES-128, and RC4 password encryption profiles.
 * All processing happens entirely in the browser for maximum privacy and performance.
 */

import { PDFDocument } from "@cantoo/pdf-lib";

/**
 * Checks if a PDF file is encrypted / password-protected.
 * @param file The PDF File object
 * @returns boolean indicating if password is required
 */
export async function isPDFEncrypted(file: File): Promise<boolean> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    // Attempt loading with no password
    await PDFDocument.load(arrayBuffer);
    return false;
  } catch (error: any) {
    const message = error?.message?.toLowerCase() || "";
    if (message.includes("encrypted") || message.includes("password")) {
      return true;
    }
    // If it's another parsing error, return false
    return false;
  }
}

/**
 * Unlocks an encrypted PDF document using the provided password and
 * returns the unencrypted, restriction-free PDF as a Uint8Array.
 *
 * @param file      The original encrypted PDF File
 * @param password  The user or owner password
 * @returns         Uint8Array of the decrypted PDF
 */
export async function unlockPDF(
  file: File,
  password: string
): Promise<Uint8Array> {
  if (password === null || password === undefined) {
    throw new Error("Password cannot be empty.");
  }

  const arrayBuffer = await file.arrayBuffer();

  let loadedDoc: PDFDocument;
  try {
    loadedDoc = await PDFDocument.load(arrayBuffer, { password });
  } catch (error: any) {
    const msg = error?.message || "";
    const lower = msg.toLowerCase();

    if (
      lower.includes("password incorrect") ||
      lower.includes("incorrect password") ||
      lower.includes("invalid password") ||
      error?.name === "InvalidPasswordError"
    ) {
      throw new Error("Incorrect password. Please enter the correct password and try again.");
    }

    if (lower.includes("encrypted") || lower.includes("decrypt")) {
      throw new Error("Failed to decrypt PDF. Please check the password and try again.");
    }

    throw new Error(msg || "Failed to parse and unlock the PDF.");
  }

  // Create a clean document and copy all pages over to ensure that
  // all encryption dictionaries, handler objects, and restrictions are completely removed.
  try {
    const cleanDoc = await PDFDocument.create();
    const pageIndices = loadedDoc.getPageIndices();
    const copiedPages = await cleanDoc.copyPages(loadedDoc, pageIndices);
    for (const page of copiedPages) {
      cleanDoc.addPage(page);
    }

    // Preserve metadata if present
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
      // Ignore metadata copying errors if corrupted
    }

    return await cleanDoc.save({ useObjectStreams: false });
  } catch {
    // If page copying has edge case issues (e.g. form widgets), fallback to saving the unlocked loadedDoc directly
    return await loadedDoc.save({ useObjectStreams: false });
  }
}
