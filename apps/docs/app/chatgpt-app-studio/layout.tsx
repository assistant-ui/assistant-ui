import type { Metadata } from "next";
import { ReactNode } from "react";
import { ChatGptAppStudioLayoutClient } from "./chatgpt-app-studio-layout-client";

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
    <ChatGptAppStudioLayoutClient>{children}</ChatGptAppStudioLayoutClient>
  );
}
