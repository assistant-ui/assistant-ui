import type { MetadataRoute } from "next";
import { source, getTapDocsPages, blog, examples, careers } from "@/lib/source";
import { ELEMENTS } from "@/components/pages/elements/registry";
import { DEMOS } from "@/lib/demos";
import { DESIGN_COMPONENTS } from "@/components/pages/design/registry-meta";
import { BASE_URL, PRODUCTS } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/careers`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/showcase`, changeFrequency: "weekly", priority: 0.7 },
    {
      url: `${BASE_URL}/elements`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/elements/vocabulary`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/design`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/design/components`,
      changeFrequency: "weekly",
      priority: 0.7,
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

  const tapDocsPages: MetadataRoute.Sitemap = getTapDocsPages().map((page) => ({
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

  const elementPages: MetadataRoute.Sitemap = ELEMENTS.map((element) => ({
    url: `${BASE_URL}/elements/${element.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const designPages: MetadataRoute.Sitemap = DESIGN_COMPONENTS.map((item) => ({
    url: `${BASE_URL}/design/components/${item.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const demoPages: MetadataRoute.Sitemap = DEMOS.map((demo) => ({
    url: `${BASE_URL}/demos/${demo.slug}`,
    changeFrequency: "monthly" as const,
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
    ...productPages,
    ...docsPages,
    ...tapDocsPages,
    ...blogPages,
    ...examplePages,
    ...elementPages,
    ...designPages,
    ...demoPages,
    ...careerPages,
  ];
}
