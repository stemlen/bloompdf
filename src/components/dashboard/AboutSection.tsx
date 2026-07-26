"use client";

import React from "react";
import Image from "next/image";
import { ShieldCheck, Zap, Lock, ExternalLink, Globe, Sparkles, Building2 } from "lucide-react";

export function AboutSection() {
  return (
    <section id="about" className="mt-20 pt-12 pb-16 border-t border-border">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        
        {/* Main Glassmorphic Container */}
        <div className="relative overflow-hidden bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-8 sm:p-12 shadow-xl">
          {/* Ambient Glow & Grid Texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="absolute -top-24 right-0 w-[450px] h-[450px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 left-0 w-[350px] h-[350px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Mission & Stemlen Story (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Stemlen Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3.5 py-1.5 shadow-xs">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-[12px] font-bold text-primary">
                  A Product by Stemlen
                </span>
              </div>

              {/* Title */}
              <h2 className="text-[30px] sm:text-[38px] font-extrabold text-foreground leading-tight tracking-tight">
                About <span className="bg-gradient-to-r from-primary via-rose-500 to-amber-500 bg-clip-text text-transparent">BloomPDF</span>
              </h2>

              {/* Subtitle / Paragraph */}
              <p className="text-[15px] sm:text-[16px] text-muted-foreground leading-relaxed">
                BloomPDF is an all-in-one, high-performance online document workspace designed to make PDF editing, merging, converting, and compressing effortless. Built with client-side WebAssembly, your documents are processed locally right inside your browser—ensuring total data privacy, zero server uploads, and lightning-fast speed.
              </p>

              {/* Stemlen Company Box */}
              <div className="bg-muted/50 border border-border/80 rounded-2xl p-5 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-bold text-foreground">Engineered by STEMLEN</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Official</span>
                  </div>
                  <p className="text-[12.5px] text-muted-foreground leading-snug">
                    Stemlen Private Limited builds enterprise-grade software, education ERP platforms, and intelligent tools empowering users worldwide.
                  </p>
                </div>
                <a
                  href="https://stemlen.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 inline-flex items-center gap-2 bg-foreground text-background font-semibold text-[13px] px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                >
                  Visit Stemlen.com
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Right Column: 3 Core Pillars (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Pillar 1: Privacy */}
              <div className="flex items-start gap-4 bg-card/90 border border-border/80 rounded-2xl p-4.5 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-foreground">100% Client-Side Privacy</h4>
                  <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
                    Your files stay on your device. All PDF operations execute directly in your browser without uploading data to external servers.
                  </p>
                </div>
              </div>

              {/* Pillar 2: Unlimited Free */}
              <div className="flex items-start gap-4 bg-card/90 border border-border/80 rounded-2xl p-4.5 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-foreground">Zero Fees & Watermarks</h4>
                  <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
                    No hidden subscriptions, no file size caps, and no forced account registration. Simple, clean, and completely free forever.
                  </p>
                </div>
              </div>

              {/* Pillar 3: WebAssembly Speed */}
              <div className="flex items-start gap-4 bg-card/90 border border-border/80 rounded-2xl p-4.5 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-foreground">WebAssembly Engine</h4>
                  <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
                    Engineered with modern WebAssembly for desktop-grade performance directly in your browser.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
