import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://bloompdf.app"),
  title: {
    default: "BloomPDF — 100% Free & Open Source PDF Editor & Tools Suite",
    template: "%s | BloomPDF (Open Source PDF)",
  },
  description:
    "BloomPDF is the 100% free, private, open source PDF editor & tool suite. Merge, split, compress, edit, OCR, convert, and protect PDF files directly in your web browser with zero file uploads.",
  keywords: [
    "open source PDF tool",
    "open source PDF editor",
    "free open source PDF tools",
    "open source PDF merger",
    "open source PDF compressor",
    "self hosted PDF editor",
    "open source PDF suite",
    "BloomPDF",
    "bloompdf.app",
    "free PDF editor",
    "merge PDF online free",
    "compress PDF without uploading",
    "split PDF",
    "OCR PDF online",
    "edit PDF free",
    "iLovePDF open source alternative",
    "Adobe Acrobat free alternative",
    "private open source PDF tools",
  ],
  authors: [{ name: "BloomPDF Team & Stemlen", url: "https://bloompdf.app" }],
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
    title: "BloomPDF — 100% Free & Open Source Online PDF Editor & Tools",
    description:
      "Open source, 100% private, browser-based PDF toolkit. Merge, split, compress, edit, OCR, and convert PDFs directly in your browser. Free alternative to iLovePDF & Adobe Acrobat.",
    url: "https://bloompdf.app",
    siteName: "BloomPDF — Open Source PDF Engine",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://bloompdf.app/logo.png",
        width: 512,
        height: 512,
        alt: "BloomPDF Logo — Open Source PDF Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BloomPDF — Free & Open Source PDF Editor & Tools",
    description:
      "100% Open Source PDF editor & tools running entirely in your browser. Private, fast, zero server uploads.",
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
    "description": "100% Free & Open Source Online PDF Editor & Document Processing Platform.",
    "sameAs": [
      "https://bloompdf.app",
      "https://github.com/stemlen/bloompdf",
    ],
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "BloomPDF — Open Source PDF Tools",
    "url": "https://bloompdf.app",
    "description": "100% Free & Open Source Browser-Based PDF Suite.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://bloompdf.app/#tools?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "BloomPDF",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All (Web Browser)",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "isAccessibleForFree": true,
    "license": "https://opensource.org/licenses/MIT",
    "codeRepository": "https://github.com/stemlen/bloompdf",
    "description": "100% Free & Open Source in-browser PDF Editor and conversion toolkit with zero file uploads.",
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-DT90DQL3XY"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-DT90DQL3XY');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
        />
      </head>
      <body className="bg-background text-foreground min-h-screen flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TopNav />
          <main className="flex-1 pt-[58px]">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
