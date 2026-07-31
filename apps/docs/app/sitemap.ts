import type { MetadataRoute } from "next";
import { source, tapDocs, blog, examples, careers } from "@/lib/source";
import { DEMOS } from "@/lib/demos";
import { GALLERY_TEMPLATES } from "@/lib/gallery-templates";
import { BASE_URL, PRODUCTS } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/careers`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/showcase`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/gallery`, changeFrequency: "weekly", priority: 0.7 },
    {
      url: `${BASE_URL}/gallery/components`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    { url: `${BASE_URL}/oss`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/packages`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/changelog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/traction`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/brand`, changeFrequency: "yearly", priority: 0.3 },
    {
      url: `${BASE_URL}/playground`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    { url: `${BASE_URL}/tap`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/tw-glass`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const productPages: MetadataRoute.Sitemap = PRODUCTS.filter(
    (product) => !product.external,
  ).map((product) => ({
    url: `${BASE_URL}${product.href}`,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

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

  const demoPages: MetadataRoute.Sitemap = DEMOS.map((demo) => ({
    url: `${BASE_URL}/demos/${demo.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const galleryPages: MetadataRoute.Sitemap = GALLERY_TEMPLATES.map(
    (template) => ({
      url: `${BASE_URL}/gallery/${template.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }),
  );

  const careerPages: MetadataRoute.Sitemap = careers.getPages().map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: page.data.lastModified,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...productPages,
    ...docsPages,
    ...tapDocsPages,
    ...blogPages,
    ...examplePages,
    ...demoPages,
    ...galleryPages,
    ...careerPages,
  ];
}
