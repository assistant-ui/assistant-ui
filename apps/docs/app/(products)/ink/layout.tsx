import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { createOgMetadata } from "@/lib/og";

const title = "assistant-ui for the Terminal";
const description =
  "Build AI chat apps for the terminal with React Ink. Powered by the assistant-ui runtime, with full markdown rendering and cross-platform code sharing.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function InkLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="ink"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/react-ink"
    >
      {children}
    </SubProjectLayout>
  );
}
