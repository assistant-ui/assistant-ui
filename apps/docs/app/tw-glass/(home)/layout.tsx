import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "tw-glass by assistant-ui",
  description:
    "A Tailwind CSS v4 plugin for glass refraction effects via SVG displacement maps. Pure CSS, no JavaScript required.",
};

export default function TwGlassHomeLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="tw-glass"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/tw-glass"
    >
      {children}
    </SubProjectLayout>
  );
}
