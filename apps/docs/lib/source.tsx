import { createMDXSource } from "fumadocs-mdx/runtime/next";
import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import {
  docs,
  examples as examplePages,
  blog as blogPosts,
  careers as careersCollection,
} from "@/.source";
export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

export const examples = loader({
  baseUrl: "/examples",
  source: createMDXSource(examplePages),
});

export type ExamplePage = InferPageType<typeof examples>;

export const blog = loader({
  baseUrl: "/blog",
  source: createMDXSource(blogPosts),
});

export type BlogPage = InferPageType<typeof blog>;

export const careers = loader({
  baseUrl: "/careers",
  source: createMDXSource(careersCollection),
});

export type CareerPage = InferPageType<typeof careers>;
