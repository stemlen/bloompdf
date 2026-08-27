import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Clock,
  Tag,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { blogPosts, getAllCategories } from "@/lib/blogPosts";

export const metadata: Metadata = {
  title: "Blog — PDF Guides, Tutorials & Best Practices | BloomPDF",
  description:
    "Expert guides on PDF compression, merging, OCR, security, accessibility, and document management. Learn how to work smarter with PDFs using BloomPDF's free open-source tools.",
  alternates: {
    canonical: "https://bloompdf.app/blog",
  },
  openGraph: {
    title: "BloomPDF Blog — PDF Guides, Tutorials & Best Practices",
    description:
      "Expert guides on PDF compression, merging, OCR, security, accessibility, and document management.",
    url: "https://bloompdf.app/blog",
    siteName: "BloomPDF",
    type: "website",
  },
};

export default function BlogPage() {
  const categories = getAllCategories();
  const featuredPost = blogPosts[0];
  const otherPosts = blogPosts.slice(1);

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
        <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] bg-primary/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-semibold text-foreground">
              {blogPosts.length} Articles · Expert PDF Guides
            </span>
          </div>

          <h1 className="text-[38px] sm:text-[56px] font-extrabold text-foreground leading-[1.08] tracking-tight mb-5 max-w-3xl mx-auto">
            The BloomPDF{" "}
            <span className="text-primary">Blog</span>
          </h1>

          <p className="text-[17px] sm:text-[20px] text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
            In-depth guides, tutorials, and best practices for working with PDF documents.
            From compression techniques to security standards — everything you need to master PDF workflows.
          </p>

          {/* Category chips */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <span
                key={cat}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-card border border-border text-muted-foreground"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CONTENT ═══ */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-20">

        {/* Featured Post */}
        <section className="mb-20">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-bold text-primary uppercase tracking-wider">
              Latest Article
            </span>
          </div>

          <Link
            href={`/blog/${featuredPost.slug}`}
            className="group block bg-card border border-border/80 rounded-3xl p-8 sm:p-12 hover:shadow-2xl hover:border-primary/30 transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-[11px] font-bold uppercase bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full">
                  {featuredPost.category}
                </span>
                <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(featuredPost.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {featuredPost.readTime}
                </span>
              </div>

              <h2 className="text-[26px] sm:text-[36px] font-bold text-foreground tracking-tight mb-4 group-hover:text-primary transition-colors leading-tight">
                {featuredPost.title}
              </h2>

              <p className="text-[16px] text-muted-foreground leading-relaxed mb-6 max-w-3xl">
                {featuredPost.description}
              </p>

              <span className="inline-flex items-center gap-2 text-primary font-bold text-[15px]">
                Read Full Article
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        </section>

        {/* All Posts Grid */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 border-t border-border" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex-shrink-0">
              All Articles
            </span>
            <div className="flex-1 border-t border-border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-card border border-border/80 rounded-2xl p-6 hover:shadow-xl hover:border-primary/20 transition-all flex flex-col"
              >
                {/* Category & Meta */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold uppercase bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full">
                    {post.category}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-[18px] font-bold text-foreground mb-3 group-hover:text-primary transition-colors leading-snug flex-1">
                  {post.title}
                </h3>

                {/* Description */}
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                  {post.description}
                </p>

                {/* Date & Read More */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/60">
                  <span className="text-[12px] text-muted-foreground">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[12px] font-bold text-primary flex items-center gap-1">
                    Read <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 text-center">
          <div className="bg-card border border-border/80 rounded-3xl p-8 sm:p-12 shadow-sm">
            <h2 className="text-[24px] sm:text-[32px] font-bold text-foreground tracking-tight mb-3">
              Ready to try BloomPDF?
            </h2>
            <p className="text-[16px] text-muted-foreground mb-6 max-w-xl mx-auto">
              All 29+ tools are 100% free, open source, and run entirely in your browser. No sign-up required.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[15px] px-8 py-3.5 rounded-xl shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all"
            >
              Explore All Tools <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
