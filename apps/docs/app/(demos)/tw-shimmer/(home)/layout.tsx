import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import type { Metadata } from "next";
import { subProject, subProjectGithubUrl } from "@/lib/docs-sites";
import { createOgMetadata } from "@/lib/og";

const { title, description, metadataTitle } = subProject("tw-shimmer");

export const metadata: Metadata = {
  title: metadataTitle,
  description,
  ...createOgMetadata(title, description),
};

export default function TwShimmerHomeLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="tw-shimmer"
      githubPath={subProjectGithubUrl("tw-shimmer")}
    >
      {children}
    </SubProjectLayout>
  );
}
