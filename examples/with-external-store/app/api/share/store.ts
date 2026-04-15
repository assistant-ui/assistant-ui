import type { SerializedThreadMessage } from "@assistant-ui/react";

type SharedThread = {
  id: string;
  messages: SerializedThreadMessage[];
  createdAt: string;
};

const store = new Map<string, SharedThread>();

export function saveThread(messages: SerializedThreadMessage[]): SharedThread {
  const id = crypto.randomUUID();
  const thread: SharedThread = {
    id,
    messages,
    createdAt: new Date().toISOString(),
  };
  store.set(id, thread);
  return thread;
}

export function getThread(id: string): SharedThread | undefined {
  return store.get(id);
}
