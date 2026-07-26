export type OptionType =
  | "slider"
  | "select"
  | "text"
  | "number"
  | "radio"
  | "pagerange"
  | "switch";

export interface ToolOption {
  id: string;
  label: string;
  type: OptionType;
  defaultValue: string | number | boolean;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  description?: string;
}

export interface Tool {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  longDescription: string;
  categoryId: string;
  icon: string; // Lucide icon name
  acceptedTypes: string[];
  acceptMultiple: boolean;
  tags: string[];
  options: ToolOption[];
  maxFiles?: number;
  outputFormat: string;
  layoutType?: "workspace" | "form";
}

export const tools: Tool[] = [
  // ── Organize PDF ──────────────────────────────────────────────────────────
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    shortName: "Merge",
    description: "Combine multiple PDF files into a single document",
    longDescription:
      "Upload multiple PDF files and combine them into one seamless document. Drag and drop to reorder files before merging.",
    categoryId: "organize",
    icon: "Combine",
    acceptedTypes: [".pdf"],
    acceptMultiple: true,
    tags: ["merge", "combine", "join", "concatenate"],
    maxFiles: 20,
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [],
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    shortName: "Split",
    description: "Divide a PDF into multiple separate files",
    longDescription:
      "Split a PDF by page ranges, extract every page as a separate file, or split after every N pages.",
    categoryId: "organize",
    icon: "Scissors",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["split", "divide", "separate", "cut"],
    outputFormat: "ZIP",
    layoutType: "workspace",
    options: [
      {
        id: "split-mode",
        label: "Split Mode",
        type: "radio",
        defaultValue: "range",
        options: [
          { label: "By page range", value: "range" },
          { label: "Every N pages", value: "every" },
          { label: "Extract all pages", value: "all" },
        ],
      },
      {
        id: "page-range",
        label: "Page Ranges",
        type: "pagerange",
        defaultValue: "",
        placeholder: "e.g. 1-3, 5, 7-9",
        description: "Comma-separated page ranges to extract",
      },
    ],
  },
  {
    slug: "remove-pages",
    name: "Remove Pages",
    shortName: "Remove Pages",
    description: "Delete specific pages from your PDF",
    longDescription:
      "Select the pages you want to remove from your PDF. The rest will be saved as a new file.",
    categoryId: "organize",
    icon: "FileMinus",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["remove", "delete", "pages"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [
      {
        id: "pages",
        label: "Pages to Remove",
        type: "pagerange",
        defaultValue: "",
        placeholder: "e.g. 1, 3, 5-8",
        description: "Specify which pages to delete",
      },
    ],
  },
  {
    slug: "extract-pages",
    name: "Extract Pages",
    shortName: "Extract Pages",
    description: "Pull out specific pages into a new PDF",
    longDescription:
      "Extract a selection of pages from your PDF into a new, standalone document.",
    categoryId: "organize",
    icon: "FileOutput",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["extract", "pages", "select"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [
      {
        id: "pages",
        label: "Pages to Extract",
        type: "pagerange",
        defaultValue: "",
        placeholder: "e.g. 2-5, 8, 10",
        description: "Specify which pages to keep",
      },
    ],
  },
  {
    slug: "organize-pdf",
    name: "Organize PDF",
    shortName: "Organize",
    description: "Reorder and rotate pages visually",
    longDescription:
      "Drag and drop to reorder pages, rotate individual pages, and delete unwanted ones — all in a visual editor.",
    categoryId: "organize",
    icon: "LayoutGrid",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["organize", "reorder", "rearrange", "pages"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [],
  },
  {
    slug: "scan-to-pdf",
    name: "Scan to PDF",
    shortName: "Scan to PDF",
    description: "Convert scanned images into a PDF document",
    longDescription:
      "Upload scanned images (JPG, PNG, TIFF) and convert them into a clean, searchable PDF.",
    categoryId: "organize",
    icon: "Scan",
    acceptedTypes: [".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp"],
    acceptMultiple: true,
    tags: ["scan", "image", "jpg", "png", "convert"],
    maxFiles: 30,
    outputFormat: "PDF",
    options: [
      {
        id: "orientation",
        label: "Page Orientation",
        type: "select",
        defaultValue: "auto",
        options: [
          { label: "Auto detect", value: "auto" },
          { label: "Portrait", value: "portrait" },
          { label: "Landscape", value: "landscape" },
        ],
      },
      {
        id: "margin",
        label: "Page Margin",
        type: "select",
        defaultValue: "none",
        options: [
          { label: "No margin", value: "none" },
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
        ],
      },
    ],
  },

  // ── Optimize PDF ──────────────────────────────────────────────────────────
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    shortName: "Compress",
    description: "Reduce PDF file size while maintaining quality",
    longDescription:
      "Shrink your PDF file size for easy sharing. Choose your compression level to balance quality and file size.",
    categoryId: "optimize",
    icon: "Minimize2",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["compress", "reduce", "size", "optimize", "shrink"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [
      {
        id: "quality",
        label: "Compression Level",
        type: "radio",
        defaultValue: "recommended",
        options: [
          { label: "Extreme compression", value: "extreme" },
          { label: "Recommended", value: "recommended" },
          { label: "Less compression", value: "low" },
        ],
        description: "Higher compression = smaller file, lower quality",
      },
    ],
  },
  {
    slug: "repair-pdf",
    name: "Repair PDF",
    shortName: "Repair",
    description: "Fix corrupted or damaged PDF files",
    longDescription:
      "Analyse your PDF for real structural issues — missing headers, broken XRef tables, stream errors, and more. A live Health Score (0–100) is calculated from actual measurements. Then repair and rebuild the document client-side using multiple recovery strategies, and download a clean repaired PDF plus a detailed repair report.",
    categoryId: "optimize",
    icon: "Wrench",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["repair", "fix", "corrupted", "broken", "recover", "xref", "health"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [],

  },
  {
    slug: "ocr-pdf",
    name: "OCR PDF",
    shortName: "OCR",
    description: "Make scanned PDFs searchable and selectable",
    longDescription:
      "Apply client-side Optical Character Recognition (OCR) to scanned or image-based PDFs. Choose your language, select pages, pick your output mode (searchable PDF with hidden text layer, or plain text extraction), and apply image enhancements for best accuracy — all in your browser, no uploads.",
    categoryId: "intelligence",
    icon: "ScanText",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["ocr", "searchable", "text", "scan", "recognize", "extract", "scanned"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [
      {
        id: "language",
        label: "Document Language",
        type: "select",
        defaultValue: "eng",
        options: [
          { label: "English", value: "eng" },
          { label: "Spanish", value: "spa" },
          { label: "French", value: "fra" },
          { label: "German", value: "deu" },
          { label: "Chinese (Simplified)", value: "chi_sim" },
          { label: "Arabic", value: "ara" },
          { label: "Hindi", value: "hin" },
          { label: "Portuguese", value: "por" },
          { label: "Japanese", value: "jpn" },
        ],
      },
    ],
  },

  // ── Convert to PDF ────────────────────────────────────────────────────────
  {
    slug: "jpg-to-pdf",
    name: "JPG to PDF",
    shortName: "JPG → PDF",
    description: "Convert JPG and PNG images to PDF",
    longDescription:
      "Turn your images into a professional PDF. Upload multiple images and arrange them as pages.",
    categoryId: "convert-to",
    layoutType: "workspace",
    icon: "Image",
    acceptedTypes: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"],
    acceptMultiple: true,
    tags: ["jpg", "jpeg", "png", "image", "photo", "convert"],
    maxFiles: 30,
    outputFormat: "PDF",
    options: [
      {
        id: "orientation",
        label: "Page Orientation",
        type: "select",
        defaultValue: "auto",
        options: [
          { label: "Auto (fit image)", value: "auto" },
          { label: "Portrait", value: "portrait" },
          { label: "Landscape", value: "landscape" },
        ],
      },
      {
        id: "margin",
        label: "Margin",
        type: "select",
        defaultValue: "none",
        options: [
          { label: "No margin", value: "none" },
          { label: "Small (5mm)", value: "small" },
          { label: "Medium (10mm)", value: "medium" },
          { label: "Large (20mm)", value: "large" },
        ],
      },
    ],
  },
  {
    slug: "word-to-pdf",
    name: "Word to PDF",
    shortName: "Word → PDF",
    description: "Convert Word documents to PDF format",
    longDescription:
      "Convert .docx or .doc files to PDF while preserving formatting, fonts, and layout perfectly.",
    categoryId: "convert-to",
    layoutType: "workspace",
    icon: "FileText",
    acceptedTypes: [".doc", ".docx"],
    acceptMultiple: false,
    tags: ["word", "docx", "doc", "microsoft", "convert"],
    outputFormat: "PDF",
    options: [],
  },
  {
    slug: "powerpoint-to-pdf",
    name: "PowerPoint to PDF",
    shortName: "PPT → PDF",
    description: "Convert PowerPoint presentations to PDF",
    longDescription:
      "Export your .pptx or .ppt presentations to PDF, preserving all slides and design elements.",
    categoryId: "convert-to",
    layoutType: "workspace",
    icon: "Presentation",
    acceptedTypes: [".ppt", ".pptx"],
    acceptMultiple: false,
    tags: ["powerpoint", "ppt", "pptx", "presentation", "slides", "convert"],
    outputFormat: "PDF",
    options: [],
  },
  {
    slug: "excel-to-pdf",
    name: "Excel to PDF",
    shortName: "Excel → PDF",
    description: "Convert Excel spreadsheets to PDF",
    longDescription:
      "Convert .xlsx or .xls spreadsheets to PDF with accurate table formatting and cell layouts.",
    categoryId: "convert-to",
    layoutType: "workspace",
    icon: "FileSpreadsheet",
    acceptedTypes: [".xls", ".xlsx"],
    acceptMultiple: false,
    tags: ["excel", "xls", "xlsx", "spreadsheet", "convert"],
    outputFormat: "PDF",
    options: [],
  },
  {
    slug: "html-to-pdf",
    name: "HTML to PDF",
    shortName: "HTML → PDF",
    description: "Convert web pages and HTML files to PDF",
    longDescription:
      "Upload an HTML file or enter a URL to convert it to a clean, printable PDF document.",
    categoryId: "convert-to",
    layoutType: "workspace",
    icon: "Globe",
    acceptedTypes: [".html", ".htm"],
    acceptMultiple: false,
    tags: ["html", "web", "webpage", "url", "convert"],
    outputFormat: "PDF",
    options: [
      {
        id: "url",
        label: "Or enter a URL",
        type: "text",
        defaultValue: "",
        placeholder: "https://example.com",
        description: "Enter a webpage URL to convert instead of uploading a file",
      },
    ],
  },
  {
    slug: "markdown-to-pdf",
    name: "Markdown to PDF",
    shortName: "MD → PDF",
    description: "Convert Markdown documents to PDF",
    longDescription:
      "Upload a Markdown file or paste Markdown content directly to convert it into a professionally formatted PDF. Supports headings, tables, code blocks, and custom themes.",
    categoryId: "convert-to",
    layoutType: "workspace",
    icon: "FileText",
    acceptedTypes: [".md", ".markdown", ".txt"],
    acceptMultiple: false,
    tags: ["markdown", "md", "text", "convert", "pdf", "theme"],
    outputFormat: "PDF",
    options: [],
  },
  {
    slug: "text-to-pdf",
    name: "Text to PDF",
    shortName: "TXT → PDF",
    description: "Convert plain text to a formatted PDF",
    longDescription:
      "Type, paste, or upload plain text to create a clean, professionally formatted PDF. Customize fonts, spacing, alignment, and margins.",
    categoryId: "convert-to",
    layoutType: "workspace",
    icon: "FileText",
    acceptedTypes: [".txt", ".text"],
    acceptMultiple: false,
    tags: ["text", "txt", "convert", "pdf", "plain text"],
    outputFormat: "PDF",
    options: [],
  },

  // ── Convert from PDF ──────────────────────────────────────────────────────
  {
    slug: "pdf-to-jpg",
    name: "PDF to JPG",
    shortName: "PDF → JPG",
    description: "Convert PDF pages to JPG images",
    longDescription:
      "Export every page of your PDF as a high-quality JPG image. Download individually or as a ZIP archive.",
    categoryId: "convert-from",
    icon: "FileImage",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["jpg", "jpeg", "image", "export", "convert"],
    outputFormat: "ZIP (JPGs)",
    options: [
      {
        id: "quality",
        label: "Image Quality",
        type: "slider",
        defaultValue: 80,
        min: 10,
        max: 100,
        step: 5,
        description: "Higher quality = larger file size",
      },
      {
        id: "pages",
        label: "Pages to Convert",
        type: "radio",
        defaultValue: "all",
        options: [
          { label: "All pages", value: "all" },
          { label: "Custom range", value: "custom" },
        ],
      },
    ],
  },
  {
    slug: "pdf-to-word",
    name: "PDF to Word",
    shortName: "PDF → Word",
    description: "Convert PDF files to editable Word documents",
    longDescription:
      "Export your PDF as a .docx file with editable text, preserved formatting, and accurate layouts.",
    categoryId: "convert-from",
    icon: "FileEdit",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["word", "docx", "editable", "export", "convert"],
    outputFormat: "DOCX",
    options: [],
  },
  {
    slug: "pdf-to-powerpoint",
    name: "PDF to PowerPoint",
    shortName: "PDF → PPT",
    description: "Convert PDF to editable PowerPoint slides",
    longDescription:
      "Transform PDF presentations into editable .pptx slides, preserving layout and design elements.",
    categoryId: "convert-from",
    icon: "Presentation",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["powerpoint", "pptx", "slides", "export", "convert"],
    outputFormat: "PPTX",
    options: [],
  },
  {
    slug: "pdf-to-excel",
    name: "PDF to Excel",
    shortName: "PDF → Excel",
    description: "Convert PDF tables to Excel spreadsheets",
    longDescription:
      "Extract tables and data from your PDF into an editable Excel spreadsheet with accurate formatting.",
    categoryId: "convert-from",
    icon: "FileSpreadsheet",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["excel", "xlsx", "spreadsheet", "table", "data", "export", "convert"],
    outputFormat: "XLSX",
    options: [],
  },
  {
    slug: "pdf-to-pdfa",
    name: "PDF to PDF/A",
    shortName: "PDF → PDF/A",
    description: "Convert PDF to PDF/A for long-term archiving",
    longDescription:
      "Convert your PDF to the PDF/A standard for reliable, long-term archiving and compliance.",
    categoryId: "convert-from",
    icon: "Archive",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["pdfa", "archive", "compliance", "iso", "long-term"],
    outputFormat: "PDF/A",
    options: [
      {
        id: "version",
        label: "PDF/A Version",
        type: "select",
        defaultValue: "pdfa-1b",
        options: [
          { label: "PDF/A-1b (basic)", value: "pdfa-1b" },
          { label: "PDF/A-2b (recommended)", value: "pdfa-2b" },
          { label: "PDF/A-3b (attachments)", value: "pdfa-3b" },
        ],
      },
    ],
  },

  // ── Edit PDF ──────────────────────────────────────────────────────────────
  {
    slug: "edit-pdf",
    name: "Edit PDF",
    shortName: "Edit",
    description: "Add text, images, shapes, and annotations",
    longDescription:
      "Open your PDF in our editor to add text, images, draw shapes, highlight, and annotate freely.",
    categoryId: "edit",
    icon: "PenLine",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["edit", "annotate", "text", "draw", "highlight", "comment"],
    outputFormat: "PDF",
    options: [],
  },
  {
    slug: "rotate-pdf",
    name: "Rotate PDF",
    shortName: "Rotate",
    description: "Rotate pages in your PDF by any angle",
    longDescription:
      "Rotate all pages or selected pages in your PDF document — 90°, 180°, or 270° clockwise.",
    categoryId: "edit",
    icon: "RotateCw",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["rotate", "orientation", "turn", "pages"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [
      {
        id: "angle",
        label: "Rotation Angle",
        type: "radio",
        defaultValue: "90",
        options: [
          { label: "90° clockwise", value: "90" },
          { label: "180°", value: "180" },
          { label: "90° counter-clockwise", value: "270" },
        ],
      },
      {
        id: "pages",
        label: "Apply to",
        type: "radio",
        defaultValue: "all",
        options: [
          { label: "All pages", value: "all" },
          { label: "Odd pages only", value: "odd" },
          { label: "Even pages only", value: "even" },
          { label: "Custom range", value: "custom" },
        ],
      },
    ],
  },
  {
    slug: "add-page-numbers",
    name: "Add Page Numbers",
    shortName: "Page Numbers",
    description: "Insert page numbers into your PDF",
    longDescription:
      "Add professional page numbers to your PDF. Customize position, font size, and starting number.",
    categoryId: "edit",
    icon: "Hash",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["page numbers", "numbering", "footer", "header"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [
      {
        id: "position",
        label: "Position",
        type: "select",
        defaultValue: "bottom-center",
        options: [
          { label: "Bottom center", value: "bottom-center" },
          { label: "Bottom right", value: "bottom-right" },
          { label: "Bottom left", value: "bottom-left" },
          { label: "Top center", value: "top-center" },
          { label: "Top right", value: "top-right" },
          { label: "Top left", value: "top-left" },
        ],
      },
      {
        id: "start-number",
        label: "Starting Number",
        type: "number",
        defaultValue: 1,
        min: 1,
        max: 9999,
      },
      {
        id: "font-size",
        label: "Font Size",
        type: "slider",
        defaultValue: 12,
        min: 8,
        max: 24,
        step: 1,
      },
    ],
  },
  {
    slug: "add-watermark",
    name: "Add Watermark",
    shortName: "Watermark",
    description: "Stamp text or image watermarks on your PDF",
    longDescription:
      "Add a professional watermark to your PDF. Choose text content, font size, opacity, and position.",
    categoryId: "edit",
    icon: "Droplets",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["watermark", "stamp", "branding", "confidential"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [
      {
        id: "text",
        label: "Watermark Text",
        type: "text",
        defaultValue: "CONFIDENTIAL",
        placeholder: "Enter watermark text",
      },
      {
        id: "opacity",
        label: "Opacity",
        type: "slider",
        defaultValue: 30,
        min: 5,
        max: 100,
        step: 5,
        description: "Lower opacity = more transparent watermark",
      },
      {
        id: "position",
        label: "Position",
        type: "radio",
        defaultValue: "diagonal",
        options: [
          { label: "Diagonal (center)", value: "diagonal" },
          { label: "Center", value: "center" },
          { label: "Top-left", value: "top-left" },
          { label: "Bottom-right", value: "bottom-right" },
        ],
      },
    ],
  },
  {
    slug: "crop-pdf",
    name: "Crop PDF",
    shortName: "Crop",
    description: "Trim the margins and crop PDF pages",
    longDescription:
      "Remove unwanted white space or crop specific areas from your PDF pages.",
    categoryId: "edit",
    icon: "Crop",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["crop", "trim", "margin", "resize"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [
      {
        id: "top",
        label: "Top Margin (mm)",
        type: "number",
        defaultValue: 0,
        min: 0,
        max: 100,
        placeholder: "0",
      },
      {
        id: "bottom",
        label: "Bottom Margin (mm)",
        type: "number",
        defaultValue: 0,
        min: 0,
        max: 100,
        placeholder: "0",
      },
      {
        id: "left",
        label: "Left Margin (mm)",
        type: "number",
        defaultValue: 0,
        min: 0,
        max: 100,
        placeholder: "0",
      },
      {
        id: "right",
        label: "Right Margin (mm)",
        type: "number",
        defaultValue: 0,
        min: 0,
        max: 100,
        placeholder: "0",
      },
    ],
  },

  // ── Security ──────────────────────────────────────────────────────────────
  {
    slug: "pdf-forms",
    name: "PDF Forms",
    shortName: "Forms",
    description: "Fill, create, and manage interactive PDF forms",
    longDescription:
      "Open a PDF form to fill in fields, add signatures, and export a completed copy. Or create a new form from scratch.",
    categoryId: "security",
    icon: "ClipboardList",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["forms", "fill", "fields", "signature", "interactive"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [],
  },
  {
    slug: "protect-pdf",
    name: "Protect PDF",
    shortName: "Protect",
    description: "Secure your PDF with a password",
    longDescription:
      "Apply password protection and encryption to your PDF document to prevent unauthorized access. You can also configure specific document permissions.",
    categoryId: "security",
    icon: "Lock",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["protect", "secure", "password", "encrypt", "lock"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [],
  },
  {
    slug: "unlock-pdf",
    name: "Unlock PDF",
    shortName: "Unlock",
    description: "Remove password protection from PDF",
    longDescription:
      "Remove password security from your PDF documents so you can use them freely. Requires the original password.",
    categoryId: "security",
    icon: "Unlock",
    acceptedTypes: [".pdf"],
    acceptMultiple: false,
    tags: ["unlock", "decrypt", "password", "remove", "unprotect"],
    outputFormat: "PDF",
    layoutType: "workspace",
    options: [],
  },
];

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getToolsByCategory(categoryId: string): Tool[] {
  return tools.filter((t) => t.categoryId === categoryId);
}

export function searchTools(query: string): Tool[] {
  const q = query.toLowerCase().trim();
  if (!q) return tools;
  return tools.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q))
  );
}
