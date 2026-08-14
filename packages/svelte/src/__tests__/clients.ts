import { useEffect, useState } from "react";
import { vi } from "vitest";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { resource } from "@assistant-ui/tap";
import { useAssistantEmit } from "@assistant-ui/store/client";

export type AnyClient = Record<string, any>;

export const flushEvents = () => new Promise((resolve) => setTimeout(resolve));

const useMessageClient = ({ id }: { id: string }) => {
  const emit = useAssistantEmit();
  const [text, setText] = useState("");
  return {
    getState: () => ({ id, text }),
    setText,
    ping: (value: string) =>
      emit("message.pinged" as never, { id, value } as never),
  };
};
export const MessageClient = resource(useMessageClient);

const useThreadClient = () => {
  const [selected, setSelected] = useState(0);
  return {
    getState: () => ({ selected }),
    setSelected,
  };
};
export const ThreadClient = resource(useThreadClient);

export const createTrackedThread = () => {
  const counters = { mounts: 0, cleanups: 0 };
  const useTracked = () => {
    const [selected, setSelected] = useState(0);
    useEffect(() => {
      counters.mounts++;
      return () => {
        counters.cleanups++;
      };
    }, []);
    return { getState: () => ({ selected }), setSelected };
  };
  return { TrackedThread: resource(useTracked), counters };
};

type EchoMessage = { id: string; role: "user" | "assistant"; text: string };

export const createEchoRuntime = () => {
  let nextId = 0;
  let messages: EchoMessage[] = [];
  let isRunning = false;
  const onNew = vi.fn(async (message: any) => {
    const text = message.content
      .map((part: any) => (part.type === "text" ? part.text : ""))
      .join("");
    messages = [...messages, { id: `u${nextId++}`, role: "user", text }];
    sync();
  });
  const onEdit = vi.fn(async (message: any) => {
    const text = message.content
      .map((part: any) => (part.type === "text" ? part.text : ""))
      .join("");
    const parentIndex = message.parentId
      ? messages.findIndex((entry) => entry.id === message.parentId) + 1
      : 0;
    messages = [
      ...messages.slice(0, parentIndex),
      { id: `u${nextId++}`, role: "user", text },
    ];
    sync();
  });
  const onCancel = vi.fn(async () => {
    isRunning = false;
    queueMicrotask(sync);
  });
  const makeAdapter = () => ({
    messages,
    isRunning,
    convertMessage: (message: EchoMessage) => ({
      id: message.id,
      role: message.role,
      content: [{ type: "text" as const, text: message.text }],
    }),
    setMessages: (next: EchoMessage[]) => {
      messages = next;
      sync();
    },
    onNew,
    onEdit,
    onCancel,
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter() as never);
  const sync = () => core.setAdapter(makeAdapter() as never);
  const runtime = new AssistantRuntimeImpl(core as never);
  return {
    runtime,
    onNew,
    onEdit,
    onCancel,
    setMessages: (next: EchoMessage[]) => {
      messages = next;
      sync();
    },
    setRunning: (value: boolean) => {
      isRunning = value;
      sync();
    },
  };
};
