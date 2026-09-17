import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { resource } from "@assistant-ui/tap";
import {
  AuiConfig,
  AuiProvider,
  RemoteThreadList,
  type RemoteThreadListAdapter,
} from "@assistant-ui/react";
import type { RemoteThreadMetadata } from "@assistant-ui/core";

import { AssistantModal as AssistantModalBase } from "./assistant-modal.aui";
import { AssistantModal as AssistantModalRadix } from "./assistant-modal.aui.radix";

vi.mock("./thread.aui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./thread.aui")>()),
  Thread: () => <div className="thread-stub" />,
}));

const SIZE_STORAGE_KEY = "aui-modal-size";

const STUB_COMPOSER = { getState: () => ({}) };
const STUB_SUGGESTIONS = { getState: () => ({ suggestions: [] }) };
const STUB_THREAD_STATE = { isRunning: false, messages: [] };

const useStubThread = () => ({
  getState: () => STUB_THREAD_STATE,
  composer: () => STUB_COMPOSER,
  suggestions: () => STUB_SUGGESTIONS,
});
const StubThread = resource(useStubThread);

type ThreadFixture = { remoteId: string; title?: string | undefined };

const makeAdapter = (
  threads: readonly ThreadFixture[],
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
});

const withTitles = (...titles: string[]) =>
  titles.map((title, index) => ({ remoteId: `t${index}`, title }));

const flavors = [
  ["base", AssistantModalBase],
  ["radix", AssistantModalRadix],
] as const;

const part = (name: string) =>
  document.body.querySelector<HTMLElement>(`.aui-modal-${name}`);

const itemTitles = () =>
  [
    ...document.body.querySelectorAll<HTMLElement>(
      '[data-slot="aui_thread-list-item-title"]',
    ),
  ].map((node) => node.textContent?.trim());

const itemTrigger = (title: string) =>
  [
    ...document.body.querySelectorAll<HTMLElement>(
      '[data-slot="aui_thread-list-item-trigger"]',
    ),
  ].find((node) => node.textContent?.trim() === title)!;

const toggleModal = () => fireEvent.click(part("button")!);

const openModal = async () => {
  toggleModal();
  await waitFor(() => expect(part("header")).toBeTruthy());
};

const threadsToggle = () => part("threads") as HTMLButtonElement;

const openThreadList = async () => {
  await waitFor(() => expect(threadsToggle().disabled).toBe(false));
  fireEvent.click(threadsToggle());
  await waitFor(() => expect(part("thread-list")).toBeTruthy());
};

const contentSize = () => {
  const { width, height } = part("content")!.style;
  return { width, height };
};

const renderedAt = (width: number, height: number) =>
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });

