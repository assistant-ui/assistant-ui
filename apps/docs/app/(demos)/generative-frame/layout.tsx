import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { createOgMetadata } from "@/lib/og";

const title = "Generative Frame";
const description =
  "Render model-written HTML and SVG widgets as they stream, each in a sandboxed frame on its own domain.";

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
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/generative-frame"
    >
      {children}
    </SubProjectLayout>
  );
}
