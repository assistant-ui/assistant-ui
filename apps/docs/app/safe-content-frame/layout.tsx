import type { Metadata } from "next";
import { ReactNode } from "react";
import { SafeContentFrameLayoutClient } from "./safe-content-frame-layout-client";

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
    <SafeContentFrameLayoutClient>{children}</SafeContentFrameLayoutClient>
  );
}