class StubPointerEvent extends MouseEvent {
  readonly pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  globalThis.PointerEvent ??= StubPointerEvent as never;
  if (!("setPointerCapture" in Element.prototype)) {
    Object.assign(Element.prototype, { setPointerCapture() {} });
  }
});

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe.each(flavors)("AssistantModal (%s)", (_flavor, AssistantModal) => {
  const renderModal = (adapter: RemoteThreadListAdapter) =>
    render(
      <AuiProvider
        config={AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: () => StubThread() as never,
          }),
        })}
      >
        <AssistantModal />
      </AuiProvider>,
    );

  it("opens on the thread, named by its title, with the threads toggle disabled while nothing is listed", async () => {
    renderModal(makeAdapter([]));
    await openModal();

    expect(screen.getByRole("dialog", { name: "New Chat" })).toBeTruthy();
    expect(threadsToggle().disabled).toBe(true);
    expect(threadsToggle().getAttribute("aria-pressed")).toBe("false");
    expect(part("thread-list")).toBeNull();
    expect(document.body.querySelector(".thread-stub")).toBeTruthy();
  });

  it("lists the threads behind the threads toggle and opens the picked one", async () => {
    renderModal(makeAdapter(withTitles("Trip planning", "Budget review")));
    await openModal();
    await openThreadList();

    expect(part("title")!.textContent).toBe("Threads");
    expect(threadsToggle().getAttribute("aria-pressed")).toBe("true");
    expect(part("thread")!.hasAttribute("inert")).toBe(true);
    await waitFor(() =>
      expect(itemTitles()).toEqual(["Trip planning", "Budget review"]),
    );

    itemTrigger("Budget review").focus();
    fireEvent.click(itemTrigger("Budget review"));
    await waitFor(() =>
      expect(part("title")!.textContent).toBe("Budget review"),
    );
    expect(part("thread-list")).toBeNull();
    expect(part("thread")!.hasAttribute("inert")).toBe(false);
    expect(threadsToggle().getAttribute("aria-pressed")).toBe("false");
    await waitFor(() => expect(document.activeElement).toBe(part("title")));
  });

  it("returns to the conversation when the threads toggle is pressed again", async () => {
    renderModal(makeAdapter(withTitles("Trip planning")));
    await openModal();
    await openThreadList();

    fireEvent.click(threadsToggle());
    await waitFor(() => expect(part("thread-list")).toBeNull());
    expect(part("title")!.textContent).toBe("New Chat");
    expect(threadsToggle().getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps the title in place across both views", async () => {
    renderModal(makeAdapter(withTitles("Trip planning")));
    await openModal();
    const header = part("header")!;
    const titleIndex = () => [...header.children].indexOf(part("title")!);

    expect(titleIndex()).toBe(0);
    await openThreadList();
    expect(titleIndex()).toBe(0);
  });

  it("starts a new thread from the list", async () => {
    renderModal(makeAdapter(withTitles("Trip planning")));
    await openModal();
    await openThreadList();

    fireEvent.click(part("new")!);
    await waitFor(() => expect(part("thread-list")).toBeNull());
    expect(part("title")!.textContent).toBe("New Chat");
  });

  it("reopens on the thread after closing from the list", async () => {
    renderModal(makeAdapter(withTitles("Trip planning")));
    await openModal();
    await openThreadList();

    toggleModal();
    await waitFor(() => expect(part("header")).toBeNull());
    await openModal();
    expect(part("thread-list")).toBeNull();
    expect(part("title")!.textContent).toBe("New Chat");
  });

  it("resizes from the top start corner and remembers the size", async () => {
    renderedAt(400, 500);
    renderModal(makeAdapter([]));
    await openModal();
    const handle = part("resize-handle")!;

    fireEvent.pointerDown(handle, {
      pointerId: 1,
      button: 0,
      clientX: 300,
      clientY: 300,
    });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 260, clientY: 240 });
    expect(contentSize()).toEqual({ width: "440px", height: "560px" });
    expect(window.localStorage.getItem(SIZE_STORAGE_KEY)).toBeNull();

    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 250, clientY: 230 });
    expect(contentSize()).toEqual({ width: "450px", height: "570px" });
    expect(JSON.parse(window.localStorage.getItem(SIZE_STORAGE_KEY)!)).toEqual({
      width: 450,
      height: 570,
    });
  });

  it("keeps the default size when the handle is clicked without a drag", async () => {
    renderedAt(400, 500);
    renderModal(makeAdapter([]));
    await openModal();
    const handle = part("resize-handle")!;

    fireEvent.pointerDown(handle, {
      pointerId: 1,
      button: 0,
      clientX: 300,
      clientY: 300,
    });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 300, clientY: 300 });

    expect(contentSize()).toEqual({ width: "", height: "" });
    expect(window.localStorage.getItem(SIZE_STORAGE_KEY)).toBeNull();
  });

  it("resizes from the keyboard", async () => {
    renderedAt(400, 500);
    renderModal(makeAdapter([]));
    await openModal();
    const handle = part("resize-handle")!;

    fireEvent.keyDown(handle, { key: "ArrowUp", shiftKey: true });
    expect(contentSize()).toEqual({ width: "400px", height: "564px" });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(contentSize()).toEqual({ width: "416px", height: "500px" });
    fireEvent.keyDown(handle, { key: "Enter" });
    expect(contentSize()).toEqual({ width: "416px", height: "500px" });
  });

  it("restores a remembered size within the viewport and resets it on double click", async () => {
    window.localStorage.setItem(
      SIZE_STORAGE_KEY,
      JSON.stringify({ width: 5000, height: 200 }),
    );
    renderModal(makeAdapter([]));
    await openModal();
    expect(contentSize()).toEqual({
      width: `${window.innerWidth - 32}px`,
      height: "400px",
    });

    fireEvent.doubleClick(part("resize-handle")!);
    expect(contentSize()).toEqual({ width: "", height: "" });
    expect(window.localStorage.getItem(SIZE_STORAGE_KEY)).toBeNull();
  });
});
