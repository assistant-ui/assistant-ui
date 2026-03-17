import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";

export const metadata: Metadata = {
  title: "Spread Test | tw-shimmer by assistant-ui",
};

export default function SpreadTestLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="tw-shimmer"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/tw-shimmer"
      breadcrumbs={[{ label: "spread-test", href: "/tw-shimmer/spread-test" }]}
    >
      {children}
    </SubProjectLayout>
  );
}
