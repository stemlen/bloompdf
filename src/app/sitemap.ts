import { MetadataRoute } from "next";
import { tools } from "@/lib/tools";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://bloompdf.app";
  const now = new Date();

  // Core static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/editor`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // High-priority tools vs regular tools
  const highPrioritySlugs = [
    "merge-pdf",
    "split-pdf",
    "compress-pdf",
    "edit-pdf",
    "pdf-to-word",
    "word-to-pdf",
    "ocr-pdf",
    "protect-pdf",
  ];

  const toolPages: MetadataRoute.Sitemap = tools.map((tool) => {
    const isHighPriority = highPrioritySlugs.includes(tool.slug);
    return {
      url: `${baseUrl}/tools/${tool.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: isHighPriority ? 0.9 : 0.8,
    };
  });

  return [...staticPages, ...toolPages];
}
