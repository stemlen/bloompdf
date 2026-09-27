/**
 * protectPdf.ts
 * Client-side PDF password protection using @cantoo/pdf-lib's built-in
 * AES-256 (ISO 32000-2, V=5 / R=6) security handler.
 *
 * Everything runs in the browser: the file and the password never leave the
 * user's device.
 */

import { PDFDocument, EncryptedPDFError } from "@cantoo/pdf-lib";

export interface ProtectOptions {
  /** Password required to open the document. */
  userPassword: string;
  /**
   * Password granting full (owner) access. Defaults to the user password so
   * that whoever knows the open password keeps full control of the document.
   */
  ownerPassword?: string;
}

async function toBytes(input: File | Blob | Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(await input.arrayBuffer());
}

/**
 * Encrypts a PDF with AES-256 and returns the protected bytes.
 * @throws Error with a user-friendly message for encrypted or corrupt input.
 */
export async function protectPDF(
  input: File | Blob | Uint8Array | ArrayBuffer,
  { userPassword, ownerPassword }: ProtectOptions
): Promise<Uint8Array> {
  if (!userPassword) throw new Error("Password cannot be empty.");

  const bytes = await toBytes(input);

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (err) {
    if (err instanceof EncryptedPDFError || /encrypt/i.test(String((err as Error)?.message))) {
      throw new Error(
        "This PDF is already password-protected. Unlock it first, then protect it with a new password."
      );
    }
    throw new Error("Could not read this PDF. The file may be corrupt or not a PDF.");
  }

  doc.encrypt({
    userPassword,
    ownerPassword: ownerPassword || userPassword,
    algorithm: "AES-256",
    // The UI only promises an *open* password, so readers who know it keep
    // every permission (matches owner == user password semantics).
    permissions: {
      printing: "highResolution",
      modifying: true,
      copying: true,
      annotating: true,
      fillingForms: true,
      contentAccessibility: true,
      documentAssembly: true,
    },
  });

  return doc.save();
}
