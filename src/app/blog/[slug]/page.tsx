import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  Tag,
  ArrowLeft,
  ArrowRight,
  Wrench,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import {
  blogPosts,
  getBlogPostBySlug,
  getRelatedPosts,
} from "@/lib/blogPosts";
import { getToolBySlug } from "@/lib/tools";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return { title: "Article Not Found | BloomPDF Blog" };

  const canonicalUrl = `https://bloompdf.app/blog/${slug}`;

  return {
    title: `${post.title} | BloomPDF Blog`,
    description: post.description,
    keywords: post.tags,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: canonicalUrl,
      siteName: "BloomPDF",
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      images: [
        {
          url: "https://bloompdf.app/logo.png",
          width: 512,
          height: 512,
          alt: `BloomPDF Blog — ${post.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ["https://bloompdf.app/logo.png"],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = getRelatedPosts(slug, 3);
  const relatedToolObjects = post.relatedTools
    .map((s) => getToolBySlug(s))
    .filter(Boolean);

  // Article structured data
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: post.author,
      url: "https://bloompdf.app",
    },
    publisher: {
      "@type": "Organization",
      name: "BloomPDF",
      url: "https://bloompdf.app",
      logo: {
        "@type": "ImageObject",
        url: "https://bloompdf.app/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://bloompdf.app/blog/${slug}`,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://bloompdf.app",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://bloompdf.app/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://bloompdf.app/blog/${slug}`,
      },
    ],
  };

  // Simple markdown-to-HTML conversion for paragraphs, headings, lists, tables, links, bold, inline code
  function renderMarkdown(md: string): string {
    const lines = md.trim().split("\n");
    let html = "";
    let inList = false;
    let inTable = false;
    let tableHeaders = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Skip empty lines
      if (line.trim() === "") {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        if (inTable) {
          html += "</tbody></table></div>";
          inTable = false;
        }
        continue;
      }

      // Table separator line
      if (/^\|[\s-:|]+\|$/.test(line.trim())) {
        continue;
      }

      // Table rows
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const cells = line
          .trim()
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());

        if (!inTable) {
          inTable = true;
          tableHeaders = true;
          html += `<div class="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm my-6"><table class="w-full text-left text-sm border-collapse"><thead><tr class="border-b border-border bg-muted/40">`;
          cells.forEach(
            (cell) =>
              (html += `<th class="p-4 font-semibold text-foreground">${inlineFormat(cell)}</th>`)
          );
          html += `</tr></thead><tbody class="divide-y divide-border/60">`;
        } else {
          html += `<tr>`;
          cells.forEach(
            (cell) =>
              (html += `<td class="p-4 text-muted-foreground">${inlineFormat(cell)}</td>`)
          );
          html += `</tr>`;
        }
        continue;
      } else if (inTable) {
        html += "</tbody></table></div>";
        inTable = false;
      }

      // Headings
      if (line.startsWith("### ")) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h3 class="text-[20px] font-bold text-foreground mt-10 mb-3 tracking-tight">${inlineFormat(line.slice(4))}</h3>`;
        continue;
      }
      if (line.startsWith("## ")) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h2 class="text-[24px] sm:text-[28px] font-bold text-foreground mt-14 mb-4 tracking-tight">${inlineFormat(line.slice(3))}</h2>`;
        continue;
      }

      // Unordered list
      if (/^[-*]\s/.test(line.trim())) {
        if (!inList) {
          html += `<ul class="list-disc pl-6 space-y-2 my-4">`;
          inList = true;
        }
        html += `<li class="text-[15px] text-muted-foreground leading-relaxed">${inlineFormat(line.trim().slice(2))}</li>`;
        continue;
      }

      // Ordered list
      if (/^\d+\.\s/.test(line.trim())) {
        if (!inList) {
          html += `<ul class="list-decimal pl-6 space-y-2 my-4">`;
          inList = true;
        }
        html += `<li class="text-[15px] text-muted-foreground leading-relaxed">${inlineFormat(line.trim().replace(/^\d+\.\s/, ""))}</li>`;
        continue;
      }

      if (inList) {
        html += "</ul>";
        inList = false;
      }

      // Blockquote lines starting with **Q: or > 
      if (line.trim().startsWith(">")) {
        html += `<blockquote class="border-l-4 border-primary/30 pl-4 py-1 my-4 text-[15px] text-muted-foreground italic">${inlineFormat(line.trim().slice(1).trim())}</blockquote>`;
        continue;
      }

      // Regular paragraph
      html += `<p class="text-[15px] text-muted-foreground leading-relaxed mb-4">${inlineFormat(line.trim())}</p>`;
    }

    if (inList) html += "</ul>";
    if (inTable) html += "</tbody></table></div>";

    return html;
  }

  function inlineFormat(text: string): string {
    // Bold
    text = text.replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="text-foreground font-semibold">$1</strong>'
    );
    // Inline code
    text = text.replace(
      /`(.+?)`/g,
      '<code class="bg-muted px-1.5 py-0.5 rounded text-[13px] font-mono text-foreground">$1</code>'
    );
    // Links
    text = text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-primary font-semibold hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    return text;
  }

  const contentHtml = renderMarkdown(post.content);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="min-h-screen bg-background text-foreground">
        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden bg-gradient-to-b from-card via-card/70 to-muted/40 border-b border-border pt-8 pb-12 sm:pt-12 sm:pb-16">
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-6">
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3 h-3" />
              <Link
                href="/blog"
                className="hover:text-primary transition-colors"
              >
                Blog
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {post.title}
              </span>
            </nav>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="text-[11px] font-bold uppercase bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full">
                {post.category}
              </span>
              <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {post.readTime}
              </span>
              <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                {post.author}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-[32px] sm:text-[44px] font-extrabold text-foreground leading-[1.12] tracking-tight mb-5">
              {post.title}
            </h1>

            {/* Description */}
            <p className="text-[17px] text-muted-foreground leading-relaxed max-w-3xl">
              {post.description}
            </p>
          </div>
        </section>

        {/* ═══ ARTICLE BODY ═══ */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Markdown content */}
          <article
            className="prose-bloom"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {/* Tags */}
          <div className="mt-14 pt-8 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                Tags
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[12px] font-medium px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Related Tools */}
          {relatedToolObjects.length > 0 && (
            <div className="mt-12 bg-card border border-border/80 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <Wrench className="w-4 h-4 text-primary" />
                <h3 className="text-[16px] font-bold text-foreground">
                  Try These Related Tools
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedToolObjects.map((tool) =>
                  tool ? (
                    <Link
                      key={tool.slug}
                      href={`/tools/${tool.slug}`}
                      className="group flex items-center gap-3 p-4 bg-muted/50 rounded-xl hover:bg-primary/5 border border-border/60 hover:border-primary/30 transition-all"
                    >
                      <div className="flex-1">
                        <p className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors">
                          {tool.name}
                        </p>
                        <p className="text-[12px] text-muted-foreground line-clamp-1">
                          {tool.description}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </Link>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Related Articles */}
          {relatedPosts.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="text-[16px] font-bold text-foreground">
                  Related Articles
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedPosts.map((rp) => (
                  <Link
                    key={rp.slug}
                    href={`/blog/${rp.slug}`}
                    className="group bg-card border border-border/80 rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all"
                  >
                    <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {rp.category}
                    </span>
                    <h4 className="text-[14px] font-bold text-foreground mt-3 mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {rp.title}
                    </h4>
                    <p className="text-[12px] text-muted-foreground line-clamp-2">
                      {rp.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back to blog */}
          <div className="mt-12 flex justify-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-primary font-bold text-[14px] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Articles
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
