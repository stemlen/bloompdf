import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolBySlug, tools } from "@/lib/tools";
import { getToolSeoData } from "@/lib/seoData";
import { ClientToolWrapper } from "@/components/tools/ClientToolWrapper";
import { ToolSeoContent } from "@/components/seo/ToolSeoContent";

const EDITOR_URL = "https://editor.bloompdf.app/";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "edit-pdf") {
    return {
      title: "Edit PDF Online — BloomPDF Editor",
      description: "Edit PDF documents directly in your web browser with BloomPDF Editor.",
      alternates: {
        canonical: "https://bloompdf.app/tools/edit-pdf",
      },
    };
  }
  const tool = getToolBySlug(slug);
  if (!tool) return { title: "Tool Not Found | BloomPDF" };

  const seoData = getToolSeoData(slug, tool.name, tool.longDescription);
  const canonicalUrl = `https://bloompdf.app/tools/${slug}`;

  return {
    title: seoData.seoTitle,
    description: seoData.metaDescription,
    keywords: seoData.keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    // Not implemented yet ("coming soon"): keep it out of search results.
    ...(tool.comingSoon ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: seoData.seoTitle,
      description: seoData.metaDescription,
      url: canonicalUrl,
      siteName: "BloomPDF",
      type: "website",
      images: [
        {
          url: "https://bloompdf.app/logo.png",
          width: 512,
          height: 512,
          alt: `BloomPDF ${tool.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seoData.seoTitle,
      description: seoData.metaDescription,
      images: ["https://bloompdf.app/logo.png"],
    },
  };
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  if (slug === "edit-pdf") {
    // The editor lives on its own site. This page only forwards there, but it
    // still renders a (visually hidden) <h1> so the static HTML has a heading;
    // redirect() threw before any markup was rendered. The meta refresh works
    // without JavaScript, location.replace() skips the delay when JS runs.
    return (
      <>
        <meta httpEquiv="refresh" content={`0;url=${EDITOR_URL}`} />
        <script dangerouslySetInnerHTML={{ __html: `window.location.replace(${JSON.stringify(EDITOR_URL)});` }} />
        <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="sr-only">Edit PDF Online — BloomPDF Editor</h1>
          <p className="text-[15px] text-muted-foreground">
            Opening the BloomPDF Editor…{" "}
            <a href={EDITOR_URL} className="font-semibold text-primary underline">
              Continue to editor.bloompdf.app
            </a>
          </p>
        </div>
      </>
    );
  }
  const tool = getToolBySlug(slug);
  if (!tool) notFound();

  const seoData = getToolSeoData(slug, tool.name, tool.longDescription);
  const pageUrl = `https://bloompdf.app/tools/${slug}`;

  // 1. WebApplication Schema
  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": `${tool.name} — BloomPDF`,
    "url": pageUrl,
    "description": seoData.metaDescription,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All (Web Browser)",
    "browserRequirements": "Requires JavaScript",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
  };

  // 2. HowTo Schema
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": `How to ${tool.name} Online Free`,
    "description": seoData.metaDescription,
    "step": seoData.howToSteps.map((step, idx) => ({
      "@type": "HowToStep",
      "position": idx + 1,
      "name": step.name,
      "text": step.text,
    })),
  };

  // 3. FAQPage Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": seoData.faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  // 4. BreadcrumbList Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://bloompdf.app",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Tools",
        "item": "https://bloompdf.app/#tools",
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": tool.name,
        "item": pageUrl,
      },
    ],
  };

  return (
    <>
      {/* Inject Structured Data for SEO & Answer Engines (Perplexity, ChatGPT, SGE) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="w-full max-w-7xl mx-auto px-1 sm:px-4 py-2 sm:py-8">
        <ClientToolWrapper tool={tool} />
        <ToolSeoContent toolName={tool.name} seoData={seoData} />
      </div>
    </>
  );
}
