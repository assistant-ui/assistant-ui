import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { createOgMetadata } from "@/lib/og";

const title = "react-o11y";
const description =
  "Headless, composable observability span primitives for React. Render agent traces, sub-agent trees, and run timelines as collapsible waterfalls you fully control.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function ReactO11yLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="react-o11y"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/react-o11y"
    >
      {children}
    </SubProjectLayout>
  );
}
