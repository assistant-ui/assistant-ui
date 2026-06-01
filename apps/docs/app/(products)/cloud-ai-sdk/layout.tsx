import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { createOgMetadata } from "@/lib/og";

const title = "Cloud AI SDK";
const description =
  "Add cloud persistence to any AI SDK app with a single hook change. Zero config, automatic thread management, and full message persistence.";

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
