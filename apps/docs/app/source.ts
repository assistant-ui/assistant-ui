import { map } from "@/.map";
import { createMDXSource } from "fumadocs-mdx";
import { loader } from "fumadocs-core/source";
import { z } from "zod";

const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  full: z.boolean().optional(),
});

export const { getPages, getPage, pageTree } = loader({
  baseUrl: "/",
  rootDir: "docs",
  source: createMDXSource<typeof frontmatterSchema>(map, {
    schema: {
      frontmatter: frontmatterSchema,
    },
  }),
});
