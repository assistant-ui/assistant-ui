import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resource } from "@assistant-ui/tap";
import { useClientResource } from "@assistant-ui/store/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
  AuiConfig,
  AuiProvider,
  RemoteThreadList,
  type RemoteThreadListAdapter,
} from "@assistant-ui/react";
import type { RemoteThreadMetadata } from "@assistant-ui/core";

import { ThreadList } from "./thread-list.aui";

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

const renderThreadList = (adapter: RemoteThreadListAdapter) =>
  render(
    <AuiProvider
      config={AuiConfig({
        threads: RemoteThreadList({
          adapter,
          thread: () => StubThread() as never,
        }),
      })}
    >
      <ThreadList />
    </AuiProvider>,
  );

const slots = (root: ParentNode, name: string) => [
  ...root.querySelectorAll<HTMLElement>(
    `[data-slot="aui_thread-list-${name}"]`,
  ),
];

const texts = (root: ParentNode, name: string) =>
  slots(root, name).map((node) => node.textContent?.trim());

const searchFor = (root: ParentNode, value: string) => {
  const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
  fireEvent.change(input, { target: { value } });
};

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
  vi.restoreAllMocks();
  cleanup();
  document.body.replaceChildren();
});

describe("ThreadList", () => {
  it("server renders dated threads in runtime order and groups after hydration", async () => {
    const startOfToday = freezeClockAtMidday();
    const datedItems = [
      {
        id: "older",
        remoteId: "older",
        externalId: undefined,
        title: "Older thread",
        lastMessageAt: new Date(startOfToday - 2 * 86_400_000),
        status: "regular" as const,
        isRunning: false,
      },
      {
        id: "newer",
        remoteId: "newer",
        externalId: undefined,
        title: "Newer thread",
        lastMessageAt: new Date(startOfToday + 60_000),
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
    const app = (
      <AuiProvider config={AuiConfig({ threads: StaticThreads() as never })}>
        <ThreadList />
      </AuiProvider>
    );
    const container = document.body.appendChild(document.createElement("div"));
    let root: ReturnType<typeof hydrateRoot> | undefined;
    const RealDate = Date;
    try {
      vi.stubGlobal(
        "Date",
        new Proxy(RealDate, {
          construct(target, args, newTarget) {
            if (args.length === 0) throw new Error("server read the clock");
            return Reflect.construct(target, args, newTarget);
          },
          get(target, property, receiver) {
            if (property === "now") {
              return () => {
                throw new Error("server read the clock");
              };
            }
            return Reflect.get(target, property, receiver);
          },
        }),
      );
      try {
        container.innerHTML = renderToString(app);
      } finally {
        vi.unstubAllGlobals();
      }

      expect(texts(container, "item-title")).toEqual([
        "Older thread",
        "Newer thread",
      ]);
      expect(slots(container, "group-label")).toHaveLength(0);

      const error = vi.spyOn(console, "error");
      await act(async () => {
        root = hydrateRoot(container, app);
      });
      expect(
        error.mock.calls.some((args) =>
          args.some((arg) => /hydrat|mismatch/i.test(String(arg))),
        ),
      ).toBe(false);
      expect(texts(container, "group-label")).toEqual(["Today", "Earlier"]);
    } finally {
      await act(async () => {
        root?.unmount();
      });
      container.remove();
    }
  });

  it("renders one row per thread and no group labels when no thread has a date", async () => {
    const { container } = renderThreadList(
      makeAdapter(withTitles("First thread", "Second thread")),
    );

    await waitFor(() =>
      expect(texts(container, "item-title")).toEqual([
        "First thread",
        "Second thread",
      ]),
    );
    expect(slots(container, "group-label")).toHaveLength(0);
  });

  it("titles an untitled thread with the New Chat fallback", async () => {
    const { container } = renderThreadList(
      makeAdapter([{ remoteId: "t0" }, { remoteId: "t1", title: "Named" }]),
    );

    await waitFor(() =>
      expect(texts(container, "item-title")).toEqual(["New Chat", "Named"]),
    );
  });

  it("hides the search box until the list has threads", async () => {
    const { container } = renderThreadList(makeAdapter([]));

    await waitFor(() => expect(slots(container, "new")).toHaveLength(1));
    expect(slots(container, "search")).toHaveLength(0);
  });

  it("matches titles case-insensitively and ignores surrounding whitespace", async () => {
    const { container } = renderThreadList(
      makeAdapter(withTitles("Trip planning", "Budget review")),
    );

    await waitFor(() => expect(slots(container, "item-title")).toHaveLength(2));

    searchFor(container, "  TRIP  ");
    expect(texts(container, "item-title")).toEqual(["Trip planning"]);
  });

  it("matches the New Chat fallback rather than the missing title", async () => {
    const { container } = renderThreadList(
      makeAdapter([{ remoteId: "t0" }, { remoteId: "t1", title: "Named" }]),
    );

    await waitFor(() => expect(slots(container, "item-title")).toHaveLength(2));

    searchFor(container, "new ch");
    expect(texts(container, "item-title")).toEqual(["New Chat"]);
  });

  it("renders the empty state when the query matches nothing", async () => {
    const { container } = renderThreadList(
      makeAdapter(withTitles("Trip planning")),
    );

    await waitFor(() => expect(slots(container, "item-title")).toHaveLength(1));

    searchFor(container, "budget");
    expect(texts(container, "empty")).toEqual(["No threads found"]);
    expect(slots(container, "item")).toHaveLength(0);
  });

  it("shows skeleton rows while the list loads and drops them once it resolves", async () => {
    let resolveList!: (response: { threads: RemoteThreadMetadata[] }) => void;
    const { container, queryAllByRole } = renderThreadList(
      makeAdapter([], {
        list: () =>
          new Promise((resolve) => {
            resolveList = resolve;
          }),
      }),
    );

    await waitFor(() =>
      expect(slots(container, "skeleton-wrapper")).toHaveLength(5),
    );
    expect(queryAllByRole("status", { name: "Loading threads" })).toHaveLength(
      1,
    );
    expect(
      slots(container, "skeleton-wrapper").every(
        (row) =>
          row.getAttribute("aria-hidden") === "true" &&
          !row.hasAttribute("role") &&
          !row.hasAttribute("aria-label"),
      ),
    ).toBe(true);
    expect(slots(container, "item")).toHaveLength(0);

    resolveList({
      threads: [{ status: "regular", remoteId: "t0", title: "Loaded thread" }],
    });

    await waitFor(() =>
      expect(texts(container, "item-title")).toEqual(["Loaded thread"]),
    );
    expect(slots(container, "skeleton-wrapper")).toHaveLength(0);
    expect(queryAllByRole("status", { name: "Loading threads" })).toHaveLength(
      0,
    );
  });

  it("groups threads by day, newest first, and coalesces a repeated label", async () => {
    const startOfToday = freezeClockAtMidday();
    const { container } = renderThreadList(
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

    await waitFor(() => expect(slots(container, "item-title")).toHaveLength(4));
    expect(texts(container, "group-label")).toEqual([
      "Today",
      "Yesterday",
      "Earlier",
    ]);
    expect(texts(container, "item-title")).toEqual([
      "Just now",
      "Earlier today",
      "Late yesterday",
      "Last week",
    ]);
  });

  it("groups a dateless thread under Today once any thread carries a date", async () => {
    const startOfToday = freezeClockAtMidday();
    const { container } = renderThreadList(
      makeAdapter([
        { remoteId: "t0", title: "No date" },
        {
          remoteId: "t1",
          title: "Last week",
          lastMessageAt: new Date(startOfToday - 6 * 86_400_000),
        },
      ]),
    );

    await waitFor(() => expect(slots(container, "item-title")).toHaveLength(2));
    expect(texts(container, "group-label")).toEqual(["Today", "Earlier"]);
    expect(texts(container, "item-title")).toEqual(["No date", "Last week"]);
  });

  it.each([
    { dayLength: 23, boundaryOffset: 23.5, labels: ["Yesterday", "Earlier"] },
    { dayLength: 25, boundaryOffset: 24.5, labels: ["Yesterday"] },
  ])(
    "uses local calendar boundaries when the previous day has $dayLength hours",
    async ({ dayLength, boundaryOffset, labels }) => {
      const startOfToday = freezeClockAtMidday();
      vi.spyOn(Date.prototype, "setDate").mockImplementation(function (
        this: Date,
      ) {
        return this.setTime(this.getTime() - dayLength * 60 * 60 * 1_000);
      });

      const { container } = renderThreadList(
        makeAdapter([
          {
            remoteId: "t0",
            title: "Recent yesterday",
            lastMessageAt: new Date(startOfToday - 60 * 60 * 1_000),
          },
          {
            remoteId: "t1",
            title: "Boundary thread",
            lastMessageAt: new Date(
              startOfToday - boundaryOffset * 60 * 60 * 1_000,
            ),
          },
        ]),
      );

      await waitFor(() =>
        expect(slots(container, "item-title")).toHaveLength(2),
      );
      expect(texts(container, "group-label")).toEqual(labels);
    },
  );

  it("regroups threads when the local date changes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 31, 23, 59, 59, 500));

    const { container } = renderThreadList(
      makeAdapter([
        {
          remoteId: "t0",
          title: "Late today",
          lastMessageAt: new Date(2026, 7, 31, 12),
        },
      ]),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(texts(container, "group-label")).toEqual(["Today"]);

    vi.setSystemTime(new Date(2026, 7, 31, 23, 59, 59, 498));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(texts(container, "group-label")).toEqual(["Today"]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(texts(container, "group-label")).toEqual(["Yesterday"]);
  });

  it("opens the item menu and archives through the menu item", async () => {
    const adapter = makeAdapter(withTitles("Trip planning"));
    const { container } = renderThreadList(adapter);

    await waitFor(() => expect(slots(container, "item-more")).toHaveLength(1));

    fireEvent.keyDown(slots(container, "item-more")[0]!, { key: "Enter" });
    await waitFor(() =>
      expect(texts(document.body, "item-more-item")).toEqual([
        "Rename",
        "Archive",
        "Delete",
      ]),
    );

    fireEvent.click(slots(document.body, "item-more-item")[1]!);
    await waitFor(() => expect(adapter.archive).toHaveBeenCalledWith("t0"));
  });
});

const openRename = async (container: HTMLElement) => {
  await waitFor(() => expect(slots(container, "item-more")).toHaveLength(1));
  fireEvent.keyDown(slots(container, "item-more")[0]!, { key: "Enter" });
  await waitFor(() =>
    expect(slots(document.body, "item-more-item")[0]).toBeDefined(),
  );
  fireEvent.click(slots(document.body, "item-more-item")[0]!);
  await waitFor(() => expect(slots(container, "item-rename")).toHaveLength(1));
  return slots(container, "item-rename")[0] as HTMLInputElement;
};

describe("ThreadList rename", () => {
  it.each([
    { label: "IME keyCode", event: { key: "Enter", keyCode: 229 } },
    { label: "isComposing", event: { key: "Enter", isComposing: true } },
  ])(
    "ignores Enter during $label and commits on plain Enter",
    async ({ event }) => {
      const adapter = makeAdapter(withTitles("Trip planning"));
      const { container } = renderThreadList(adapter);

      const input = await openRename(container);
      fireEvent.change(input, { target: { value: "Trip notes" } });
      fireEvent.keyDown(input, event);
      await act(async () => {});

      expect(adapter.rename).not.toHaveBeenCalled();
      expect(slots(container, "item-rename")).toHaveLength(1);

      fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() =>
        expect(adapter.rename).toHaveBeenCalledWith("t0", "Trip notes"),
      );
    },
  );

  it("seeds the rename input with the current title and commits the trimmed value", async () => {
    const adapter = makeAdapter(withTitles("Trip planning"));
    const { container } = renderThreadList(adapter);

    const input = await openRename(container);
    expect(input.value).toBe("Trip planning");

    fireEvent.change(input, { target: { value: "  Trip notes  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() =>
      expect(adapter.rename).toHaveBeenCalledWith("t0", "Trip notes"),
    );
    await waitFor(() =>
      expect(slots(container, "item-rename")).toHaveLength(0),
    );
  });

  it("leaves the title alone when the value is unchanged or blank", async () => {
    const adapter = makeAdapter(withTitles("Trip planning"));
    const { container } = renderThreadList(adapter);

    const blank = await openRename(container);
    fireEvent.change(blank, { target: { value: "   " } });
    fireEvent.keyDown(blank, { key: "Enter" });
    await waitFor(() =>
      expect(slots(container, "item-rename")).toHaveLength(0),
    );

    const unchanged = await openRename(container);
    fireEvent.keyDown(unchanged, { key: "Enter" });
    await waitFor(() =>
      expect(slots(container, "item-rename")).toHaveLength(0),
    );

    expect(adapter.rename).not.toHaveBeenCalled();
  });

  it("discards the edit on escape", async () => {
    const adapter = makeAdapter(withTitles("Trip planning"));
    const { container } = renderThreadList(adapter);

    const input = await openRename(container);
    fireEvent.change(input, { target: { value: "Discarded" } });
    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() =>
      expect(slots(container, "item-rename")).toHaveLength(0),
    );
    expect(adapter.rename).not.toHaveBeenCalled();
    expect(texts(container, "item-title")).toEqual(["Trip planning"]);
  });

  it("keeps the editor open when the rename is rejected", async () => {
    const adapter = makeAdapter(withTitles("Trip planning"), {
      rename: vi.fn(async () => {
        throw new Error("rename failed");
      }),
    });
    const { container } = renderThreadList(adapter);

    const input = await openRename(container);
    fireEvent.change(input, { target: { value: "Trip notes" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(adapter.rename).toHaveBeenCalled());
    expect(slots(container, "item-rename")).toHaveLength(1);
  });
});
