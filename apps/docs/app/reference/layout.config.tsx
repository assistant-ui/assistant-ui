import { type DocsLayoutProps } from "fumadocs-ui/layout";
import { pageTree } from "@/app/source";
import { sharedDocsOptions } from "../docs/layout.config";

// docs layout configuration
export const docsOptions: DocsLayoutProps = {
  ...sharedDocsOptions,
  tree: pageTree,
};
