import { map } from "@/.map";
import { createMDXSource } from "fumadocs-mdx";
import { loader, Page } from "fumadocs-core/source";
import { z } from "zod";

const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  full: z.boolean().optional(),
});

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
