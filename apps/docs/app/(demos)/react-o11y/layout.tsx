import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { subProject, subProjectGithubUrl } from "@/lib/docs-sites";
import { createOgMetadata } from "@/lib/og";

const { title, description } = subProject("react-o11y");

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function ReactO11yLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="react-o11y"
      githubPath={subProjectGithubUrl("react-o11y")}
    >
      {children}
    </SubProjectLayout>
  );
}
