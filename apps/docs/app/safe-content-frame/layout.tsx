import type { Metadata } from "next";
import { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";

export const metadata: Metadata = {
  title: "Safe Content Frame Demo - assistant-ui",
  description:
    "Render untrusted HTML content securely in sandboxed iframes with unique origins per render.",
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
