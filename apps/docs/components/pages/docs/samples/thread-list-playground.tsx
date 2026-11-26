"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  AssistantRuntimeProvider,
  useAui,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type ExportedMessageRepositoryItem,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import type { DocsSampleAction } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { SampleScope } from "./sample-scope";
import { useSampleAnalytics } from "./use-sample-analytics";

const REPLY = "Noted. Switch threads or open the menu on one to rename it.";
const MAX_CALLS = 8;

type Row = {
  remoteId: string;
  status: "regular" | "archived";
  title: string | undefined;
};

type Snapshot = {
  rows: readonly Row[];
  /** Messages stored per thread, through the history adapter. */
  messages: Readonly<Record<string, number>>;
  calls: readonly { id: number; text: string }[];
};

const textOf = (message: ThreadMessage) =>
  message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

const clip = (text: string, max = 28) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

/** A canned model, so the demo needs no backend. */
const model: ChatModelAdapter = {
  async *run({ abortSignal }) {
    const words = REPLY.split(" ");
    for (let i = 1; i <= words.length; i++) {
      await wait(40, abortSignal);
      if (abortSignal.aborted) return;
      yield { content: [{ type: "text", text: words.slice(0, i).join(" ") }] };
    }
  },
};

/**
 * The "database" behind the demo: a thread table and a message table kept in
 * memory, written only through the adapter below, so the panel shows exactly
 * what a `RemoteThreadListAdapter` is asked to store.
 */
class MemoryDatabase {
  private snapshot: Snapshot = { rows: [], messages: {}, calls: [] };
  private readonly listeners = new Set<() => void>();
  private readonly stored = new Map<string, ExportedMessageRepositoryItem[]>();
  private nextThread = 1;
  private nextCall = 1;

  private readonly track: (action: DocsSampleAction) => void;

