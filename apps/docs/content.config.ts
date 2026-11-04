import { pageSchema, metaSchema } from "fumadocs-core/source/schema";
import { z } from "zod";

const links = z
  .array(z.object({ label: z.string(), url: z.string() }))
  .optional();
const platforms = z
  .array(z.enum(["react", "rn", "ink", "vue", "tap", "cloud"]))
  .optional();

export const contentSchemas = {
  docs: pageSchema.extend({ links, platforms }),
  docsSites: pageSchema.extend({ links }),
  examples: pageSchema,
  elements: pageSchema,
  design: pageSchema.extend({ links }),
  blog: pageSchema.extend({
    author: z.string(),
    date: z.coerce.date().optional(),
    externalUrl: z.url().optional(),
  }),
  careers: pageSchema.extend({
    order: z.number().optional(),
    location: z.string(),
    type: z.string(),
    salary: z.string(),
    summary: z.string(),
  }),
};

export const contentDirectories = {
  docs: "content/docs",
  docsSites: "content/docs-sites",
  examples: "content/examples",
  elements: "content/elements",
  design: "content/design",
  blog: "content/blog",
  careers: "content/careers",
};

export const navigationSchema = metaSchema.extend({
  description: z.string().optional(),
  overview: z.string().optional(),
  platforms,
});
