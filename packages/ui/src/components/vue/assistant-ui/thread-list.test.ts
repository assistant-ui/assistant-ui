import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { resource } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RemoteThreadList } from "@assistant-ui/core/store";
import type {
  RemoteThreadListAdapter,
  RemoteThreadMetadata,
} from "@assistant-ui/core";
import { AuiProvider } from "@assistant-ui/vue";

import ThreadList from "./thread-list.vue";

const STUB_COMPOSER = { getState: () => ({}) };
const STUB_SUGGESTIONS = { getState: () => ({ suggestions: [] }) };
const STUB_THREAD_STATE = { isRunning: false, messages: [] };

const useStubThread = () => ({
  getState: () => STUB_THREAD_STATE,
  composer: () => STUB_COMPOSER,
  suggestions: () => STUB_SUGGESTIONS,
});
const StubThread = resource(useStubThread);

type ThreadFixture = {
  remoteId: string;
  title?: string | undefined;
  lastMessageAt?: Date | undefined;
};

const makeAdapter = (
  threads: readonly ThreadFixture[],
  overrides: Partial<RemoteThreadListAdapter> = {},
): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: threads.map((thread): RemoteThreadMetadata => ({
      status: "regular",
      ...thread,
    })),
  })),
  initialize: vi.fn(async (threadId: string) => ({
    remoteId: `remote-${threadId}`,
    externalId: undefined,
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream() as never),
  fetch: vi.fn(async (remoteId: string) => ({
    status: "regular" as const,
    remoteId,
    externalId: undefined,
  })),
  ...overrides,
});

const mountThreadList = (adapter: RemoteThreadListAdapter) => {
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          {
            config: AuiConfig({
              threads: RemoteThreadList({
                adapter,
                thread: () => StubThread() as never,
              }),
            }),
          },
          { default: () => h(ThreadList) },
        ),
    }),
  );
  const el = document.body.appendChild(document.createElement("div"));
  app.mount(el);
  return {
    el,
    unmount: () => {
      app.unmount();
      el.remove();
    },
  };
};

const slots = (root: ParentNode, name: string) => [
  ...root.querySelectorAll<HTMLElement>(
    `[data-slot="aui_thread-list-${name}"]`,
  ),
];

const texts = (root: ParentNode, name: string) =>
  slots(root, name).map((node) => node.textContent?.trim());

const searchFor = async (root: ParentNode, value: string) => {
  const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
  input.value = value;
  input.dispatchEvent(new Event("input"));
  await nextTick();
};

const settle = (assert: () => void) =>
  vi.waitFor(async () => {
    await nextTick();
    assert();
  });

const withTitles = (...titles: string[]) =>
  titles.map((title, index) => ({ remoteId: `t${index}`, title }));

