import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";
import {
  docs,
  examples as examplePages,
  blog as blogPosts,
  careers as careersCollection,
} from "fumadocs-mdx:collections/server";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

export const examples = loader({
  baseUrl: "/examples",
  source: toFumadocsSource(examplePages, []),
});

export type ExamplePage = InferPageType<typeof examples>;

export const blog = loader({
  baseUrl: "/blog",
  source: toFumadocsSource(blogPosts, []),
});

type BaseBlogPage = InferPageType<typeof blog>;
export type BlogPage = Omit<BaseBlogPage, "data"> & {
  data: BaseBlogPage["data"] & {
    date: Date | undefined;
    author: string;
  };
};

export const careers = loader({
  baseUrl: "/careers",
  source: toFumadocsSource(careersCollection, []),
});

type BaseCareerPage = InferPageType<typeof careers>;
export type CareerPage = Omit<BaseCareerPage, "data"> & {
  data: BaseCareerPage["data"] & {
    location: string;
    type: string;
    salary: string;
    summary: string;
    order?: number | undefined;
  };
};
