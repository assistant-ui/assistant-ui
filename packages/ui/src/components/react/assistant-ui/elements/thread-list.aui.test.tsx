import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resource } from "@assistant-ui/tap";
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
          thread: () => StubThread({}) as never,
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
  cleanup();
  document.body.replaceChildren();
});

describe("ThreadList", () => {
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
    const { container } = renderThreadList(
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
    expect(
      slots(container, "skeleton-wrapper").every(
        (row) =>
          row.getAttribute("role") === "status" &&
          row.getAttribute("aria-label") === "Loading threads",
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
