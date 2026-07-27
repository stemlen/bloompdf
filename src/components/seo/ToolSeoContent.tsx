"use me";
import React from "react";
import { ToolSeoData } from "@/lib/seoData";
import { ShieldCheck, Zap, Lock, Award, Check, X, HelpCircle, FileCheck } from "lucide-react";

interface Props {
  toolName: string;
  seoData: ToolSeoData;
}

export const ToolSeoContent: React.FC<Props> = ({ toolName, seoData }) => {
  return (
    <section className="mt-16 border-t border-border/60 pt-12 space-y-16 max-w-5xl mx-auto px-4">
      {/* ── 1. How To Section ── */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
          <FileCheck className="w-3.5 h-3.5" />
          Step-by-Step Guide
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          How to {toolName} Online in 3 Simple Steps
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          BloomPDF makes it fast and completely private to process your documents directly in your web browser.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {seoData.howToSteps.map((step, idx) => (
            <div
              key={idx}
              className="relative p-6 rounded-2xl bg-card border border-border/70 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shadow-md">
                  {idx + 1}
                </div>
                <h3 className="font-semibold text-lg text-foreground">{step.name}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {step.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Why BloomPDF Beats iLovePDF & Adobe Acrobat ── */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          <Award className="w-3.5 h-3.5" />
          Competitor Comparison
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Why BloomPDF is Better Than iLovePDF & Adobe Acrobat
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Unlike traditional cloud converters that require uploading your private files to remote servers or paying high monthly subscription fees, BloomPDF processes everything locally on your device.
        </p>

        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-4 font-semibold text-foreground">Feature</th>
                <th className="p-4 font-bold text-primary bg-primary/5">
                  BloomPDF (bloompdf.app)
                </th>
                <th className="p-4 font-medium text-muted-foreground">iLovePDF</th>
                <th className="p-4 font-medium text-muted-foreground">Adobe Acrobat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="p-4 font-medium text-foreground">Source Code Transparency</td>
                <td className="p-4 bg-primary/5 font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> 100% Open Source (GitHub)
                </td>
                <td className="p-4 text-muted-foreground">Closed Source (Proprietary)</td>
                <td className="p-4 text-muted-foreground">Closed Source (Proprietary)</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-foreground">File Privacy</td>
                <td className="p-4 bg-primary/5 font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> 100% Client-Side (No Uploads)
                </td>
                <td className="p-4 text-muted-foreground">Uploaded to Cloud Servers</td>
                <td className="p-4 text-muted-foreground">Uploaded to Adobe Cloud</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-foreground">File Size Limits</td>
                <td className="p-4 bg-primary/5 font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> Unlimited
                </td>
                <td className="p-4 text-muted-foreground">Limited on Free Plan</td>
                <td className="p-4 text-muted-foreground">Quota Restricted</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-foreground">Pricing & Paywalls</td>
                <td className="p-4 bg-primary/5 font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> 100% Free Forever
                </td>
                <td className="p-4 text-muted-foreground">Freemium / Premium Tier</td>
                <td className="p-4 text-muted-foreground">$19.99 / month</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-foreground">Account Required</td>
                <td className="p-4 bg-primary/5 font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> No Registration
                </td>
                <td className="p-4 text-muted-foreground">Optional / Recommended</td>
                <td className="p-4 text-muted-foreground">Required Adobe ID</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. Frequently Asked Questions (AEO & FAQ Schema Source) ── */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          Answer Engine FAQs
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {seoData.faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-card border border-border/70 shadow-sm space-y-2"
            >
              <h3 className="font-semibold text-base md:text-lg text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                  Q
                </span>
                {faq.question}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-8">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
