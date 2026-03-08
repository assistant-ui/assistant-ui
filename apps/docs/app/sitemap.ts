import type { MetadataRoute } from "next";
import { source, tapDocs, blog, examples, careers } from "@/lib/source";
import { BASE_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/careers`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/showcase`, changeFrequency: "weekly", priority: 0.7 },
    {
      url: `${BASE_URL}/playground`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/mcp-app-studio`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    { url: `${BASE_URL}/tap`, changeFrequency: "monthly", priority: 0.6 },
    {
      url: `${BASE_URL}/safe-content-frame`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/tw-shimmer`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const docsPages: MetadataRoute.Sitemap = source.getPages().map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: page.data.lastModified,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const tapDocsPages: MetadataRoute.Sitemap = tapDocs
    .getPages()
    .map((page) => ({
      url: `${BASE_URL}${page.url}`,
      lastModified: page.data.lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const blogPages: MetadataRoute.Sitemap = blog.getPages().map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: page.data.lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const examplePages: MetadataRoute.Sitemap = examples
    .getPages()
    .map((page) => ({
      url: `${BASE_URL}${page.url}`,
      lastModified: page.data.lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

  const careerPages: MetadataRoute.Sitemap = careers.getPages().map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: page.data.lastModified,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...docsPages,
    ...tapDocsPages,
    ...blogPages,
    ...examplePages,
    ...careerPages,
  ];
}
