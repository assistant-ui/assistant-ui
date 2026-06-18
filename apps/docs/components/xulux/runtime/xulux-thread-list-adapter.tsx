"use client";

import { createAssistantStream } from "assistant-stream";
import { type FC, type PropsWithChildren, useMemo, useRef } from "react";
import {
  type AssistantCloud,
  RuntimeAdapterProvider,
  type RemoteThreadListAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import { useAssistantCloudThreadHistoryAdapter } from "@assistant-ui/core/react";
import {
  findXuluxThread,
  findXuluxThreadBySessionId,
  readXuluxThreads,
  updateXuluxThread,
  writeXuluxThreads,
} from "./xulux-local-storage";
import type { XuluxStoredThread, XuluxThreadCustom } from "./types";

function getTextFromMessages(messages: readonly ThreadMessage[]): string {
  for (const message of messages) {
    if (message.role !== "user") continue;
    const text = message.content
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "New chat";
}

function titleFromMessages(messages: readonly ThreadMessage[]): string {
  const text = getTextFromMessages(messages);
  return text.length > 44 ? `${text.slice(0, 41)}...` : text;
}

function createXuluxCloudHistoryProvider(
  cloud: AssistantCloud,
): FC<PropsWithChildren> {
  return function XuluxCloudHistoryProvider({ children }) {
    const cloudRef = useRef(cloud);
    cloudRef.current = cloud;
    const history = useAssistantCloudThreadHistoryAdapter(cloudRef);
    const adapters = useMemo(() => ({ history }), [history]);
    return (
      <RuntimeAdapterProvider adapters={adapters}>
        {children}
      </RuntimeAdapterProvider>
    );
  };
}

type InitializeResult = {
  remoteId: string;
  externalId: string;
};

export function createXuluxLocalThreadListAdapter({
  getCurrentSessionId,
  cloud,
}: {
  getCurrentSessionId: () => string;
  cloud: AssistantCloud;
}): RemoteThreadListAdapter {
  const Provider = createXuluxCloudHistoryProvider(cloud);
  const initializeTasks = new Map<string, Promise<InitializeResult>>();

  const upsertThread = (
    remoteId: string,
    updater: (thread: XuluxStoredThread | null) => XuluxStoredThread,
  ) => {
    const threads = readXuluxThreads();
    const index = threads.findIndex((thread) => thread.remoteId === remoteId);
    const nextThread = updater(index === -1 ? null : threads[index]!);
    const nextThreads =
      index === -1
        ? [nextThread, ...threads]
        : threads.map((thread, threadIndex) =>
            threadIndex === index ? nextThread : thread,
          );
    writeXuluxThreads(nextThreads);
  };

  const createCloudThread = async (
    sessionId: string,
  ): Promise<InitializeResult> => {
    const now = Date.now();
    let cloudThreadId: string;

    try {
      ({ thread_id: cloudThreadId } = await cloud.threads.create({
        last_message_at: new Date(),
        external_id: sessionId,
        metadata: { source: "xulux_playground" },
      }));
    } catch (error) {
      console.warn("[xulux] cloud thread create failed", error);
      throw new Error(
        "Unable to start a chat session. Assistant Cloud is unavailable — please try again.",
      );
    }

    upsertThread(cloudThreadId, (existing) => ({
      remoteId: cloudThreadId,
      externalId: sessionId,
      status: existing?.status ?? "regular",
      ...(existing?.title !== undefined ? { title: existing.title } : {}),
      custom: {
        xuluxStatus: existing?.custom.xuluxStatus ?? "idle",
        sessionId,
        updatedAt: now,
        ...(existing?.custom.pendingUserMessage !== undefined
          ? { pendingUserMessage: existing.custom.pendingUserMessage }
          : {}),
        ...(existing?.custom.selectedTemplate !== undefined
          ? { selectedTemplate: existing.custom.selectedTemplate }
          : {}),
        ...(existing?.custom.canvas !== undefined
          ? { canvas: existing.custom.canvas }
          : {}),
      } satisfies XuluxThreadCustom,
    }));

    return {
      remoteId: cloudThreadId,
      externalId: sessionId,
    };
  };

  return {
    unstable_Provider: Provider,
    async list() {
      const threads = readXuluxThreads();
      return {
        threads: threads.map((thread) => ({
          remoteId: thread.remoteId,
          externalId: thread.externalId,
          status: thread.status,
          title: thread.title,
          custom: thread.custom,
        })),
      };
    },
    async initialize() {
      const sessionId = getCurrentSessionId();
      const existing = findXuluxThreadBySessionId(sessionId);
      if (existing?.remoteId) {
        return {
          remoteId: existing.remoteId,
          externalId: sessionId,
        };
      }

      const inFlight = initializeTasks.get(sessionId);
      if (inFlight) return inFlight;

      const task = createCloudThread(sessionId).finally(() => {
        initializeTasks.delete(sessionId);
      });
      initializeTasks.set(sessionId, task);
      return task;
    },
    async rename(remoteId, title) {
      updateXuluxThread(remoteId, (thread) => ({
        ...thread,
        title,
        custom: { ...thread.custom, updatedAt: Date.now() },
      }));
    },
    async archive(remoteId) {
      updateXuluxThread(remoteId, (thread) => ({
        ...thread,
        status: "archived",
        custom: { ...thread.custom, updatedAt: Date.now() },
      }));
    },
    async unarchive(remoteId) {
      updateXuluxThread(remoteId, (thread) => ({
        ...thread,
        status: "regular",
        custom: { ...thread.custom, updatedAt: Date.now() },
      }));
    },
    async delete(remoteId) {
      writeXuluxThreads(
        readXuluxThreads().filter((thread) => thread.remoteId !== remoteId),
      );
    },
    async fetch(remoteId) {
      const thread = findXuluxThread(remoteId);
      if (!thread) throw new Error("Thread not found");
      return {
        remoteId: thread.remoteId,
        externalId: thread.externalId,
        status: thread.status,
        title: thread.title,
        custom: thread.custom,
      };
    },
    async generateTitle(remoteId, messages) {
      const title = titleFromMessages(messages);
      updateXuluxThread(remoteId, (thread) => ({
        ...thread,
        title,
        custom: { ...thread.custom, updatedAt: Date.now() },
      }));
      return createAssistantStream((controller) => {
        controller.appendText(title);
      });
    },
  };
}
