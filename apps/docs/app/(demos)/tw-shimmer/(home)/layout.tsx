import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "tw-shimmer by assistant-ui",
  description:
    "Zero-dependency Tailwind v4 shimmer for text and skeleton loaders. Pure CSS.",
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
