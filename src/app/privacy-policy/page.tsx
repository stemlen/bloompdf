import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Cookie,
  Eye,
  Server,
  Mail,
  FileText,
  Globe,
  Users,
  Trash2,
  Scale,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | BloomPDF — Your Data, Your Control",
  description:
    "Read BloomPDF's privacy policy. Learn how we protect your data with 100% client-side processing, what cookies we use, and how we handle analytics and advertising.",
  alternates: {
    canonical: "https://bloompdf.app/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "August 27, 2026";

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
        <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[13px] font-semibold text-foreground">
              Last Updated: {lastUpdated}
            </span>
          </div>

          <h1 className="text-[38px] sm:text-[56px] font-extrabold text-foreground leading-[1.08] tracking-tight mb-5 max-w-3xl mx-auto">
            Privacy Policy
          </h1>

          <p className="text-[17px] sm:text-[20px] text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            BloomPDF is built on a simple principle:{" "}
            <strong className="text-foreground">
              your documents never leave your device.
            </strong>{" "}
            Here&apos;s exactly how we protect your privacy.
          </p>
        </div>
      </section>

      {/* ═══ CONTENT ═══ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="space-y-16">
          {/* Section 1 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-[24px] sm:text-[28px] font-bold text-foreground tracking-tight">
                1. Overview
              </h2>
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              This Privacy Policy explains how <strong className="text-foreground">BloomPDF</strong> (accessible at{" "}
              <a href="https://bloompdf.app" className="text-primary font-semibold hover:underline">bloompdf.app</a>), a product of{" "}
              <strong className="text-foreground">Stemlen Private Limited</strong> (CIN: U62011TS2026PTC210559), collects, uses, and protects information when you use our website and PDF tools. By using BloomPDF, you agree to the practices described in this policy.
            </p>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              BloomPDF is fundamentally different from traditional online PDF tools. All PDF processing operations — including merging, splitting, compressing, converting, OCR, editing, and encrypting — are executed <strong className="text-foreground">entirely within your web browser</strong> using WebAssembly and client-side JavaScript. Your files are never uploaded to, stored on, or transmitted through any of our servers.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-[24px] sm:text-[28px] font-bold text-foreground tracking-tight">
                2. Information We Do NOT Collect
              </h2>
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              We want to be transparent about what we <strong className="text-foreground">do not</strong> collect or access:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: FileText, title: "Your PDF Files", desc: "Your documents are processed locally in your browser memory. We never receive, store, cache, or have access to any file you load into BloomPDF." },
                { icon: Lock, title: "Document Contents", desc: "The text, images, metadata, and structure of your PDFs remain exclusively on your device. No content is ever transmitted to our infrastructure." },
                { icon: Users, title: "Personal Accounts", desc: "BloomPDF does not require user registration, login, or account creation. We do not collect names, email addresses, or passwords through the tool." },
                { icon: Trash2, title: "File History", desc: "We do not maintain any history of documents you have processed. Once you close the browser tab, all data associated with your session is permanently discarded." },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-card border border-border/80 rounded-2xl p-5 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <h3 className="text-[14px] font-bold text-foreground">{item.title}</h3>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-[24px] sm:text-[28px] font-bold text-foreground tracking-tight">
                3. Information We DO Collect
              </h2>
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              While we do not collect any document data, we do use certain services to improve the website experience and sustain the platform financially:
            </p>

            <div className="space-y-6 mt-4">
              {/* Analytics */}
              <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-3">
                <h3 className="text-[17px] font-bold text-foreground">
                  3.1 Google Analytics
                </h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  We use <strong className="text-foreground">Google Analytics</strong> (measurement ID: G-DT90DQL3XY) to understand how visitors interact with our website. Google Analytics collects anonymized usage data including:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-[14px] text-muted-foreground">
                  <li>Pages visited and time spent on each page</li>
                  <li>Approximate geographic location (country/city level, not precise location)</li>
                  <li>Browser type, operating system, and device category</li>
                  <li>Referral source (how you arrived at our website)</li>
                  <li>General interaction events (e.g., which tools are used most frequently)</li>
                </ul>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  This data is aggregated and anonymized. It does not include any personally identifiable information (PII) or any content from your documents. You can opt out of Google Analytics by installing the{" "}
                  <a
                    href="https://tools.google.com/dlpage/gaoptout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-semibold hover:underline"
                  >
                    Google Analytics Opt-out Browser Add-on
                  </a>.
                </p>
              </div>

              {/* Advertising */}
              <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-3">
                <h3 className="text-[17px] font-bold text-foreground">
                  3.2 Google AdSense (Advertising)
                </h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  BloomPDF uses <strong className="text-foreground">Google AdSense</strong> to display advertisements on the website. Google AdSense may use cookies and web beacons to serve ads based on your prior visits to our website or other websites on the internet. Specifically:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-[14px] text-muted-foreground">
                  <li>Google uses the <strong>DoubleClick cookie</strong> to serve ads based on your browsing activity across websites</li>
                  <li>You may opt out of personalized advertising by visiting{" "}
                    <a
                      href="https://www.google.com/settings/ads"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-semibold hover:underline"
                    >
                      Google Ads Settings
                    </a>
                  </li>
                  <li>Third-party vendors and ad networks may also use cookies and web beacons to serve and measure ads</li>
                  <li>You can opt out of third-party vendor cookies by visiting the{" "}
                    <a
                      href="https://www.aboutads.info/choices/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-semibold hover:underline"
                    >
                      Digital Advertising Alliance opt-out page
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Cookie className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-[24px] sm:text-[28px] font-bold text-foreground tracking-tight">
                4. Cookies & Local Storage
              </h2>
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              BloomPDF uses the following cookies and browser storage mechanisms:
            </p>

            <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-4 font-semibold text-foreground">Type</th>
                    <th className="p-4 font-semibold text-foreground">Purpose</th>
                    <th className="p-4 font-semibold text-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="p-4 font-medium text-foreground">Google Analytics Cookies</td>
                    <td className="p-4 text-muted-foreground">Measure website traffic and usage patterns</td>
                    <td className="p-4 text-muted-foreground">Up to 2 years</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-foreground">Google AdSense Cookies</td>
                    <td className="p-4 text-muted-foreground">Serve relevant advertisements and measure ad performance</td>
                    <td className="p-4 text-muted-foreground">Varies by cookie</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-foreground">Theme Preference</td>
                    <td className="p-4 text-muted-foreground">Remember your light/dark mode preference</td>
                    <td className="p-4 text-muted-foreground">Persistent (localStorage)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-foreground">Favorites & Recent Tools</td>
                    <td className="p-4 text-muted-foreground">Store your favorited and recently used tools for convenience</td>
                    <td className="p-4 text-muted-foreground">Persistent (localStorage)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[14px] text-muted-foreground leading-relaxed">
              You can clear cookies and local storage at any time through your browser settings. Doing so will reset your theme preference and tool favorites but will not affect any documents, as no document data is ever stored.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-[24px] sm:text-[28px] font-bold text-foreground tracking-tight">
                5. Data Security
              </h2>
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Security is at the core of BloomPDF&apos;s architecture:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[15px] text-muted-foreground leading-relaxed">
              <li>
                <strong className="text-foreground">SSL/TLS Encryption:</strong> All connections to bloompdf.app are encrypted using HTTPS with modern TLS protocols, preventing man-in-the-middle interception.
              </li>
              <li>
                <strong className="text-foreground">Client-Side Architecture:</strong> Our zero-upload architecture means there is no server-side attack surface for your documents. Files exist only in your browser&apos;s temporary memory.
              </li>
              <li>
                <strong className="text-foreground">Open Source Transparency:</strong> BloomPDF&apos;s source code is publicly available on{" "}
                <a
                  href="https://github.com/stemlen/bloompdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-semibold hover:underline"
                >
                  GitHub
                </a>{" "}
                for independent security review and auditing by anyone.
              </li>
              <li>
                <strong className="text-foreground">No Data Retention:</strong> Since documents are processed locally, there is zero data retention on our end. When you close the browser tab, all processed data is permanently and irreversibly discarded from memory.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Scale className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h2 className="text-[24px] sm:text-[28px] font-bold text-foreground tracking-tight">
                6. Your Rights (GDPR & CCPA)
              </h2>
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Depending on your jurisdiction, you may have the following rights regarding your personal data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[15px] text-muted-foreground leading-relaxed">
              <li>
                <strong className="text-foreground">Right of Access:</strong> You may request information about what personal data (if any) we hold about you.
              </li>
              <li>
                <strong className="text-foreground">Right to Erasure:</strong> You may request deletion of your personal data. Since we do not store document data or require accounts, there is minimal personal data to delete beyond analytics cookies.
              </li>
              <li>
                <strong className="text-foreground">Right to Opt Out:</strong> You may opt out of personalized advertising via Google Ads Settings and opt out of analytics via the Google Analytics opt-out add-on.
              </li>
              <li>
                <strong className="text-foreground">Do Not Track:</strong> We respect Do Not Track (DNT) browser signals where technically feasible.
              </li>
            </ul>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:info@stemlen.com" className="text-primary font-semibold hover:underline">
                info@stemlen.com
              </a>.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h2 className="text-[24px] sm:text-[28px] font-bold text-foreground tracking-tight">
                7. Third-Party Links
              </h2>
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              BloomPDF may contain links to external websites such as our parent company (<a href="https://stemlen.com" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">stemlen.com</a>), our GitHub repository, and other third-party resources. We are not responsible for the privacy practices or content of these external sites. We encourage you to review the privacy policies of any third-party websites you visit.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-[24px] sm:text-[28px] font-bold text-foreground tracking-tight">
                8. Children&apos;s Privacy
              </h2>
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              BloomPDF is not directed at children under the age of 13 (or the applicable age of digital consent in your jurisdiction). We do not knowingly collect personal information from children. If we become aware that a child under 13 has provided us with personal data, we will take steps to delete such information promptly.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-[24px] sm:text-[28px] font-bold text-foreground tracking-tight">
                9. Changes to This Policy
              </h2>
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, or legal requirements. Any updates will be posted on this page with a revised &quot;Last Updated&quot; date. We encourage you to periodically review this page for the latest information on our privacy practices.
            </p>
          </section>

          {/* Section 10 - Contact */}
          <section className="bg-card border border-border/80 rounded-3xl p-8 sm:p-10 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-[24px] sm:text-[28px] font-bold text-foreground tracking-tight">
                10. Contact Us
              </h2>
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data handling practices, please contact us:
            </p>
            <div className="space-y-2 text-[15px]">
              <p className="text-foreground font-semibold">Stemlen Private Limited</p>
              <p className="text-muted-foreground">CIN: U62011TS2026PTC210559</p>
              <p className="text-muted-foreground">Telangana, India</p>
              <p className="text-muted-foreground">
                Email:{" "}
                <a href="mailto:info@stemlen.com" className="text-primary font-semibold hover:underline">
                  info@stemlen.com
                </a>
              </p>
              <p className="text-muted-foreground">
                Website:{" "}
                <a href="https://stemlen.com" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
                  stemlen.com
                </a>
              </p>
            </div>
          </section>

          {/* Related links */}
          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/terms-and-conditions"
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-primary hover:underline"
            >
              Terms & Conditions <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-primary hover:underline"
            >
              Contact Us <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-primary hover:underline"
            >
              About BloomPDF <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
