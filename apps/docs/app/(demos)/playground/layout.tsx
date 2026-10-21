import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { subProject, subProjectGithubUrl } from "@/lib/docs-sites";
import { createOgMetadata } from "@/lib/og";

const { title, description } = subProject("playground");

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
      githubPath={subProjectGithubUrl("playground")}
      fullHeight
      hideFooter
    >
      <Suspense>{children}</Suspense>
    </SubProjectLayout>
  );
}
