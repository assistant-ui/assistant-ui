import {
  useAui,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { useMemo } from "react";
import type { MessageRow, ThreadRow } from "@/lib/db";

async function api<T = void>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json" },
  });
  if (!res.ok)
    throw new Error(`${init?.method ?? "GET"} ${path}: ${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

const patchThread = (id: string, patch: Partial<ThreadRow>) =>
  api(`/api/threads/${id}`, { method: "PATCH", body: JSON.stringify(patch) });

const toMetadata = (thread: ThreadRow) => ({
  remoteId: thread.id,
  status: thread.status,
  title: thread.title ?? undefined,
});

// Loads and saves the messages of whichever thread is open.
function useThreadAdapters() {
  const aui = useAui();
  const history = useMemo<ThreadHistoryAdapter>(
    () => ({
      // useChatRuntime only calls the withFormat variant below.
      load: async () => ({ messages: [] }),
      append: async () => {},
      withFormat: (format) => {
        const save = async (item: Parameters<typeof format.encode>[0]) => {
          const { remoteId } = await aui.threadListItem.initialize();
          const row: MessageRow = {
            id: format.getId(item.message),
            parent_id: item.parentId,
            format: format.format,
            content: format.encode(item),
          };
          await api(`/api/threads/${remoteId}/messages`, {
            method: "POST",
            body: JSON.stringify(row),
          });
        };
        return {
          async load() {
            const { remoteId } = aui.threadListItem.getState();
            if (!remoteId) return { messages: [] };
            const rows = await api<MessageRow[]>(
              `/api/threads/${remoteId}/messages`,
            );
            return {
              messages: rows.map((row) =>
                format.decode(row as Parameters<typeof format.decode>[0]),
              ),
            };
          },
          append: save,
          update: save,
        };
      },
    }),
    [aui],
  );
  return useMemo(() => ({ history }), [history]);
}

export const threadListAdapter: RemoteThreadListAdapter = {
  async list() {
    const rows = await api<ThreadRow[]>("/api/threads");
    return { threads: rows.map(toMetadata) };
  },
  async initialize() {
    const { id } = await api<{ id: string }>("/api/threads", {
      method: "POST",
    });
    return { remoteId: id };
  },
  async fetch(remoteId) {
    return toMetadata(await api<ThreadRow>(`/api/threads/${remoteId}`));
  },
  rename: (remoteId, title) => patchThread(remoteId, { title }),
  archive: (remoteId) => patchThread(remoteId, { status: "archived" }),
  unarchive: (remoteId) => patchThread(remoteId, { status: "regular" }),
  delete: (remoteId) => api(`/api/threads/${remoteId}`, { method: "DELETE" }),
  // Titles the thread with the start of its first message; call a model here for smarter titles.
  async generateTitle(remoteId, messages) {
    const first = messages[0]?.content.find((part) => part.type === "text");
    const title = (first?.type === "text" ? first.text : "New chat").slice(
      0,
      60,
    );
    await patchThread(remoteId, { title });
    return createAssistantStream((controller) => {
      controller.appendText(title);
    });
  },
  unstable_useAdapters: useThreadAdapters,
};
