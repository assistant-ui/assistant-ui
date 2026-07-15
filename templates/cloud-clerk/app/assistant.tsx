"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider, AssistantCloud } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@/components/assistant-ui/thread";
import { AssistantShell } from "@/components/assistant-ui/assistant-shell";
import { MessagesSquare } from "lucide-react";
import { useAuth, UserButton, useUser } from "@clerk/nextjs";

export const Assistant = () => {
  const { getToken } = useAuth();
  const { user } = useUser();

  const cloud = useMemo(
    () =>
      new AssistantCloud({
        baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
        authToken: async () => {
          const token = await getToken({ template: "assistant-ui" });

          if (!token) throw new Error("Missing Clerk JWT");

          return token;
        },
      }),
    [getToken],
  );

  const runtime = useChatRuntime({
    cloud,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantShell
        logo={<MessagesSquare className="size-5" />}
        title="assistant-ui"
        headerActions={
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm">
              {`Welcome${user?.firstName ? `, ${user.firstName}` : ""}`}
            </span>
            <UserButton />
          </div>
        }
      >
        <Thread />
      </AssistantShell>
    </AssistantRuntimeProvider>
  );
};
