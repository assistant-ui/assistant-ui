import { map } from "@/.map";
import { createMDXSource, defaultSchemas } from "fumadocs-mdx";
import { loader, Page } from "fumadocs-core/source";
import { z } from "zod";

const frontmatterSchema = defaultSchemas.frontmatter;

export const blogFrontmatterSchema = frontmatterSchema.extend({
  author: z.string(),
  date: z.string().date().or(z.date()).optional(),
});

export const { getPages, getPage, pageTree } = loader({
  baseUrl: "/docs",
  rootDir: "docs",
  source: createMDXSource<typeof frontmatterSchema>(map, {
    schema: {
      frontmatter: frontmatterSchema,
    },
  }),
});

export const blog = loader({
  baseUrl: "/blog",
  rootDir: "blog",
  source: createMDXSource(map, {
    schema: {
      frontmatter: blogFrontmatterSchema,
    },
  }),
});

export type BlogPage = Page<z.infer<typeof blogFrontmatterSchema>>;
