import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { resource } from "@assistant-ui/tap";
import { AuiConfig, useClientResource } from "@assistant-ui/store/client";
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
  it("server renders dated threads in runtime order without reading the clock", async () => {
    const datedItems = [
      {
        id: "older",
        remoteId: "older",
        externalId: undefined,
        title: "Older thread",
        lastMessageAt: new Date("2026-08-29T12:00:00Z"),
        status: "regular" as const,
        isRunning: false,
      },
      {
        id: "newer",
        remoteId: "newer",
        externalId: undefined,
        title: "Newer thread",
        lastMessageAt: new Date("2026-08-31T12:00:00Z"),
        status: "regular" as const,
        isRunning: false,
      },
    ];
    const state = {
      mainThreadId: "older",
      newThreadId: null,
      isLoading: false,
      loadError: undefined,
      isLoadingMore: false,
      hasMore: false,
      threadIds: datedItems.map((item) => item.id),
      archivedThreadIds: [],
      threadItems: datedItems,
      main: STUB_THREAD_STATE,
    };
    const useStaticItem = ({ index }: { index: number }) => ({
      getState: () => datedItems[index]!,
    });
    const StaticItem = resource(useStaticItem);
    const useStaticThreads = () => {
      const older = useClientResource(StaticItem({ index: 0 }));
      const newer = useClientResource(StaticItem({ index: 1 }));
      const items = [older.methods, newer.methods];
      return {
        getState: () => state,
        item: ({ index }: { index: number }) => items[index],
        switchToNewThread: () => {},
      };
    };
    const StaticThreads = resource(useStaticThreads);
    const app = createSSRApp(
      defineComponent({
        setup: () => () =>
          h(
            AuiProvider,
            { config: AuiConfig({ threads: StaticThreads() as never }) },
            { default: () => h(ThreadList) },
          ),
      }),
    );
    const clock = vi.spyOn(globalThis, "Date");
    const now = vi.spyOn(Date, "now");
    try {
      const html = await renderToString(app);
      expect(html).toContain("Older thread");
      expect(html).toContain("Newer thread");
      expect(html.indexOf("Older thread")).toBeLessThan(
        html.indexOf("Newer thread"),
      );
      expect(html).not.toContain('data-slot="aui_thread-list-group-label"');
      expect(clock).not.toHaveBeenCalledWith();
      expect(now).not.toHaveBeenCalled();
    } finally {
      now.mockRestore();
      clock.mockRestore();
    }
  });

  it("regroups threads when the local date changes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 31, 23, 59, 58));
    const { el, unmount } = mountThreadList(
      makeAdapter([
        {
          remoteId: "t0",
          title: "Late today",
          lastMessageAt: new Date(2026, 7, 31, 12),
        },
      ]),
    );

    await settle(() => expect(texts(el, "group-label")).toEqual(["Today"]));

    await vi.advanceTimersByTimeAsync(2_000);
    await nextTick();
    expect(texts(el, "group-label")).toEqual(["Yesterday"]);
    unmount();
  });

  it("groups threads by calendar day across a daylight saving transition", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 2, 9, 12));
    const { el, unmount } = mountThreadList(
      makeAdapter([
        {
          remoteId: "before-yesterday",
          title: "Before yesterday",
          lastMessageAt: new Date(2026, 2, 7, 23, 30),
        },
        {
          remoteId: "yesterday",
          title: "Yesterday",
          lastMessageAt: new Date(2026, 2, 8, 0, 30),
        },
      ]),
    );

    await settle(() => {
      expect(texts(el, "group-label")).toEqual(["Yesterday", "Earlier"]);
      expect(texts(el, "item-title")).toEqual([
        "Yesterday",
        "Before yesterday",
      ]);
    });

    unmount();
  });

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
      el.querySelectorAll('[role="status"][aria-label="Loading threads"]'),
    ).toHaveLength(1);
    expect(
      slots(el, "skeleton-wrapper").every(
        (row) =>
          row.getAttribute("aria-hidden") === "true" &&
          !row.hasAttribute("role") &&
          !row.hasAttribute("aria-label"),
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
    expect(
      el.querySelectorAll('[role="status"][aria-label="Loading threads"]'),
    ).toHaveLength(0);

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

    await settle(() =>
      expect(texts(el, "group-label")).toEqual([
        "Today",
        "Yesterday",
        "Earlier",
      ]),
    );
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

    await settle(() =>
      expect(texts(el, "group-label")).toEqual(["Today", "Earlier"]),
    );
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
