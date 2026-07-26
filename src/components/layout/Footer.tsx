import Link from "next/link";
import Image from "next/image";
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
              <a href="#" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-[#E8607A] hover:text-white transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-[#E8607A] hover:text-white transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-[#E8607A] hover:text-white transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-[#E8607A] hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Features Column */}
          <div className="col-span-1">
            <h4 className="text-[14px] font-bold text-foreground mb-4">Features</h4>
            <ul className="space-y-3">
              {[
                "Merge PDF", "Split PDF", "Compress PDF", "Organize PDF", 
                "OCR PDF", "Word to PDF", "Excel to PDF", "PowerPoint to PDF"
              ].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium">
                    {item}
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
                {["Help Center", "FAQs", "Contact Support", "Report a Bug"].map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-foreground mb-4">Contact</h4>
              <ul className="space-y-3">
                {["Email", "Business Inquiries", "Partnership Requests"].map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium">
                      {item}
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
              {["About BloomPDF", "Our Mission", "Careers", "Blog"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies & Legal Column */}
          <div className="col-span-1 flex flex-col gap-8">
            <div>
              <h4 className="text-[14px] font-bold text-foreground mb-4">Policies</h4>
              <ul className="space-y-3">
                {["Privacy Policy", "Cookie Policy", "Security Policy", "Data Protection"].map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-foreground mb-4">Legal</h4>
              <ul className="space-y-3">
                {["Terms & Conditions", "Terms of Service", "Disclaimer"].map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-[13px] text-muted-foreground hover:text-[#E8607A] transition-colors font-medium">
                      {item}
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
            © 2026 BloomPDF. All rights reserved.
          </p>
          <p className="text-[13px] text-muted-foreground font-medium flex items-center gap-1.5">
            Made with <span className="text-[#E8607A]">❤️</span> for document productivity.
          </p>
        </div>

      </div>
    </footer>
  );
}
