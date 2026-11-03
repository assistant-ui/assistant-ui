"use client";

import { useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  InMemoryThreadListAdapter,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type RemoteThreadListAdapter,
} from "@assistant-ui/react";
import { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";
import { SampleScope } from "@/components/pages/docs/samples/sample-scope";
import { defineStates } from "./types";

const noOpAdapter: ChatModelAdapter = {
  async *run() {
    yield { content: [{ type: "text", text: "This is a demo." }] };
  },
};

type RemoteThreadListResponse = Awaited<
  ReturnType<RemoteThreadListAdapter["list"]>
>;
export type RemoteThreadMetadata = RemoteThreadListResponse["threads"][number];

/** In-memory list that starts with saved threads, or never finishes loading. */
class SeededThreadListAdapter extends InMemoryThreadListAdapter {
  private readonly seeded: readonly RemoteThreadMetadata[] | "loading";

  constructor(seeded: readonly RemoteThreadMetadata[] | "loading") {
    super();
    this.seeded = seeded;
  }

  override list(): Promise<RemoteThreadListResponse> {
    if (this.seeded === "loading") return new Promise(() => {});
    return Promise.resolve({ threads: [...this.seeded] });
  }

  override fetch(threadId: string): Promise<RemoteThreadMetadata> {
    const seeded =
      this.seeded === "loading"
        ? undefined
        : this.seeded.find((thread) => thread.remoteId === threadId);
    return seeded ? Promise.resolve(seeded) : super.fetch(threadId);
  }
}

function SeededRuntime({
  threads,
  children,
}: {
  threads: readonly RemoteThreadMetadata[] | "loading";
  children: ReactNode;
}) {
  const adapter = useMemo(
    () => new SeededThreadListAdapter(threads),
    [threads],
  );
  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function SeededRuntimeHook() {
      return useLocalRuntime(noOpAdapter);
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

/** Shared with the thread list sidebar states. */
export function ThreadListRuntime(props: {
  threads: readonly RemoteThreadMetadata[] | "loading";
  children: ReactNode;
}) {
  return (
    <SampleScope>
      <SeededRuntime {...props} />
    </SampleScope>
  );
}

const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms);

const thread = (
  remoteId: string,
  title: string | undefined,
  lastMessageAt: Date,
): RemoteThreadMetadata => ({
  status: "regular",
  remoteId,
  title,
  lastMessageAt,
});

export const THREAD_LIST_FIXTURES = {
  grouped: [
    thread("t-1", "Persist composer drafts", ago(20 * 60 * 1000)),
    thread("t-2", "Fix flaky checkout test", ago(3 * 60 * 60 * 1000)),
    thread("t-3", "Postgres 17 upgrade plan", ago(DAY + 2 * 60 * 60 * 1000)),
    thread("t-4", "Rate limit headers", ago(DAY + 5 * 60 * 60 * 1000)),
    thread("t-5", "Quarterly usage report", ago(4 * DAY)),
    thread("t-6", "Onboarding email copy", ago(9 * DAY)),
  ],
  untitled: [
    thread("t-1", undefined, ago(5 * 60 * 1000)),
    thread("t-2", undefined, ago(40 * 60 * 1000)),
    thread("t-3", "Rate limit headers", ago(2 * 60 * 60 * 1000)),
  ],
  long: [
    thread(
      "t-1",
      "Why does the staging deploy pick up the production environment variables after a rollback from the release branch",
      ago(10 * 60 * 1000),
    ),
    thread(
      "t-2",
      "Compare p95 latency across us-east-1, eu-west-1, and ap-southeast-2 for the last 30 days",
      ago(2 * 60 * 60 * 1000),
    ),
    ...Array.from({ length: 14 }, (_, i) =>
      thread(`t-${i + 3}`, `Support ticket #${4812 - i}`, ago((i + 2) * DAY)),
    ),
  ],
} satisfies Record<string, RemoteThreadMetadata[]>;

function ThreadListFixture({
  threads,
}: {
  threads: readonly RemoteThreadMetadata[] | "loading";
}) {
  return (
    <ThreadListRuntime threads={threads}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="bg-background h-full max-h-120 w-full max-w-72 overflow-y-auto rounded-2xl p-2 shadow-sm">
          <ThreadList />
        </div>
      </div>
    </ThreadListRuntime>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "loading",
    label: "Loading",
    note: "The thread list request has not returned, so skeleton rows hold the space.",
    Component: () => <ThreadListFixture threads="loading" />,
  },
  {
    key: "empty",
    label: "Empty",
    note: "No saved threads, so only the new thread button shows and search is hidden.",
    Component: () => <ThreadListFixture threads={[]} />,
  },
  {
    key: "grouped",
    label: "Grouped",
    note: "Saved threads sort by last activity under Today, Yesterday, and Earlier.",
    Component: () => (
      <ThreadListFixture threads={THREAD_LIST_FIXTURES.grouped} />
    ),
  },
  {
    key: "untitled",
    label: "Untitled",
    note: "Threads without a generated title fall back to New Chat.",
    Component: () => (
      <ThreadListFixture threads={THREAD_LIST_FIXTURES.untitled} />
    ),
  },
  {
    key: "long-content",
    label: "Long list",
    note: "Long titles truncate to one line and many threads scroll.",
    Component: () => <ThreadListFixture threads={THREAD_LIST_FIXTURES.long} />,
  },
]);
