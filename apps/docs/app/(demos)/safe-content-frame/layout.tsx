import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { createOgMetadata } from "@/lib/og";

const title = "Safe Content Frame";
const description =
  "Sandboxes for HTML. Render MCP Apps and Generative UI in isolated iframes with their own origins.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function SandboxLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="safe-content-frame"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/safe-content-frame"
    >
      {children}
    </SubProjectLayout>
  );
}
