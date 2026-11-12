declare module "*.mdx" {
  import type { ComponentType } from "react";
  import type { MDXProps } from "mdx/types";
  import type { TableOfContents } from "fumadocs-core/toc";
  export const toc: TableOfContents;
  const Content: ComponentType<MDXProps>;
  export default Content;
}
