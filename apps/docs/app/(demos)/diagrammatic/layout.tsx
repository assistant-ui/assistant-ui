import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { subProject, subProjectGithubUrl } from "@/lib/docs-sites";
import { createOgMetadata } from "@/lib/og";

const { title, description } = subProject("diagrammatic");

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function DiagrammaticLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="diagrammatic"
      githubPath={subProjectGithubUrl("diagrammatic")}
    >
      {children}
    </SubProjectLayout>
  );
}
