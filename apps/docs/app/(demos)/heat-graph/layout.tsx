import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { createOgMetadata } from "@/lib/og";

const title = "Heat Graph";
const description =
  "Headless, composable activity heatmap components for React. Radix-style primitives you fully control.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function HeatGraphLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="heat-graph"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/heat-graph"
    >
      {children}
    </SubProjectLayout>
  );
}
