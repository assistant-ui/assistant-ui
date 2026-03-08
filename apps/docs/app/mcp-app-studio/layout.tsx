import type { Metadata } from "next";
import { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { createOgMetadata } from "@/lib/og";

const title = "MCP App Studio";
const description =
  "Build UIs that live inside Claude, ChatGPT, and other AI hosts. Hot reload, mock tools, and one-command export.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function McpAppStudioLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="mcp-app-studio"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/mcp-app-studio"
    >
      {children}
    </SubProjectLayout>
  );
}
