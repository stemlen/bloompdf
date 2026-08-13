import Link from "next/link";
import Image from "next/image";
import { getToolUrl } from "@/lib/tools";
import { 
  Github, 
  Linkedin, 
  Twitter, 
  Mail, 
} from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-card border-t border-border pt-16 pb-8">
      <div className="max-w-[1200px] mx-auto px-6">
        
        {/* Top Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2 flex flex-col">
            <Link href="/" className="flex items-center mb-6 overflow-visible">
              <Image
                src="/BloomPDF.png"
                alt="BloomPDF"
                width={400}
                height={100}
                className="h-28 sm:h-36 w-auto object-contain scale-150 origin-left"
              />
            </Link>
            <p className="text-[14px] text-muted-foreground mb-6 max-w-sm leading-relaxed">
              Smart, fast, and reliable PDF tools for every workflow. Simplify your document management with our premium suite of tools.
            </p>
            <div className="flex items-center gap-4 mt-auto">
              <a
                href="https://www.linkedin.com/company/stemlen/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-[#E8607A] hover:text-white transition-colors"
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/stemlen/bloompdf"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-[#E8607A] hover:text-white transition-colors"
                title="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="mailto:info@stemlen.com"
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-[#E8607A] hover:text-white transition-colors"
                title="Email: info@stemlen.com"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Features Column */}
          <div className="col-span-1">
            <h4 className="text-[14px] font-bold text-foreground mb-4">Features</h4>
            <ul className="space-y-3">
              {[
                { name: "Merge PDF", slug: "merge-pdf" },
                { name: "Split PDF", slug: "split-pdf" },
                { name: "Compress PDF", slug: "compress-pdf" },
                { name: "Organize PDF", slug: "organize-pdf" },
                { name: "OCR PDF", slug: "ocr-pdf" },
                { name: "Word to PDF", slug: "word-to-pdf" },
                { name: "Excel to PDF", slug: "excel-to-pdf" },
                { name: "PowerPoint to PDF", slug: "powerpoint-to-pdf" },
                { name: "Edit PDF", slug: "edit-pdf" },
                { name: "Protect PDF", slug: "protect-pdf" },
              ].map((item) => (
                <li key={item.slug}>
                  <Link href={getToolUrl(item.slug)} className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Contact Column */}
          <div className="col-span-1 flex flex-col gap-8">
            <div>
              <h4 className="text-[14px] font-bold text-foreground mb-4">Support</h4>
              <ul className="space-y-3">
                {[
                  { label: "Help Center", href: "/#faq" },
                  { label: "FAQs", href: "/#faq" },
                  { label: "All Tools", href: "/" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-foreground mb-4">Categories</h4>
              <ul className="space-y-3">
                {[
                  { label: "Organize PDF", href: "/#organize" },
                  { label: "Optimize PDF", href: "/#optimize" },
                  { label: "Convert to PDF", href: "/#convert-to" },
                  { label: "Convert from PDF", href: "/#convert-from" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* About Column */}
          <div className="col-span-1">
            <h4 className="text-[14px] font-bold text-foreground mb-4">About</h4>
            <ul className="space-y-3">
              {[
                { label: "About BloomPDF", href: "/about", external: false },
                { label: "Stemlen.com", href: "https://stemlen.com", external: true },
                { label: "Terms & Conditions", href: "/terms-and-conditions", external: false },
                { label: "Favorites", href: "/#favorites", external: false },
                { label: "Recent Tools", href: "/#recent", external: false },
              ].map((item) => (
                <li key={item.label}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium inline-flex items-center gap-1"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium inline-flex items-center gap-1"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Security & Features Column */}
          <div className="col-span-1 flex flex-col gap-8">
            <div>
              <h4 className="text-[14px] font-bold text-foreground mb-4">Security</h4>
              <ul className="space-y-3">
                {[
                  { label: "Protect PDF", href: "/tools/protect-pdf" },
                  { label: "Unlock PDF", href: "/tools/unlock-pdf" },
                  { label: "PDF Forms", href: "/tools/pdf-forms" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-foreground mb-4">Conversion</h4>
              <ul className="space-y-3">
                {[
                  { label: "JPG to PDF", href: "/tools/jpg-to-pdf" },
                  { label: "PDF to JPG", href: "/tools/pdf-to-jpg" },
                  { label: "HTML to PDF", href: "/tools/html-to-pdf" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-muted-foreground font-medium">
            © 2026 BloomPDF. A product by{" "}
            <a
              href="https://stemlen.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-semibold hover:text-[#E8607A] transition-colors underline underline-offset-4"
            >
              Stemlen
            </a>
            . All rights reserved.
          </p>
          <p className="text-[13px] text-muted-foreground font-medium flex items-center gap-1.5">
            Made with <span className="text-[#E8607A]">❤️</span> by Stemlen for document productivity.
          </p>
        </div>

      </div>
    </footer>
  );
}
