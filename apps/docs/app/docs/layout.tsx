import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { docsOptions } from "./layout.config";
// import { DocsChat } from "@/components/docs-chat/DocsChat";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...docsOptions}>
      {children}
      {/* <DocsChat /> */}
    </DocsLayout>
  );
}
