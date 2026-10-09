import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";

const title = "tw-shimmer";
const description =
  "Zero-dependency Tailwind v4 shimmer for text and skeleton loaders. Pure CSS.";

export const metadata: Metadata = {
  title: "tw-shimmer by assistant-ui",
  description,
  ...createOgMetadata(title, description),
};

export default function TwShimmerHomeLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="tw-shimmer"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/tw-shimmer"
    >
      {children}
    </SubProjectLayout>
  );
}
