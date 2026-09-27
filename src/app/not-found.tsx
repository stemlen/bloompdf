import Link from "next/link";
import type { Metadata } from "next";
import { FileSearch } from "lucide-react";

// 404s: no canonical (none is inherited from the layout any more) and noindex.
export const metadata: Metadata = {
  title: "Page Not Found | BloomPDF",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-24 px-5 text-center">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-6">
        <FileSearch className="w-7 h-7 text-muted-foreground" />
      </div>
      <h1 className="text-[24px] font-bold text-foreground mb-2">Page not found</h1>
      <p className="text-[14px] text-muted-foreground mb-8 max-w-sm">
        The page or tool you&apos;re looking for doesn&apos;t exist. Go back to the dashboard to find what you need.
      </p>
      <Link
        href="/"
        className="inline-flex items-center h-10 px-5 bg-[#E8607A] hover:bg-[#D94D6A] text-white rounded-lg font-semibold text-[14px] transition-colors shadow-sm"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
