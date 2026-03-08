import type { Metadata } from "next";
import { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { createOgMetadata } from "@/lib/og";

const title = "Safe Content Frame";
const description =
  "Render untrusted HTML content securely in sandboxed iframes with unique origins per render.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function SafeContentFrameLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="safe-content-frame"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/safe-content-frame"
    >
      {children}
    </SubProjectLayout>
  );
}
