import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";

export const metadata: Metadata = {
  title: "Glass Tuner | tw-glass by assistant-ui",
};

export default function TunerLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="tw-glass"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/tw-glass"
      breadcrumbs={[{ label: "tuner", href: "/tw-glass/tuner" }]}
    >
      {children}
    </SubProjectLayout>
  );
}
