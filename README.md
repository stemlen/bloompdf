# 📄 BloomPDF - All-in-One PDF Editor & Utility Suite

BloomPDF is a modern, fast, and feature-rich web application for editing, converting, organizing, optimizing, and securing PDF documents. Built with **Next.js 15**, **React 19**, and **Tailwind CSS**, it features client-side processing for ultimate privacy alongside powerful server-side API conversions.

---

## ✨ Features & Tools

### 📁 Organize PDF
- **Merge PDF**: Combine multiple PDF files into a single seamless document with drag-and-drop reordering.
- **Split PDF**: Divide PDFs by custom page ranges, extract every page separately, or split every $N$ pages.
- **Remove Pages**: Easily delete unwanted pages from your document.
- **Extract Pages**: Pull specific page ranges out into a new standalone PDF.
- **Organize PDF**: Visual page management grid to reorder, rotate, and delete pages.
- **Scan to PDF**: Convert scanned images (JPG, PNG, TIFF, BMP) into clean PDF documents.

### ⚡ Optimize & Intelligence
- **Compress PDF**: Reduce file size while preserving document quality with custom compression levels.
- **Repair PDF**: Structural analysis with live Health Score (0–100) measurements and client-side recovery.
- **OCR PDF**: Client-side Optical Character Recognition using **Tesseract.js** (multilingual support, searchable PDF generation, and plain text extraction).

### 🔄 Convert to PDF
- **JPG / Image to PDF**: Turn JPG, PNG, WEBP, and GIF images into formatted PDFs.
- **Word to PDF**: Convert `.docx` and `.doc` files to PDF.
- **PowerPoint to PDF**: Export `.pptx` and `.ppt` presentations into PDF slides.
- **Excel to PDF**: Convert `.xlsx` and `.xls` spreadsheets into clean tabular PDFs.
- **HTML to PDF**: Convert uploaded HTML files or web page URLs directly into PDF documents.
- **Markdown to PDF**: Format `.md` text into styled PDF files with headings, tables, and code highlighting.
- **Text to PDF**: Convert plain text documents (`.txt`) with custom font and layout controls.

### 🔄 Convert from PDF
- **PDF to JPG**: Export PDF pages as high-quality JPG images or ZIP archives.
- **PDF to Word**: Convert PDFs into editable `.docx` Word documents.
- **PDF to PowerPoint**: Transform PDFs into editable `.pptx` presentation slides.
- **PDF to Excel**: Extract PDF tables into editable `.xlsx` spreadsheets.
- **PDF to PDF/A**: Standardize PDFs into PDF/A-1b, PDF/A-2b, or PDF/A-3b format for long-term archiving.

### ✏️ Edit & Annotate
- **Edit PDF**: Full-featured interactive canvas editor to add text, images, shapes, and annotations.
- **Rotate PDF**: Turn PDF pages 90°, 180°, or 270° (all pages, odd/even, or specific ranges).
- **Add Page Numbers**: Custom header/footer page numbering with position and font styling.
- **Add Watermark**: Apply text or image watermarks with customizable opacity, rotation, and positioning.
- **Crop PDF**: Trim margins and crop custom sections from PDF pages.

### 🔒 Security & Forms
- **PDF Forms**: Fill out fillable forms, insert electronic signatures, and manage interactive form fields.
- **Protect PDF**: Secure PDFs with password encryption and access permissions.
- **Unlock PDF**: Remove password protection from encrypted PDF files.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/), Radix UI Primitives, Lucide Icons, Framer Motion, Next Themes (Dark Mode support)
- **PDF Processing**: `pdf-lib`, `pdfjs-dist`, `@pdfsmaller/pdf-encrypt`, `cryptpdf`
- **OCR & Document Engine**: `tesseract.js`, `libreoffice-convert`, `puppeteer`, `exceljs`, `marked`
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`

---

## 📁 Project Structure

```text
.
├── public/                     # Favicons, logo, and static assets
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/                # Conversion API endpoints (Word, Excel, PPTX, HTML, etc.)
│   │   ├── tools/[slug]/       # Dynamic tool workspace pages
│   │   ├── globals.css         # Tailwind and global styles
│   │   ├── layout.tsx          # Main application layout & Theme Provider
│   │   └── page.tsx            # Dashboard / Homepage
│   ├── components/
│   │   ├── dashboard/          # Dashboard grid, tool cards, categories, recent/favorites
│   │   ├── layout/             # Sidebar, TopNav, MobileNav, Footer, ThemeToggle
│   │   ├── providers/          # React context providers
│   │   └── tools/              # Individual tool workspace & modal components
│   └── lib/
│       ├── hooks/              # Custom hooks (useFavorites, useRecent, useSearch)
│       ├── tools.ts            # Tool metadata configuration & registry
│       ├── categories.ts       # Category metadata definition
│       └── pdfRender.ts        # Core PDF utilities (rendering, page manipulation, etc.)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or v20.x+ recommended
- **npm** / **yarn** / **pnpm** / **bun**
- *(Optional)* **LibreOffice**: Installed locally if running server-side Word/PPTX/Excel conversions via `libreoffice-convert`.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/stemlen/PDF-Editor.git
   cd PDF-Editor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📜 Available Scripts

In the project directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Builds the application for production |
| `npm run start` | Runs the compiled production build |
| `npm run lint` | Runs ESLint to check for code quality and lint errors |

---

## 🔒 Privacy & Security

BloomPDF prioritizes user privacy. Core tools (such as merging, splitting, rotating, annotating, page extraction, and client-side OCR) run directly inside your browser using WebAssembly and client-side JavaScript. Files processed locally never leave your device.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/stemlen/PDF-Editor/issues).

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
