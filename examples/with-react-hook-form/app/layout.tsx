"use client";

import "./globals.css";

import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useVercelUseChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Montserrat } from "next/font/google";

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const chat = useChat({
    api: "/api/chat",
    maxToolRoundtrips: 1,
    body: {
      get system() {
        return runtime.getModelConfig().system;
      },
    },
    onToolCall: ({ toolCall: { toolName, args } }) => {
      const tool = runtime.getModelConfig().tools?.[toolName];
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
    <MyRuntimeProvider>
      <html lang="en">
        <body className={cn(montserrat.className, "h-[calc(100dvh)]")}>
          {children}
        </body>
      </html>
    </MyRuntimeProvider>
  );
}
