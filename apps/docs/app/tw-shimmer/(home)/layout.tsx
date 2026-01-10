import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "tw-shimmer by assistant-ui",
  description:
    "A zero-dependency Tailwind CSS v4 plugin for beautiful shimmer effects. Fully customizable, performant, and easy to use.",
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
