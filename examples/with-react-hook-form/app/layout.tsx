"use client";

import "./globals.css";

import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import {
  AssistantRuntimeProvider,
  useVercelUseChatRuntime,
} from "@assistant-ui/react";
import {
  AssistantSystemProvider,
  useAssistantSystemContext,
} from "@assistant-ui/react-system";
import { Montserrat } from "next/font/google";

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { useAssistantSystem } = useAssistantSystemContext();
  const getSystemPrompt = useAssistantSystem((s) => s.getSystemPrompt);
  const getTools = useAssistantSystem((s) => s.getTools);

  const chat = useChat({
    api: "/api/chat",
    maxToolRoundtrips: 1,
    body: {
      get system() {
        return getSystemPrompt();
      },
    },
    onToolCall: ({ toolCall: { toolName, args } }) => {
      const tool = getTools()[toolName];
      if (!tool) return;
      return tool.execute(args as object);
    },
  });

  const runtime = useVercelUseChatRuntime(chat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

const montserrat = Montserrat({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AssistantSystemProvider>
      <MyRuntimeProvider>
        <html lang="en">
          <body className={cn(montserrat.className, "h-screen")}>
            {children}
          </body>
        </html>
      </MyRuntimeProvider>
    </AssistantSystemProvider>
  );
}
