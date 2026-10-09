import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { subProject, subProjectGithubUrl } from "@/lib/docs-sites";
import { createOgMetadata } from "@/lib/og";

const { title, description } = subProject("generative-frame");

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function GenerativeFrameLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="generative-frame"
      githubPath={subProjectGithubUrl("generative-frame")}
    >
      {children}
    </SubProjectLayout>
  );
}
