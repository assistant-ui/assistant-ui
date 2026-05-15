"use client";

import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
  type RemoteThreadListAdapter,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { createAssistantStream } from "assistant-stream";

const PAGE_SIZE = 10;

const threadsStore = new Map<
  string,
  {
    remoteId: string;
    status: "regular" | "archived";
    title?: string;
  }
>(
  Array.from({ length: 25 }, (_, i) => {
    const id = `seed-${String(i).padStart(2, "0")}`;
    return [
      id,
      {
        remoteId: id,
        status: "regular" as const,
        title: `Seeded thread ${i + 1}`,
      },
    ] as const;
  }),
);

const threadListAdapter: RemoteThreadListAdapter = {
  async list({ after }: { after?: string } = {}) {
    const all = Array.from(threadsStore.values());
    const start = after ? Number(after) : 0;
    const page = all.slice(start, start + PAGE_SIZE);
    const nextStart = start + page.length;
    return {
      threads: page.map((thread) => ({
        remoteId: thread.remoteId,
        status: thread.status,
        title: thread.title,
      })),
      nextCursor: nextStart < all.length ? String(nextStart) : undefined,
    };
  },

  async initialize(localId) {
    const remoteId = localId;
    threadsStore.set(remoteId, {
      remoteId,
      status: "regular",
    });
    return { remoteId, externalId: undefined };
  },

  async rename(remoteId, title) {
    const thread = threadsStore.get(remoteId);
    if (thread) {
      thread.title = title;
    }
  },

  async archive(remoteId) {
    const thread = threadsStore.get(remoteId);
    if (thread) {
      thread.status = "archived";
    }
  },

  async unarchive(remoteId) {
    const thread = threadsStore.get(remoteId);
    if (thread) {
      thread.status = "regular";
    }
  },

  async delete(remoteId) {
    threadsStore.delete(remoteId);
  },

  async fetch(remoteId) {
    const thread = threadsStore.get(remoteId);
    if (!thread) {
      throw new Error("Thread not found");
    }
    return {
      remoteId: thread.remoteId,
      status: thread.status,
      title: thread.title,
    };
  },

  async generateTitle(_remoteId, messages) {
    // Generate a simple title from the first user message
    return createAssistantStream(async (controller) => {
      const firstUserMessage = messages.find((m) => m.role === "user");
      if (firstUserMessage) {
        const content = firstUserMessage.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join(" ");
        const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
        controller.appendText(title);
      } else {
        controller.appendText("New Chat");
      }
    });
  },
};

export function MyRuntimeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useChatRuntime,
    adapter: threadListAdapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
