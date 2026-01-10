import type { Metadata } from "next";
import { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";

export const metadata: Metadata = {
  title: "ChatGPT App Studio by assistant-ui",
  description:
    "Build and preview ChatGPT Apps locally. A development workbench for the OpenAI Apps SDK with live preview, mock tool responses, and production export.",
};

export default function ChatGptAppStudioLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="chatgpt-app-studio"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/chatgpt-app-studio"
    >
      {children}
    </SubProjectLayout>
  );
}
