import { createMDXSource } from "fumadocs-mdx";
import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import { meta, docs, blog as blogPosts, careers as careersCollection } from "@/.source";

const utils = loader({
  baseUrl: "/docs",
  source: createMDXSource(docs, meta),
});

export const { getPages, getPage, pageTree } = utils;
export const source = utils;

export const blog = loader({
  baseUrl: "/blog",
  source: createMDXSource(blogPosts, []),
});

export type BlogPage = InferPageType<typeof blog>;

export const careers = loader({
  baseUrl: "/careers",
  source: createMDXSource(careersCollection, []),
});

export type CareerPage = InferPageType<typeof careers>;
