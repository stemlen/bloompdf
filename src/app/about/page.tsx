import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Zap,
  Lock,
  Building2,
  ExternalLink,
  Globe,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  FileCheck,
  Server,
  Award,
  Users,
  Code2,
  Mail,
  Github,
  Linkedin
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | BloomPDF — A Product by Stemlen",
  description:
    "Learn about BloomPDF and Stemlen Private Limited. Discover our mission to provide private, high-performance, client-side document tools for everyone.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      
      {/* ═════════════════════════════════════════════════════════════════════
          1. HERO SECTION (Apple HIG Corporate Aesthetic)
      ═════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-card via-card/70 to-muted/40 border-b border-border pt-8 pb-20 sm:pt-14 sm:pb-28">
        {/* Subtle Ambient Radial Glows & Grid Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-primary/15 blur-[140px] rounded-full pointer-events-none animate-pulse-glow" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 text-center">
          
          {/* Logos Row: BloomPDF + Stemlen */}
          <div className="flex items-center justify-center gap-6 mb-8 flex-wrap">
            <div className="bg-card/90 border border-border rounded-2xl p-3 shadow-md flex items-center gap-3">
              <Image src="/logo.png" alt="BloomPDF Logo" width={220} height={60} className="h-14 sm:h-16 w-auto object-contain" priority />
            </div>
            <span className="text-[20px] font-bold text-muted-foreground">+</span>
            <div className="bg-black p-3 rounded-2xl border border-white/10 shadow-md flex items-center gap-3">
              <Image src="https://stemlen.com/logo.png" alt="Stemlen Logo" width={140} height={40} className="h-10 sm:h-12 w-auto object-contain" unoptimized priority />
            </div>
          </div>

          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 bg-card/90 border border-primary/20 backdrop-blur-xl rounded-full px-4 py-1.5 mb-8 shadow-xs">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-semibold text-foreground">
              STEMLEN PRIVATE LIMITED · 100% Free & Open Source
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[42px] sm:text-[64px] font-extrabold text-foreground leading-[1.08] tracking-tight mb-6 max-w-4xl mx-auto">
            Empowering Document Privacy.
            <br />
            <span className="bg-gradient-to-r from-primary via-rose-500 to-amber-500 bg-clip-text text-transparent">
              100% Free & Open Source.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-[18px] sm:text-[21px] text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-12 font-normal">
            BloomPDF is Stemlen&apos;s flagship open-source document platform engineered to deliver enterprise-grade PDF operations with 100% data privacy and zero server uploads.
          </p>

          {/* Key Metric Badges Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl p-5 shadow-xs text-left">
              <p className="text-[28px] font-extrabold text-foreground tracking-tight">29+</p>
              <p className="text-[12px] text-muted-foreground font-medium mt-1">Browser PDF Tools</p>
            </div>
            <div className="bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl p-5 shadow-xs text-left">
              <p className="text-[28px] font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">100%</p>
              <p className="text-[12px] text-muted-foreground font-medium mt-1">Free & Open Source</p>
            </div>
            <div className="bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl p-5 shadow-xs text-left">
              <p className="text-[28px] font-extrabold text-primary tracking-tight">0 Server</p>
              <p className="text-[12px] text-muted-foreground font-medium mt-1">File Uploads Required</p>
            </div>
            <div className="bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl p-5 shadow-xs text-left">
              <p className="text-[28px] font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">By Stemlen</p>
              <p className="text-[12px] text-muted-foreground font-medium mt-1">stemlen.com</p>
            </div>
          </div>

        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          2. THE STEMLEN STORY & CORPORATE MISSION
      ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 border-b border-border">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left side text (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-primary font-bold text-[13px] uppercase tracking-wider">
                <Globe className="w-4 h-4" />
                About STEMLEN
              </div>
              
              <h2 className="text-[32px] sm:text-[42px] font-bold text-foreground tracking-tight leading-tight">
                Architecting modern software for the digital frontier.
              </h2>
              
              <p className="text-[16px] text-muted-foreground leading-relaxed">
                Incorporated as <strong>STEMLEN PRIVATE LIMITED</strong> (CIN: U62011TS2026PTC210559), Stemlen is a forward-thinking technology enterprise headquartered in Telangana, India. Our core engineering focus centers on building high-impact software systems, scalable enterprise resource planning (ERP) platforms, and browser-first utility platforms.
              </p>

              <p className="text-[16px] text-muted-foreground leading-relaxed">
                We believe that software should be fast, elegant, and uncompromisingly respectful of user privacy. With products ranging from educational management infrastructure (<strong>School Stacker</strong>) to open-source AI project management platforms (<strong>Fairlx</strong>) and professional document workspaces (<strong>BloomPDF</strong>), Stemlen continues to push the boundaries of modern web technologies.
              </p>

              <div className="pt-4 flex flex-wrap gap-4">
                <a
                  href="https://stemlen.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-foreground text-background font-semibold text-[14px] px-6 py-3 rounded-xl shadow-md hover:opacity-90 transition-opacity"
                >
                  Visit Official Website (Stemlen.com)
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Right side glass card (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-card border border-border/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                
                {/* Stemlen Logo Header */}
                <div className="mb-6 pb-6 border-b border-border flex flex-col items-start gap-4">
                  <div className="bg-black p-3.5 rounded-2xl border border-white/10 shadow-md">
                    <Image
                      src="https://stemlen.com/logo.png"
                      alt="Stemlen Logo"
                      width={180}
                      height={50}
                      className="h-12 w-auto object-contain"
                      unoptimized
                    />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-extrabold text-foreground tracking-tight">STEMLEN PRIVATE LIMITED</h3>
                    <p className="text-[12px] text-muted-foreground font-medium mt-0.5">Reg. No: 210559 · Telangana, India</p>
                  </div>
                </div>

                <div className="space-y-4 text-[13.5px]">
                  <div className="flex justify-between py-2 border-b border-border/60">
                    <span className="text-muted-foreground font-medium">Company Status</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active Private Limited
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/60">
                    <span className="text-muted-foreground font-medium">Primary Industry</span>
                    <span className="font-semibold text-foreground">Software Engineering & Tech</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/60">
                    <span className="text-muted-foreground font-medium">Open Source Software</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">100% Free & Open Source</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground font-medium">Official Portal</span>
                    <a href="https://stemlen.com" target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">
                      stemlen.com
                    </a>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          3. BLOOMPDF ARCHITECTURE & PRIVACY MANIFESTO
      ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-muted/30 border-b border-border">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[13px] uppercase tracking-wider mb-3">
              <ShieldCheck className="w-4 h-4" />
              Privacy Manifesto
            </div>
            <h2 className="text-[32px] sm:text-[44px] font-extrabold text-foreground tracking-tight">
              Why BloomPDF is Built Different.
            </h2>
            <p className="text-[16.5px] text-muted-foreground mt-4 leading-relaxed">
              Traditional online PDF tools upload your sensitive legal contracts, tax documents, and personal IDs to third-party cloud servers. BloomPDF changes everything.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Pillar 1 */}
            <div className="bg-card border border-border/80 rounded-3xl p-8 shadow-xs hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 border border-blue-500/20 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-[19px] font-bold text-foreground mb-3">WebAssembly Engine</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                All PDF merging, splitting, OCR, compression, and rendering are performed locally inside your web browser using compiled WebAssembly modules for desktop-class speed.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-card border border-border/80 rounded-3xl p-8 shadow-xs hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-[19px] font-bold text-foreground mb-3">Zero Server Uploads</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Your PDF bytes never leave your machine memory. No data is stored, cached, or transferred across any external server infrastructure.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-card border border-border/80 rounded-3xl p-8 shadow-xs hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 border border-primary/20 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-[19px] font-bold text-foreground mb-3">Zero Friction & Watermarks</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Enjoy unlimited document operations without mandatory sign-ups, hidden paywalls, subscription tiers, or intrusive branding watermarks.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          4. STEMLEN PRODUCT ECOSYSTEM SHOWCASE
      ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 border-b border-border">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-[32px] sm:text-[44px] font-extrabold text-foreground tracking-tight">
              The Stemlen Product Ecosystem
            </h2>
            <p className="text-[16.5px] text-muted-foreground mt-3">
              Explore our portfolio of digital platforms designed for productivity and enterprise management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Product 1: BloomPDF */}
            <div className="bg-card border border-primary/30 rounded-3xl p-8 shadow-xs flex flex-col justify-between hover:shadow-xl transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center p-2 shadow-xs">
                    <Image src="/logo.png" alt="BloomPDF Logo" width={36} height={36} className="w-8 h-8 object-contain" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full">
                    PDF Toolkit
                  </span>
                </div>
                <h3 className="text-[22px] font-bold text-foreground mb-2">BloomPDF</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
                  The client-side PDF utility suite with 29+ tools for merging, editing, converting, compressing, and protecting documents.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-primary font-bold text-[14px] hover:underline"
              >
                Launch BloomPDF Workspace <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Product 2: Fairlx (FLAGSHIP - IN MIDDLE - Blue/Purple Theme) */}
            <div className="bg-card border-2 border-blue-500/40 rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-blue-500 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center p-2 shadow-xs">
                    <Image src="https://fairlx.com/Logo.png" alt="Fairlx Logo" width={36} height={36} className="w-8 h-8 object-contain" unoptimized />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase bg-blue-600 text-white px-3 py-1 rounded-full shadow-md">
                    Flagship AI Platform
                  </span>
                </div>
                <h3 className="text-[22px] font-bold text-foreground mb-2">Fairlx</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
                  AI-powered project management platform for modern engineering teams and collaborative task orchestration.
                </p>
              </div>
              <a
                href="https://fairlx.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-[14px] hover:underline"
              >
                Explore Fairlx (fairlx.com) <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Product 3: School Stacker (Electric Lime #8CFF2E Theme) */}
            <div className="bg-card border border-[#8CFF2E]/40 rounded-3xl p-8 shadow-xs flex flex-col justify-between hover:shadow-xl transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center p-2 shadow-xs">
                    <Image src="https://schoolstacker.app/images/SchoolStackerLogo.svg" alt="School Stacker Logo" width={36} height={36} className="w-8 h-8 object-contain" unoptimized />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase bg-[#8CFF2E]/15 text-[#67BD01] dark:text-[#8CFF2E] border border-[#8CFF2E]/30 px-3 py-1 rounded-full">
                    Enterprise ERP
                  </span>
                </div>
                <h3 className="text-[22px] font-bold text-foreground mb-2">School Stacker</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
                  Enterprise school ERP management software empowering educational institutions with admissions, exams, fees, and portals.
                </p>
              </div>
              <a
                href="https://schoolstacker.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#67BD01] dark:text-[#8CFF2E] font-bold text-[14px] hover:underline"
              >
                Explore School Stacker (schoolstacker.app) <ExternalLink className="w-4 h-4" />
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════
          5. CORPORATE CONTACT & INQUIRIES
      ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-card via-card/90 to-muted/40 border border-border rounded-3xl p-8 sm:p-14 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-[28px] sm:text-[36px] font-extrabold text-foreground tracking-tight">
                Have questions or enterprise inquiries?
              </h2>
              <p className="text-[15.5px] text-muted-foreground leading-relaxed">
                Get in touch with the engineering team at Stemlen Private Limited for custom integrations, partnerships, or corporate support.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
              <a
                href="mailto:info@stemlen.com"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-[14px] px-5 py-3 rounded-xl shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all"
              >
                <Mail className="w-4 h-4" />
                info@stemlen.com
              </a>
              <a
                href="https://github.com/stemlen/bloompdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground font-bold text-[14px] px-5 py-3 rounded-xl hover:bg-muted transition-all"
              >
                <Github className="w-4 h-4" />
                GitHub Repo
              </a>
              <a
                href="https://www.linkedin.com/company/stemlen/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground font-bold text-[14px] px-5 py-3 rounded-xl hover:bg-muted transition-all"
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
