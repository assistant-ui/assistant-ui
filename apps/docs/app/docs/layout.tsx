import { DocsLayout } from "fumadocs-ui/layout";
import type { ReactNode } from "react";
import { docsOptions } from "./layout.config";
import "fumadocs-ui/twoslash.css";
import { DocsChat } from "@/components/docs-chat/DocsChat";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...docsOptions}>
      {children}
      <DocsChat />
    </DocsLayout>
  );
}
