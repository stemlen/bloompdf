import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://bloompdf.app"),
  title: {
    default: "BloomPDF — 100% Free & Private Online PDF Editor & Tools",
    template: "%s | BloomPDF",
  },
  description:
    "BloomPDF is the 100% private, free alternative to iLovePDF and Adobe Acrobat. Merge, split, compress, edit, OCR, convert, and protect PDF files directly in your web browser with zero file uploads.",
  keywords: [
    "BloomPDF",
    "bloompdf.app",
    "free PDF editor",
    "merge PDF online free",
    "compress PDF without uploading",
    "split PDF",
    "OCR PDF online",
    "edit PDF free",
    "iLovePDF alternative",
    "Adobe Acrobat free alternative",
    "private PDF tools",
  ],
  authors: [{ name: "BloomPDF Team", url: "https://bloompdf.app" }],
  creator: "BloomPDF",
  publisher: "BloomPDF",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  alternates: {
    canonical: "https://bloompdf.app",
  },
  openGraph: {
    title: "BloomPDF — 100% Free & Private Online PDF Editor & Tools",
    description:
      "Merge, split, compress, edit, OCR, and convert PDF files directly in your browser. 100% private with zero file uploads. Free alternative to iLovePDF & Adobe Acrobat.",
    url: "https://bloompdf.app",
    siteName: "BloomPDF",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://bloompdf.app/logo.png",
        width: 512,
        height: 512,
        alt: "BloomPDF Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BloomPDF — 100% Free & Private Online PDF Tools",
    description:
      "Merge, split, compress, edit, and convert PDFs directly in your browser. 100% private with zero server uploads.",
    images: ["https://bloompdf.app/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Global Site & Organization Schema for Search & Answer Engines
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "BloomPDF",
    "url": "https://bloompdf.app",
    "logo": "https://bloompdf.app/logo.png",
    "description": "100% Private, Free Online PDF Editor & Document Processing Platform.",
    "sameAs": [
      "https://bloompdf.app",
    ],
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "BloomPDF",
    "url": "https://bloompdf.app",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://bloompdf.app/#tools?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />
      </head>
      <body className="bg-background text-foreground min-h-screen flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <TopNav />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
