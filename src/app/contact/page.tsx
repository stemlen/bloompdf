import type { Metadata } from "next";
import Link from "next/link";
import {
  Mail,
  Github,
  Linkedin,
  MapPin,
  Building2,
  Clock,
  MessageSquare,
  Bug,
  Lightbulb,
  FileText,
  ArrowRight,
  ExternalLink,
  Globe,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us | BloomPDF — Get in Touch",
  description:
    "Contact the BloomPDF team at Stemlen Private Limited for support, bug reports, feature requests, enterprise inquiries, and partnership opportunities.",
  alternates: {
    canonical: "https://bloompdf.app/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-card via-card/70 to-muted/40 border-b border-border pt-8 pb-16 sm:pt-14 sm:pb-24">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-primary/10 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-semibold text-foreground">
              We&apos;d love to hear from you
            </span>
          </div>

          <h1 className="text-[38px] sm:text-[56px] font-extrabold text-foreground leading-[1.08] tracking-tight mb-5 max-w-3xl mx-auto">
            Contact Us
          </h1>

          <p className="text-[17px] sm:text-[20px] text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Have a question, found a bug, or want to collaborate? We&apos;re here to help. Reach out through any of the channels below.
          </p>
        </div>
      </section>

      {/* ═══ CONTENT ═══ */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-20">

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">

          {/* Email */}
          <a
            href="mailto:info@stemlen.com"
            className="group bg-card border border-border/80 rounded-3xl p-8 space-y-4 hover:shadow-xl hover:border-primary/30 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-[20px] font-bold text-foreground">Email Us</h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              For general inquiries, support requests, privacy questions, or business partnerships.
            </p>
            <p className="text-primary font-bold text-[15px] flex items-center gap-2">
              info@stemlen.com <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </p>
          </a>

          {/* GitHub */}
          <a
            href="https://github.com/stemlen/bloompdf/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-card border border-border/80 rounded-3xl p-8 space-y-4 hover:shadow-xl hover:border-foreground/20 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Github className="w-7 h-7 text-foreground" />
            </div>
            <h2 className="text-[20px] font-bold text-foreground">GitHub Issues</h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Report bugs, request features, or contribute to the open-source project on GitHub.
            </p>
            <p className="text-foreground font-bold text-[15px] flex items-center gap-2">
              Open an Issue <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </p>
          </a>

          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/company/stemlen/"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-card border border-border/80 rounded-3xl p-8 space-y-4 hover:shadow-xl hover:border-blue-500/30 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Linkedin className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-[20px] font-bold text-foreground">LinkedIn</h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Follow Stemlen for company updates, product launches, career opportunities, and industry insights.
            </p>
            <p className="text-blue-600 dark:text-blue-400 font-bold text-[15px] flex items-center gap-2">
              Follow on LinkedIn <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </p>
          </a>
        </div>

        {/* Topics Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-[28px] sm:text-[36px] font-extrabold text-foreground tracking-tight mb-3">
              What Can We Help You With?
            </h2>
            <p className="text-[16px] text-muted-foreground max-w-2xl mx-auto">
              Choose the topic that best describes your inquiry so we can direct you to the right resource.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Bug,
                title: "Bug Reports",
                desc: "Found something broken? Let us know through GitHub Issues with steps to reproduce.",
                color: "text-rose-600 dark:text-rose-400",
                bg: "bg-rose-500/10",
                link: "https://github.com/stemlen/bloompdf/issues/new?template=bug_report.md",
                linkText: "Report a Bug",
                external: true,
              },
              {
                icon: Lightbulb,
                title: "Feature Requests",
                desc: "Have an idea for a new PDF tool or improvement? We'd love to hear your suggestions.",
                color: "text-amber-600 dark:text-amber-400",
                bg: "bg-amber-500/10",
                link: "https://github.com/stemlen/bloompdf/issues/new?template=feature_request.md",
                linkText: "Request a Feature",
                external: true,
              },
              {
                icon: Building2,
                title: "Enterprise & Partnerships",
                desc: "Interested in custom integrations, white-labeling, or enterprise deployments? Let's discuss.",
                color: "text-indigo-600 dark:text-indigo-400",
                bg: "bg-indigo-500/10",
                link: "mailto:info@stemlen.com?subject=Enterprise%20Inquiry%20-%20BloomPDF",
                linkText: "Email Business Team",
                external: false,
              },
              {
                icon: FileText,
                title: "General Support",
                desc: "Questions about using BloomPDF tools, compatibility, or any other general inquiries.",
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-500/10",
                link: "mailto:info@stemlen.com?subject=Support%20Request%20-%20BloomPDF",
                linkText: "Get Support",
                external: false,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-card border border-border/80 rounded-2xl p-6 space-y-4 flex flex-col"
              >
                <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <h3 className="text-[17px] font-bold text-foreground">{item.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">
                  {item.desc}
                </p>
                <a
                  href={item.link}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={`text-[13px] font-bold ${item.color} inline-flex items-center gap-1.5 hover:underline`}
                >
                  {item.linkText} {item.external ? <ExternalLink className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Company Info Card */}
        <div className="bg-card border border-border/80 rounded-3xl p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Left */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-primary font-bold text-[13px] uppercase tracking-wider">
                <Building2 className="w-4 h-4" />
                Company Information
              </div>
              <h2 className="text-[28px] sm:text-[32px] font-bold text-foreground tracking-tight">
                Stemlen Private Limited
              </h2>
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                BloomPDF is a product of Stemlen Private Limited, a registered Indian technology company specializing in software engineering, enterprise platforms, and open-source developer tools.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://stemlen.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-foreground text-background font-semibold text-[13px] px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                >
                  <Globe className="w-4 h-4" />
                  stemlen.com
                </a>
                <a
                  href="https://github.com/stemlen/bloompdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-card border border-border text-foreground font-semibold text-[13px] px-5 py-2.5 rounded-xl hover:bg-muted transition-colors"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              </div>
            </div>

            {/* Right - Details */}
            <div className="space-y-5">
              <div className="flex items-start gap-4 p-4 bg-muted/40 rounded-xl">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-bold text-foreground">Registered Office</p>
                  <p className="text-[13px] text-muted-foreground">Telangana, India</p>
                  <p className="text-[12px] text-muted-foreground mt-1">CIN: U62011TS2026PTC210559</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-muted/40 rounded-xl">
                <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-bold text-foreground">Email</p>
                  <a href="mailto:info@stemlen.com" className="text-[13px] text-primary font-semibold hover:underline">
                    info@stemlen.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-muted/40 rounded-xl">
                <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-bold text-foreground">Response Time</p>
                  <p className="text-[13px] text-muted-foreground">
                    We typically respond to emails within 24-48 business hours. GitHub issues are triaged weekly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Links */}
        <div className="flex flex-wrap justify-center gap-6 mt-12 text-[14px]">
          <Link href="/privacy-policy" className="text-primary font-semibold hover:underline inline-flex items-center gap-1.5">
            Privacy Policy <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/terms-and-conditions" className="text-primary font-semibold hover:underline inline-flex items-center gap-1.5">
            Terms & Conditions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/about" className="text-primary font-semibold hover:underline inline-flex items-center gap-1.5">
            About BloomPDF <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
