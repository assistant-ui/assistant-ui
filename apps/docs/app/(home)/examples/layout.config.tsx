import { DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import { sharedDocsOptions } from "@/app/docs/layout.config";
import { examplesPageTree } from "@/app/source";

// examples layout configuration
export const examplesOptions: DocsLayoutProps = {
  ...sharedDocsOptions,
  tree: examplesPageTree,
};