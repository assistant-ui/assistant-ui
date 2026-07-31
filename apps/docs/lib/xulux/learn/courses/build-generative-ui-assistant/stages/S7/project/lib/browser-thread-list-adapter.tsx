"use client";

import { createAssistantStream } from "assistant-stream";
import {
  RuntimeAdapterProvider,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
  useAui,
} from "@assistant-ui/react";
import { useMemo, type PropsWithChildren } from "react";

type StoredThread = {
  remoteId: string;
  status: "regular" | "archived";
  title?: string;
};

const read = <T,>(key: string, fallback: T): T => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

function createHistoryProvider(prefix: string) {
  return function BrowserHistoryProvider({ children }: PropsWithChildren) {
    const aui = useAui();
    const history = useMemo<ThreadHistoryAdapter>(() => {
      const key = () => {
        const remoteId = aui.threadListItem().getState().remoteId;
        return `${prefix}messages:${remoteId ?? "new"}`;
      };
      const load: ThreadHistoryAdapter["load"] = async () =>
        read(key(), { messages: [] });
      return {
        load,
        async append(item) {
          const current = await load();
          const index = current.messages.findIndex(
            ({ message }) => message.id === item.message.id,
          );
          const messages = [...current.messages];
          if (index === -1) messages.push(item);
          else messages[index] = item;
          write(key(), { headId: item.message.id, messages });
        },
      };
    }, [aui]);
    const adapters = useMemo(() => ({ history }), [history]);
    return (
      <RuntimeAdapterProvider adapters={adapters}>
        {children}
      </RuntimeAdapterProvider>
    );
  };
}

export function createBrowserThreadListAdapter(
  prefix: string,
): RemoteThreadListAdapter {
  const threadsKey = `${prefix}threads`;
  const loadThreads = () => read<StoredThread[]>(threadsKey, []);
  const saveThreads = (threads: StoredThread[]) => write(threadsKey, threads);

  return {
    unstable_Provider: createHistoryProvider(prefix),
    async list() {
      return { threads: loadThreads() };
    },
    async initialize(localId) {
      const threads = loadThreads();
      if (!threads.some(({ remoteId }) => remoteId === localId)) {
        saveThreads([{ remoteId: localId, status: "regular" }, ...threads]);
      }
      return { remoteId: localId, externalId: undefined };
    },
    async rename(remoteId, title) {
      saveThreads(
        loadThreads().map((thread) =>
          thread.remoteId === remoteId ? { ...thread, title } : thread,
        ),
      );
    },
    async archive(remoteId) {
      saveThreads(
        loadThreads().map((thread) =>
          thread.remoteId === remoteId
            ? { ...thread, status: "archived" }
            : thread,
        ),
      );
    },
    async unarchive(remoteId) {
      saveThreads(
        loadThreads().map((thread) =>
          thread.remoteId === remoteId
            ? { ...thread, status: "regular" }
            : thread,
        ),
      );
    },
    async delete(remoteId) {
      saveThreads(
        loadThreads().filter((thread) => thread.remoteId !== remoteId),
      );
      window.localStorage.removeItem(`${prefix}messages:${remoteId}`);
    },
    async fetch(remoteId) {
      const thread = loadThreads().find((item) => item.remoteId === remoteId);
      if (!thread) throw new Error("Thread not found");
      return thread;
    },
    async generateTitle(_remoteId, messages) {
      return createAssistantStream((controller) => {
        const firstUserMessage = messages.find(({ role }) => role === "user");
        const title = firstUserMessage?.content
          .flatMap((part) => (part.type === "text" ? [part.text] : []))
          .join(" ")
          .trim();
        controller.appendText(title?.slice(0, 44) || "New Chat");
      });
    },
  };
}
