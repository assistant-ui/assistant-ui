import type { Metadata } from "next";
import { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { PlaygroundRuntimeProvider } from "@/contexts/PlaygroundRuntimeProvider";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Experiment with different configurations and settings using the Assistant UI Playground.",
};

export default function PlaygroundLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="playground"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/playground"
      fullHeight
      hideFooter
    >
      <PlaygroundRuntimeProvider>{children}</PlaygroundRuntimeProvider>
    </SubProjectLayout>
  );
}