const freezeClockAtMidday = () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-08-31T12:00:00Z"));
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
};

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("vue thread list", () => {
  it("renders one row per thread and no group labels when no thread has a date", async () => {
    const { el, unmount } = mountThreadList(
      makeAdapter(withTitles("First thread", "Second thread")),
    );

    await settle(() =>
      expect(texts(el, "item-title")).toEqual([
        "First thread",
        "Second thread",
      ]),
    );
    expect(slots(el, "group-label")).toHaveLength(0);

    unmount();
  });

  it("titles an untitled thread with the New Chat fallback", async () => {
    const { el, unmount } = mountThreadList(
      makeAdapter([{ remoteId: "t0" }, { remoteId: "t1", title: "Named" }]),
    );

    await settle(() =>
      expect(texts(el, "item-title")).toEqual(["New Chat", "Named"]),
    );

    unmount();
  });

  it("hides the search box until the list has threads", async () => {
    const { el, unmount } = mountThreadList(makeAdapter([]));

    await settle(() => expect(slots(el, "new")).toHaveLength(1));
    expect(slots(el, "search")).toHaveLength(0);

    unmount();
  });

  it("matches titles case-insensitively and ignores surrounding whitespace", async () => {
    const { el, unmount } = mountThreadList(
      makeAdapter(withTitles("Trip planning", "Budget review")),
    );

    await settle(() => expect(slots(el, "item-title")).toHaveLength(2));

    await searchFor(el, "  TRIP  ");
    expect(texts(el, "item-title")).toEqual(["Trip planning"]);

    unmount();
  });

  it("matches the New Chat fallback rather than the missing title", async () => {
    const { el, unmount } = mountThreadList(
      makeAdapter([{ remoteId: "t0" }, { remoteId: "t1", title: "Named" }]),
    );

    await settle(() => expect(slots(el, "item-title")).toHaveLength(2));

    await searchFor(el, "new ch");
    expect(texts(el, "item-title")).toEqual(["New Chat"]);

    unmount();
  });

  it("renders the empty state when the query matches nothing", async () => {
    const { el, unmount } = mountThreadList(
      makeAdapter(withTitles("Trip planning")),
    );

    await settle(() => expect(slots(el, "item-title")).toHaveLength(1));

    await searchFor(el, "budget");
    expect(texts(el, "empty")).toEqual(["No threads found"]);
    expect(slots(el, "item")).toHaveLength(0);

    unmount();
  });

  it("shows skeleton rows while the list loads and drops them once it resolves", async () => {
    let resolveList!: (response: { threads: RemoteThreadMetadata[] }) => void;
    const { el, unmount } = mountThreadList(
      makeAdapter([], {
        list: () =>
          new Promise((resolve) => {
            resolveList = resolve;
          }),
      }),
    );

    await settle(() => expect(slots(el, "skeleton-wrapper")).toHaveLength(5));
    expect(
      slots(el, "skeleton-wrapper").every(
        (row) =>
          row.getAttribute("role") === "status" &&
          row.getAttribute("aria-label") === "Loading threads",
      ),
    ).toBe(true);
    expect(slots(el, "item")).toHaveLength(0);

    resolveList({
      threads: [{ status: "regular", remoteId: "t0", title: "Loaded thread" }],
    });

    await settle(() =>
      expect(texts(el, "item-title")).toEqual(["Loaded thread"]),
    );
    expect(slots(el, "skeleton-wrapper")).toHaveLength(0);

    unmount();
  });

  it("groups threads by day, newest first, and coalesces a repeated label", async () => {
    const startOfToday = freezeClockAtMidday();
    const { el, unmount } = mountThreadList(
      makeAdapter([
        {
          remoteId: "t0",
          title: "Last week",
          lastMessageAt: new Date(startOfToday - 6 * 86_400_000),
        },
        {
          remoteId: "t1",
          title: "Earlier today",
          lastMessageAt: new Date(startOfToday + 1_000),
        },
        {
          remoteId: "t2",
          title: "Just now",
          lastMessageAt: new Date(startOfToday + 60_000),
        },
        {
          remoteId: "t3",
          title: "Late yesterday",
          lastMessageAt: new Date(startOfToday - 1_000),
        },
      ]),
    );

    await settle(() => expect(slots(el, "item-title")).toHaveLength(4));
    expect(texts(el, "group-label")).toEqual(["Today", "Yesterday", "Earlier"]);
    expect(texts(el, "item-title")).toEqual([
      "Just now",
      "Earlier today",
      "Late yesterday",
      "Last week",
    ]);

    unmount();
  });

  it("groups a dateless thread under Today once any thread carries a date", async () => {
    const startOfToday = freezeClockAtMidday();
    const { el, unmount } = mountThreadList(
      makeAdapter([
        { remoteId: "t0", title: "No date" },
        {
          remoteId: "t1",
          title: "Last week",
          lastMessageAt: new Date(startOfToday - 6 * 86_400_000),
        },
      ]),
    );

    await settle(() => expect(slots(el, "item-title")).toHaveLength(2));
    expect(texts(el, "group-label")).toEqual(["Today", "Earlier"]);
    expect(texts(el, "item-title")).toEqual(["No date", "Last week"]);

    unmount();
  });

  it("opens the item menu and archives through the menu item", async () => {
    const adapter = makeAdapter(withTitles("Trip planning"));
    const { el, unmount } = mountThreadList(adapter);

    await settle(() => expect(slots(el, "item-more")).toHaveLength(1));

    slots(el, "item-more")[0]!.click();
    await settle(() =>
      expect(texts(document.body, "item-more-item")).toEqual([
        "Archive",
        "Delete",
      ]),
    );

    slots(document.body, "item-more-item")[0]!.click();
    await vi.waitFor(() => expect(adapter.archive).toHaveBeenCalledWith("t0"));

    unmount();
  });
});
