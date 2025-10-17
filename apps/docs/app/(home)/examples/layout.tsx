import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { examplesOptions } from "./layout.config";

export default function Layout({ children }: { children: ReactNode }) {
  return <DocsLayout {...examplesOptions}>{children}</DocsLayout>;
}
