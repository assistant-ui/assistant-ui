import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { createOgMetadata } from "@/lib/og";

const title = "Cloud AI SDK";
const description =
  "Cloud persistence and thread management for any Vercel AI SDK app. One import change.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function CloudAiSdkLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="cloud-ai-sdk"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/cloud-ai-sdk"
    >
      {children}
    </SubProjectLayout>
  );
}