  constructor(track: (action: DocsSampleAction) => void) {
    this.track = track;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private commit(patch: Partial<Snapshot>, call?: string) {
    this.snapshot = {
      ...this.snapshot,
      ...patch,
      ...(call && {
        calls: [
          ...this.snapshot.calls,
          { id: this.nextCall++, text: call },
        ].slice(-MAX_CALLS),
      }),
    };
    for (const listener of this.listeners) listener();
  }

  private updateRow(remoteId: string, patch: Partial<Row>, call: string) {
    this.commit(
      {
        rows: this.snapshot.rows.map((row) =>
          row.remoteId === remoteId ? { ...row, ...patch } : row,
        ),
      },
      call,
    );
  }

  private row(remoteId: string) {
    const row = this.snapshot.rows.find((r) => r.remoteId === remoteId);
    if (!row) throw new Error(`Thread "${remoteId}" is not stored.`);
    return row;
  }

  readonly adapter: RemoteThreadListAdapter = {
    list: async () => {
      this.commit({}, "list()");
      return {
        threads: this.snapshot.rows.map((row) => ({ ...row })),
      };
    },
    initialize: async () => {
      const remoteId = `thread_${this.nextThread++}`;
      this.commit(
        {
          rows: [
            { remoteId, status: "regular", title: undefined },
            ...this.snapshot.rows,
          ],
          messages: { ...this.snapshot.messages, [remoteId]: 0 },
        },
        `initialize() → ${remoteId}`,
      );
      return { remoteId, externalId: undefined };
    },
    rename: async (remoteId, title) => {
      this.track("rename_thread");
      this.updateRow(
        remoteId,
        { title },
        `rename(${remoteId}, "${clip(title, 18)}")`,
      );
    },
    archive: async (remoteId) => {
      this.track("archive_thread");
      this.updateRow(remoteId, { status: "archived" }, `archive(${remoteId})`);
    },
    unarchive: async (remoteId) => {
      this.track("unarchive_thread");
      this.updateRow(remoteId, { status: "regular" }, `unarchive(${remoteId})`);
    },
    delete: async (remoteId) => {
      this.track("delete_thread");
      this.stored.delete(remoteId);
      const { [remoteId]: _, ...messages } = this.snapshot.messages;
      this.commit(
        {
          rows: this.snapshot.rows.filter((row) => row.remoteId !== remoteId),
          messages,
        },
        `delete(${remoteId})`,
      );
    },
    fetch: async (remoteId) => ({ ...this.row(remoteId) }),
    generateTitle: async (remoteId, messages) => {
      const first = messages.find((message) => message.role === "user");
      const title = clip(first ? textOf(first) : "New chat", 24);
      this.updateRow(
        remoteId,
        { title },
        `generateTitle(${remoteId}) → "${title}"`,
      );
      return createAssistantStream((controller) => {
        controller.appendText(title);
      });
    },
    // Each thread's runtime calls this hook; its history adapter saves that thread's messages.
    unstable_useAdapters: ((db: MemoryDatabase) =>
      function useMemoryHistory() {
        const aui = useAui();
        return useMemo(() => ({ history: db.history(aui) }), [aui]);
      })(this),
  };

  history(aui: ReturnType<typeof useAui>): ThreadHistoryAdapter {
    return {
      load: async () => {
        const { remoteId } = aui.threadListItem().getState();
        return {
          messages: remoteId ? [...(this.stored.get(remoteId) ?? [])] : [],
        };
      },
      append: async (item) => {
        // The first message creates the thread's row before it is stored.
        const { remoteId } = await aui.threadListItem().initialize();
        if (item.message.role === "user") this.track("send");
        const items = [...(this.stored.get(remoteId) ?? []), item];
        this.stored.set(remoteId, items);
        this.commit(
          { messages: { ...this.snapshot.messages, [remoteId]: items.length } },
          `history.append(${remoteId}, ${item.message.role})`,
        );
      },
    };
  }
}

function StoragePanel({ db }: { db: MemoryDatabase }) {
  const { rows, messages, calls } = useSyncExternalStore(
    db.subscribe,
    db.getSnapshot,
    db.getSnapshot,
  );
  return (
    <section
      aria-label="What the adapter stores"
      className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] grid gap-4 border-t p-4 text-xs md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium">What your adapter stores</div>
        <p className="text-muted-foreground mt-1">
          The thread table your <code>RemoteThreadListAdapter</code> writes, and
          how many messages its history adapter saved for each thread.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full font-mono text-[11px]">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="pr-3 pb-1 font-normal">remoteId</th>
                <th className="pr-3 pb-1 font-normal">status</th>
                <th className="pr-3 pb-1 font-normal">title</th>
                <th className="pb-1 text-right font-normal">messages</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted-foreground py-1">
                    Empty. A thread is stored when its first message is sent.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.remoteId}
                    className={cn(
                      "border-foreground/10 border-t",
                      row.status === "archived" && "text-muted-foreground",
                    )}
                  >
                    <td className="py-1 pr-3">{row.remoteId}</td>
                    <td className="py-1 pr-3">{row.status}</td>
                    <td className="max-w-40 truncate py-1 pr-3">
                      {row.title === undefined ? "—" : `"${row.title}"`}
                    </td>
                    <td className="py-1 text-right">
                      {messages[row.remoteId] ?? 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-muted-foreground mb-1">
          Adapter calls, newest last
        </div>
        <ol
          aria-live="polite"
          className="border-foreground/10 bg-background space-y-0.5 rounded-md border p-2 font-mono text-[11px] leading-snug"
        >
          {calls.map((call) => (
            <li key={call.id} className="break-words">
              {call.text}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Playground() {
  const track = useSampleAnalytics("thread-list-playground");
  const [db] = useState(() => new MemoryDatabase(track));
  const runtime = useRemoteThreadListRuntime({
    adapter: db.adapter,
    runtimeHook: function useDemoThreadRuntime() {
      return useLocalRuntime(model);
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid md:h-104 md:grid-cols-[13rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
        <div className="border-foreground/10 max-h-56 overflow-y-auto border-b p-2 md:max-h-none md:border-r md:border-b-0">
          <ThreadList />
        </div>
        <div className="h-96 min-w-0 md:h-auto">
          <Thread autoFocus={false} />
        </div>
      </div>
      <StoragePanel db={db} />
    </AssistantRuntimeProvider>
  );
}

/** The Threads concept page's playground: a thread list on an in-memory `RemoteThreadListAdapter`, with the rows it stores. */
export function ThreadListPlayground() {
  return (
    <div className="not-prose border-foreground/10 rounded-document my-6 overflow-hidden border">
      <SampleScope>
        <Playground />
      </SampleScope>
    </div>
  );
}
