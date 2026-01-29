import type { Metadata } from "next";
import { ReactNode, Suspense } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { PlaygroundRuntimeProvider } from "@/contexts/PlaygroundRuntimeProvider";
import { createOgMetadata } from "@/lib/og";

const title = "Playground";
const description =
  "Experiment with different configurations and settings using the Assistant UI Playground.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
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
      <Suspense>
        <PlaygroundRuntimeProvider>{children}</PlaygroundRuntimeProvider>
      </Suspense>
    </SubProjectLayout>
  );
}
