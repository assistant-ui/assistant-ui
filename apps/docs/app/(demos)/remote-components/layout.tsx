import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { subProject, subProjectGithubUrl } from "@/lib/docs-sites";
import { createOgMetadata } from "@/lib/og";

const { title, description } = subProject("remote-components");

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function RemoteComponentsLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="remote-components"
      githubPath={subProjectGithubUrl("remote-components")}
    >
      {children}
    </SubProjectLayout>
  );
}
