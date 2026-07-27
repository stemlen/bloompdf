export interface FAQItem {
  question: string;
  answer: string;
}

export interface HowToStep {
  name: string;
  text: string;
}

export interface ToolSeoData {
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  howToSteps: HowToStep[];
  faqs: FAQItem[];
  competitorComparison: {
    bloompdf: string;
    ilovepdf: string;
    adobeAcrobat: string;
  };
}

export const defaultCompetitorComparison = {
  bloompdf: "100% Free & Open Source on GitHub. In-browser execution ensures files never leave your device. Unlimited file sizes, 0 wait times, no paywalls or watermarks.",
  ilovepdf: "Closed-source, server-side processing requiring uploads of confidential files. Strict file size limits and daily task quotas on free tier.",
  adobeAcrobat: "Proprietary software with expensive monthly subscriptions ($19.99/mo). Requires account registration or cloud uploads.",
};

export const seoDataMap: Record<string, ToolSeoData> = {
  "merge-pdf": {
    seoTitle: "Merge PDF Files Online Free — Fast & 100% Secure | BloomPDF",
    metaDescription:
      "Combine multiple PDF files into one single document online with BloomPDF. 100% private in-browser processing — files are never uploaded to any server. Free alternative to iLovePDF & Adobe Acrobat.",
    keywords: [
      "merge PDF online",
      "combine PDF files",
      "join PDF documents",
      "free PDF merger",
      "merge PDF without uploading",
      "BloomPDF merge",
      "iLovePDF alternative merge",
    ],
    howToSteps: [
      {
        name: "Upload PDF Files",
        text: "Select or drag & drop the PDF files you want to combine into the BloomPDF merge area.",
      },
      {
        name: "Reorder Pages & Files",
        text: "Drag and drop the uploaded PDF thumbnails to arrange them in your preferred reading order.",
      },
      {
        name: "Merge and Download",
        text: "Click 'Merge PDF' to instantly join your documents client-side and download the merged PDF file.",
      },
    ],
    faqs: [
      {
        question: "Is BloomPDF Merge PDF free to use?",
        answer:
          "Yes, BloomPDF is 100% free with no file size limits, daily limits, registration, or watermarks.",
      },
      {
        question: "How is BloomPDF safer than iLovePDF or Smallpdf?",
        answer:
          "Unlike iLovePDF and Smallpdf which upload your files to remote servers, BloomPDF processes your PDFs entirely inside your web browser using WebAssembly and pure TypeScript. Your files never touch any external server, guaranteeing total privacy.",
      },
      {
        question: "Can I reorder individual pages before merging?",
        answer:
          "Yes! You can drag and drop PDF files to change their sequence, or use our Organize PDF tool for page-level drag and drop.",
      },
      {
        question: "Does BloomPDF reduce quality when merging PDFs?",
        answer:
          "No. BloomPDF preserves 100% of original vector graphics, text formatting, embedded fonts, and image resolutions during the merge process.",
      },
    ],
    competitorComparison: {
      bloompdf: "Instant client-side merging with zero server uploads. Unlimited file sizes and 100% free.",
      ilovepdf: "Uploads PDFs to cloud servers. Free version limits number of files and total file size.",
      adobeAcrobat: "Requires paid subscription ($19.99/mo) or signing in to access web tools.",
    },
  },

  "compress-pdf": {
    seoTitle: "Compress PDF Online Free — Reduce PDF File Size | BloomPDF",
    metaDescription:
      "Shrink your PDF file size without losing quality using BloomPDF. Client-side optimization keeps your files private. Better than iLovePDF & Adobe Acrobat.",
    keywords: [
      "compress PDF online",
      "reduce PDF size",
      "shrink PDF file",
      "PDF size reducer",
      "compress PDF free",
      "BloomPDF compress",
    ],
    howToSteps: [
      {
        name: "Choose Your PDF",
        text: "Select the PDF file you wish to compress from your device.",
      },
      {
        name: "Select Compression Level",
        text: "Pick your desired balance between image resolution and file size reduction (Recommended, Extreme, or Low).",
      },
      {
        name: "Download Compressed PDF",
        text: "Click 'Compress PDF' to process the document and immediately save the optimized file.",
      },
    ],
    faqs: [
      {
        question: "Will compressing a PDF degrade text quality?",
        answer:
          "No. Text and vector graphics in your PDF remain crisp and searchable. Compression targets embedded images and redundant data structures.",
      },
      {
        question: "Can I compress password-protected PDFs?",
        answer:
          "Yes! You can unlock the PDF first using BloomPDF's Unlock PDF tool, then compress it seamlessly.",
      },
      {
        question: "Why choose BloomPDF over Adobe Acrobat for compression?",
        answer:
          "BloomPDF offers instant compression in your browser without requiring account creation, subscription fees, or software installation.",
      },
    ],
    competitorComparison: {
      bloompdf: "Zero server storage. Smart client-side raster & stream compression. Free & unlimited.",
      ilovepdf: "Uploads files to remote servers. Retains files for 2 hours on server storage.",
      adobeAcrobat: "Requires Acrobat Pro license or free tier email registration with strict quota.",
    },
  },

  "split-pdf": {
    seoTitle: "Split PDF Online Free — Extract Pages from PDF | BloomPDF",
    metaDescription:
      "Split large PDF files into separate documents by page range, every N pages, or extract all pages. 100% secure in-browser PDF splitter by BloomPDF.",
    keywords: [
      "split PDF online",
      "extract pages from PDF",
      "separate PDF pages",
      "PDF splitter free",
      "divide PDF",
    ],
    howToSteps: [
      {
        name: "Upload Target PDF",
        text: "Upload the PDF document you want to split.",
      },
      {
        name: "Set Split Parameters",
        text: "Specify page numbers (e.g. 1-3, 5, 8-12) or choose 'Extract all pages'.",
      },
      {
        name: "Extract & Download",
        text: "Click 'Split PDF' to generate separate PDF files or a packaged ZIP archive.",
      },
    ],
    faqs: [
      {
        question: "Can I extract specific page ranges from a PDF?",
        answer:
          "Yes! You can enter custom page numbers like '1-5, 8, 11-15' to extract exactly what you need.",
      },
      {
        question: "Are my documents saved on any server after splitting?",
        answer:
          "Never. BloomPDF runs 100% inside your Web browser memory. Your files are processed locally and discarded immediately upon closing the page.",
      },
    ],
    competitorComparison: defaultCompetitorComparison,
  },

  "edit-pdf": {
    seoTitle: "Free Online PDF Editor — Edit Text, Images & Annotations | BloomPDF",
    metaDescription:
      "Edit PDF documents directly in your browser. Add text, draw shapes, insert signatures, highlight text, and annotate PDFs with BloomPDF. Free Acrobat alternative.",
    keywords: [
      "edit PDF online",
      "free PDF editor",
      "annotate PDF",
      "add text to PDF",
      "draw on PDF",
      "Adobe Acrobat alternative free",
    ],
    howToSteps: [
      {
        name: "Open PDF in Editor",
        text: "Upload your document to launch the BloomPDF Interactive Canvas Editor.",
      },
      {
        name: "Add Text, Drawings & Annotations",
        text: "Use the toolbar to insert text boxes, draw shapes, highlight sentences, or insert images.",
      },
      {
        name: "Export Edited PDF",
        text: "Click 'Export PDF' to download your edited file instantly.",
      },
    ],
    faqs: [
      {
        question: "Is BloomPDF a true free alternative to Adobe Acrobat Pro?",
        answer:
          "Yes. BloomPDF lets you edit, annotate, fill forms, draw, and highlight PDFs in your web browser for free without paywalls.",
      },
      {
        question: "Does editing a PDF in BloomPDF alter the original formatting?",
        answer:
          "No. BloomPDF overlays new elements smoothly onto the original vector layer while keeping underlying layout intact.",
      },
    ],
    competitorComparison: {
      bloompdf: "Full-featured browser PDF editor. No watermark, no registration, 100% free.",
      ilovepdf: "Basic annotation features; heavy text editing requires paid account.",
      adobeAcrobat: "Editing text requires Adobe Acrobat Pro ($19.99/month).",
    },
  },

  "pdf-to-word": {
    seoTitle: "Convert PDF to Word DOCX Online Free — Editable Text | BloomPDF",
    metaDescription:
      "Convert PDF files into fully editable Microsoft Word (.docx) documents. High accuracy layout preservation with BloomPDF. 100% private in-browser conversion.",
    keywords: [
      "convert PDF to Word",
      "PDF to DOCX online",
      "editable PDF to Word",
      "free PDF to Word converter",
      "BloomPDF to word",
    ],
    howToSteps: [
      {
        name: "Select PDF Document",
        text: "Upload the PDF you want to convert to Microsoft Word format.",
      },
      {
        name: "Process File",
        text: "BloomPDF parses text streams, tables, and images into Word-compatible elements.",
      },
      {
        name: "Download DOCX",
        text: "Save your newly created editable .docx document.",
      },
    ],
    faqs: [
      {
        question: "Will the formatting of my PDF remain accurate in Word?",
        answer:
          "BloomPDF intelligently detects paragraphs, headings, tables, and images to maintain structure in the output DOCX.",
      },
      {
        question: "Can I convert scanned PDFs to Word?",
        answer:
          "Yes! For scanned documents, use BloomPDF OCR PDF first to recognize text, then export to Word.",
      },
    ],
    competitorComparison: defaultCompetitorComparison,
  },

  "word-to-pdf": {
    seoTitle: "Convert Word DOCX to PDF Online Free | BloomPDF",
    metaDescription:
      "Transform Microsoft Word (.doc, .docx) documents into crisp PDF files instantly with BloomPDF. High quality typography and layout preservation.",
    keywords: [
      "convert Word to PDF",
      "DOCX to PDF online",
      "Word document to PDF free",
      "BloomPDF word to pdf",
    ],
    howToSteps: [
      {
        name: "Upload DOCX File",
        text: "Choose your Microsoft Word document.",
      },
      {
        name: "Convert to PDF",
        text: "Click 'Convert to PDF' to process the document.",
      },
      {
        name: "Download PDF",
        text: "Download your newly formatted PDF file.",
      },
    ],
    faqs: [
      {
        question: "Is there any size limit for Word file conversion?",
        answer: "No, BloomPDF allows converting large Word documents free of charge.",
      },
    ],
    competitorComparison: defaultCompetitorComparison,
  },

  "ocr-pdf": {
    seoTitle: "OCR PDF Online Free — Make Scanned PDFs Searchable | BloomPDF",
    metaDescription:
      "Apply Optical Character Recognition (OCR) to scanned PDFs and images online with BloomPDF. Extract text or create searchable PDFs in 9+ languages.",
    keywords: [
      "OCR PDF online",
      "searchable PDF converter",
      "extract text from scanned PDF",
      "free OCR tool",
      "tesseract PDF OCR",
    ],
    howToSteps: [
      {
        name: "Upload Scanned PDF",
        text: "Select your scanned document or image PDF.",
      },
      {
        name: "Select Language",
        text: "Choose the primary language of the text (English, Spanish, French, German, etc.).",
      },
      {
        name: "Run OCR & Download",
        text: "Click 'Run OCR' to embed a searchable text layer and download the final PDF.",
      },
    ],
    faqs: [
      {
        question: "How does BloomPDF OCR preserve my document privacy?",
        answer:
          "BloomPDF runs Tesseract OCR engine directly inside your browser via WebAssembly (WASM). Your scanned document is processed locally on your machine without being sent to cloud servers.",
      },
      {
        question: "Which languages are supported?",
        answer:
          "BloomPDF supports English, Spanish, French, German, Chinese, Arabic, Hindi, Portuguese, and Japanese.",
      },
    ],
    competitorComparison: {
      bloompdf: "WASM-powered client-side OCR. 100% private, free for unlimited pages.",
      ilovepdf: "OCR is restricted to paid premium subscribers.",
      adobeAcrobat: "Requires Adobe Acrobat Pro subscription ($19.99/mo).",
    },
  },

  "protect-pdf": {
    seoTitle: "Protect PDF with Password Online Free — Encrypt PDF | BloomPDF",
    metaDescription:
      "Secure your confidential PDF files with 128-bit or 256-bit AES encryption. Set owner & user passwords to restrict printing and editing with BloomPDF.",
    keywords: [
      "protect PDF password",
      "encrypt PDF online",
      "lock PDF file",
      "secure PDF document",
      "free PDF password protector",
    ],
    howToSteps: [
      {
        name: "Select PDF File",
        text: "Upload the PDF you want to protect with a password.",
      },
      {
        name: "Set Password",
        text: "Enter a strong password to lock the document.",
      },
      {
        name: "Encrypt & Download",
        text: "Click 'Protect PDF' to apply encryption and save the protected PDF.",
      },
    ],
    faqs: [
      {
        question: "What encryption standard does BloomPDF use?",
        answer: "BloomPDF uses industry-standard 128-bit and 256-bit AES encryption to lock your files.",
      },
      {
        question: "Can someone decrypt my password without the key?",
        answer: "No. Without the correct password, AES encrypted PDFs cannot be opened or read.",
      },
    ],
    competitorComparison: defaultCompetitorComparison,
  },

  "unlock-pdf": {
    seoTitle: "Unlock PDF Password Online Free — Remove PDF Restrictions | BloomPDF",
    metaDescription:
      "Remove password security and restrictions from protected PDF files online using BloomPDF. 100% private client-side decryption.",
    keywords: [
      "unlock PDF password",
      "remove PDF password",
      "decrypt PDF online",
      "unlock security PDF",
      "BloomPDF unlock",
    ],
    howToSteps: [
      {
        name: "Upload Protected PDF",
        text: "Select your password-protected PDF document.",
      },
      {
        name: "Enter Password",
        text: "Provide the valid document password.",
      },
      {
        name: "Remove Protection",
        text: "Click 'Unlock PDF' to download an unencrypted version of your document.",
      },
    ],
    faqs: [
      {
        question: "Do I need the password to unlock my PDF?",
        answer: "Yes, you must provide the authorized password to decrypt legally protected PDF files.",
      },
    ],
    competitorComparison: defaultCompetitorComparison,
  },
};

