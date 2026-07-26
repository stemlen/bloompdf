import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  title: {
    default: "BloomPDF — Professional PDF Editor & Document Tools",
    template: "%s | BloomPDF",
  },
  description:
    "BloomPDF — a professional PDF editor and document platform. Merge, split, compress, convert, edit and manage your PDF files with ease.",
  keywords: [
    "PDF editor",
    "merge PDF",
    "split PDF",
    "compress PDF",
    "convert PDF",
    "PDF tools",
    "document platform",
    "BloomPDF",
  ],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
