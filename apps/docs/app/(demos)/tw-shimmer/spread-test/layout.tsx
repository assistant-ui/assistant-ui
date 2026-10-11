import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { subProject, subProjectGithubUrl } from "@/lib/docs-sites";

const { metadataTitle } = subProject("tw-shimmer");

export const metadata: Metadata = {
  title: `Spread Test | ${metadataTitle}`,
  robots: {
    index: false,
    follow: true,
  },
};

export default function SpreadTestLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="tw-shimmer"
      githubPath={subProjectGithubUrl("tw-shimmer")}
      breadcrumbs={[{ label: "spread-test", href: "/tw-shimmer/spread-test" }]}
    >
      {children}
    </SubProjectLayout>
  );
}