export function getToolSeoData(slug: string, fallbackName: string, fallbackDesc: string): ToolSeoData {
  if (seoDataMap[slug]) {
    return seoDataMap[slug];
  }

  // Generative Fallback for tools without custom manual entries
  const formattedName = fallbackName || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  
  return {
    seoTitle: `${formattedName} Online Free — 100% Open Source & Private | BloomPDF`,
    metaDescription: `${fallbackDesc || `Use ${formattedName} online with BloomPDF.`} 100% free & open source in-browser PDF processing with zero server uploads. The open-source alternative to iLovePDF and Adobe Acrobat.`,
    keywords: [
      "open source PDF tool",
      "open source PDF editor",
      `${slug.replace(/-/g, " ")}`,
      `${formattedName} free`,
      `${formattedName} open source`,
      `${formattedName} online`,
      "BloomPDF open source tool",
      "free open source PDF tools",
    ],
    howToSteps: [
      {
        name: `Upload Files to ${formattedName}`,
        text: `Select or drag and drop your files into the ${formattedName} workspace.`,
      },
      {
        name: "Configure Tool Options",
        text: "Adjust settings, layout, page ranges, or compression levels as needed.",
      },
      {
        name: `Process & Download`,
        text: `Click the process button to execute ${formattedName} instantly in your browser and download the resulting file.`,
      },
    ],
    faqs: [
      {
        question: `Is ${formattedName} on BloomPDF completely free and open source?`,
        answer: `Yes! ${formattedName} on BloomPDF is 100% free and open source with unlimited file usage, no registration, no watermarks, and open source transparency on GitHub.`,
      },
      {
        question: `How does BloomPDF ensure my files stay private when using ${formattedName}?`,
        answer: `BloomPDF executes all PDF processing directly inside your device's web browser using open-source TypeScript and WebAssembly engines. Your files are never uploaded to any remote servers.`,
      },
      {
        question: `How does BloomPDF compare to iLovePDF and Adobe Acrobat for ${formattedName}?`,
        answer: `BloomPDF is 100% open source, provides zero-upload privacy, no file size caps, and instant speed without requiring paid subscriptions or software installation.`,
      },
    ],
    competitorComparison: defaultCompetitorComparison,
  };
}
