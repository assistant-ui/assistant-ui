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

/**
 * Builds the fixtures against the local calendar, so each row lands in its
 * intended Today, Yesterday, or Earlier group at any hour.
 */
export function threadListFixtures(now = new Date()) {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const today = (fraction: number) =>
    new Date(startOfToday + (now.getTime() - startOfToday) * fraction);
  const daysAgo = (days: number, hour: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, hour);

  return {
    empty: [],
    grouped: [
      thread("t-1", "Persist composer drafts", today(1)),
      thread("t-2", "Fix flaky checkout test", today(0.5)),
      thread("t-3", "Postgres 17 upgrade plan", daysAgo(1, 18)),
      thread("t-4", "Rate limit headers", daysAgo(1, 9)),
      thread("t-5", "Quarterly usage report", daysAgo(4, 12)),
      thread("t-6", "Onboarding email copy", daysAgo(9, 12)),
    ],
    untitled: [
      thread("t-1", undefined, today(1)),
      thread("t-2", undefined, today(2 / 3)),
      thread("t-3", "Rate limit headers", today(1 / 3)),
    ],
    long: [
      thread(
        "t-1",
        "Why does the staging deploy pick up the production environment variables after a rollback from the release branch",
        today(1),
      ),
      thread(
        "t-2",
        "Compare p95 latency across us-east-1, eu-west-1, and ap-southeast-2 for the last 30 days",
        today(0.5),
      ),
      ...Array.from({ length: 14 }, (_, i) =>
        thread(`t-${i + 3}`, `Support ticket #${4812 - i}`, daysAgo(i + 2, 12)),
      ),
    ],
  } satisfies Record<string, RemoteThreadMetadata[]>;
}

export const THREAD_LIST_FIXTURES = threadListFixtures();

function ThreadListFixture({
  threads,
}: {
  threads: readonly RemoteThreadMetadata[] | "loading";
}) {
  return (
    <ThreadListRuntime threads={threads}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="bg-background h-full max-h-120 w-full max-w-72 overflow-y-auto rounded-2xl p-2">
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
    Component: () => <ThreadListFixture threads={THREAD_LIST_FIXTURES.empty} />,
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
