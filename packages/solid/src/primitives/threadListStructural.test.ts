import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, type JSX } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { useState } from "react";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type { ExternalStoreAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import {
  ThreadListItemPrimitiveTitle,
  ThreadListPrimitiveItems,
} from "./threadList";
import {
  ThreadListItemPrimitiveArchive,
  ThreadListItemPrimitiveDelete,
  ThreadListItemPrimitiveUnarchive,
  ThreadListPrimitiveLoadMore,
} from "./threadListStructural";

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

const mount = (config: AuiConfig, view: () => JSX.Element) => {
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config,
        get children() {
          return createComponent(view, {});
        },
      }),
    el,
  );
  disposers.push(() => {
    dispose();
    el.remove();
  });
  return el;
};

const createClients = () => {
  const initial = {
    hasMore: true,
    isLoading: false,
    isLoadingMore: false,
    canUnarchive: true,
  };
  let update!: (flags: Partial<typeof initial>) => void;
  const loadMore = vi.fn(async () => {});
  const archive = vi.fn();
  const unarchive = vi.fn();
  const deleteItem = vi.fn();
  const useThreads = () => {
    const [state, setState] = useState(initial);
    update = (flags) => setState((state) => ({ ...state, ...flags }));
    return { getState: () => state, loadMore };
  };
  const Threads = resource(useThreads);
  const useItem = () => ({
    getState: () => ({ id: "t1", title: "First thread" }),
    archive,
    unarchive,
    delete: deleteItem,
  });
  const Item = resource(useItem);
  return {
    config: AuiConfig({ threads: Threads(), threadListItem: Item() } as never),
    update: (flags: Partial<typeof initial>) =>
      flushTapSync(() => update(flags)),
    loadMore,
    archive,
    unarchive,
    deleteItem,
  };
};

type DemoThread = { id: string; title: string };

const createTestRuntime = () => {
  let threads: DemoThread[] = [
    { id: "t1", title: "First thread" },
    { id: "t2", title: "Second thread" },
  ];
  let archivedThreads: DemoThread[] = [{ id: "ta", title: "Archived thread" }];
  let core!: ExternalStoreRuntimeCore;
  const sync = () => core.setAdapter(makeAdapter());
  const onArchive = vi.fn((threadId: string) => {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread) return;
    threads = threads.filter((item) => item.id !== threadId);
    archivedThreads = [...archivedThreads, thread];
    sync();
  });
  const onUnarchive = vi.fn((threadId: string) => {
    const thread = archivedThreads.find((item) => item.id === threadId);
    if (!thread) return;
    archivedThreads = archivedThreads.filter((item) => item.id !== threadId);
    threads = [...threads, thread];
    sync();
  });
  const onDelete = vi.fn((threadId: string) => {
    threads = threads.filter((item) => item.id !== threadId);
    archivedThreads = archivedThreads.filter((item) => item.id !== threadId);
    sync();
  });
  const makeAdapter = (): ExternalStoreAdapter => ({
    messages: [],
    onNew: async () => {},
    adapters: {
      threadList: {
        threadId: "t1",
        threads: threads.map((thread) => ({
          status: "regular" as const,
          ...thread,
        })),
        archivedThreads: archivedThreads.map((thread) => ({
          status: "archived" as const,
          ...thread,
        })),
        onArchive,
        onUnarchive,
        onDelete,
      },
    },
  });
  core = new ExternalStoreRuntimeCore(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    onArchive,
    onUnarchive,
    onDelete,
  };
};

const findThreadItem = (el: HTMLElement, selector: string, title: string) => {
  const item = [...el.querySelectorAll<HTMLElement>(selector)].find(
    (node) => node.querySelector(".title")?.textContent === title,
  );
  if (!item) throw new Error(`Could not find ${title}`);
  return item;
};

describe("thread list structural primitives", () => {
  it("keeps load more mounted, disables it when unavailable, and calls the runtime", () => {
    const { config, loadMore, update } = createClients();
    const el = mount(config, () =>
      createComponent(ThreadListPrimitiveLoadMore, {
        class: "load-more",
        disabled: false,
        children: "Load more",
      }),
    );
    const button = el.querySelector("button")!;
    expect(button.type).toBe("button");
    expect(button.className).toBe("load-more");
    expect(button.textContent).toBe("Load more");
    expect(button.disabled).toBe(false);
    flushTapSync(() => button.click());
    expect(loadMore).toHaveBeenCalledTimes(1);
    update({ isLoading: true });
    expect(button.disabled).toBe(true);
    update({ isLoading: false, isLoadingMore: true });
    expect(button.disabled).toBe(true);
    update({ isLoadingMore: false, hasMore: false });
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(loadMore).toHaveBeenCalledTimes(1);
    expect(el.querySelector("button")).toBe(button);
    update({ hasMore: true });
    expect(button.disabled).toBe(false);
  });

  it("archives, unarchives, and deletes thread list items", async () => {
    const { runtime, onArchive, onUnarchive, onDelete } = createTestRuntime();
    const Item = (props: { archived?: boolean }) =>
      createComponent(Dynamic, {
        component: "div",
        get class() {
          return props.archived ? "archived-item" : "regular-item";
        },
        get children() {
          return [
            createComponent(Dynamic, {
              component: "span",
              class: "title",
              get children() {
                return createComponent(ThreadListItemPrimitiveTitle, {});
              },
            }),
            props.archived
              ? createComponent(ThreadListItemPrimitiveUnarchive, {
                  class: "unarchive",
                  children: "Unarchive",
                })
              : createComponent(ThreadListItemPrimitiveArchive, {
                  class: "archive",
                  children: "Archive",
                }),
            createComponent(ThreadListItemPrimitiveDelete, {
              class: "delete",
              children: "Delete",
            }),
          ];
        },
      });
    const el = mount(AuiConfig({ threads: RuntimeAdapter(runtime) }), () => [
      createComponent(ThreadListPrimitiveItems, {
        get children() {
          return createComponent(Item, {});
        },
      }),
      createComponent(ThreadListPrimitiveItems, {
        archived: true,
        get children() {
          return createComponent(Item, { archived: true });
        },
      }),
    ]);
    expect(el.querySelectorAll(".regular-item")).toHaveLength(2);
    flushTapSync(() =>
      findThreadItem(el, ".regular-item", "First thread")
        .querySelector<HTMLButtonElement>("button.archive")!
        .click(),
    );
    await vi.waitFor(() => {
      expect(onArchive).toHaveBeenCalledWith("t1");
      expect(
        findThreadItem(el, ".archived-item", "First thread"),
      ).toBeDefined();
    });
    flushTapSync(() =>
      findThreadItem(el, ".archived-item", "First thread")
        .querySelector<HTMLButtonElement>("button.unarchive")!
        .click(),
    );
    await vi.waitFor(() => {
      expect(onUnarchive).toHaveBeenCalledWith("t1");
      expect(findThreadItem(el, ".regular-item", "First thread")).toBeDefined();
    });
    flushTapSync(() =>
      findThreadItem(el, ".regular-item", "First thread")
        .querySelector<HTMLButtonElement>("button.delete")!
        .click(),
    );
    await vi.waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith("t1");
      expect(
        [...el.querySelectorAll<HTMLElement>(".regular-item")].some(
          (item) =>
            item.querySelector(".title")?.textContent === "First thread",
        ),
      ).toBe(false);
    });
    expect(el.querySelectorAll(".regular-item")).toHaveLength(1);
    expect(el.querySelectorAll(".archived-item")).toHaveLength(1);
  });

  it.each([
    ["load more", ThreadListPrimitiveLoadMore, "loadMore"],
    ["archive", ThreadListItemPrimitiveArchive, "archive"],
    ["unarchive", ThreadListItemPrimitiveUnarchive, "unarchive"],
    ["delete", ThreadListItemPrimitiveDelete, "deleteItem"],
  ] as const)(
    "runs the caller's bound handler before %s and honors its veto",
    (_name, Component, action) => {
      const clients = createClients();
      const [veto, setVeto] = createSignal(true);
      const handler = vi.fn((data: string, event: MouseEvent) => {
        expect(data).toBe("caller");
        expect(clients[action]).not.toHaveBeenCalled();
        if (veto()) event.preventDefault();
      });
      const el = mount(clients.config, () =>
        createComponent(Component, { onClick: [handler, "caller"] }),
      );
      flushTapSync(() => el.querySelector("button")!.click());
      expect(handler).toHaveBeenCalledOnce();
      expect(clients[action]).not.toHaveBeenCalled();
      setVeto(false);
      flushTapSync(() => el.querySelector("button")!.click());
      expect(clients[action]).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ["load more", ThreadListPrimitiveLoadMore, "loadMore"],
    ["archive", ThreadListItemPrimitiveArchive, "archive"],
    ["unarchive", ThreadListItemPrimitiveUnarchive, "unarchive"],
    ["delete", ThreadListItemPrimitiveDelete, "deleteItem"],
  ] as const)(
    "honors live disabled props for %s even if the DOM is forcibly enabled",
    (_name, Component, action) => {
      const clients = createClients();
      const [disabled, setDisabled] = createSignal(true);
      const el = mount(clients.config, () =>
        createComponent(Component, {
          get disabled() {
            return disabled();
          },
        }),
      );
      const button = el.querySelector("button")!;
      expect(button.disabled).toBe(true);
      button.disabled = false;
      flushTapSync(() => button.click());
      expect(clients[action]).not.toHaveBeenCalled();
      setDisabled(false);
      flushTapSync(() => button.click());
      expect(clients[action]).toHaveBeenCalledOnce();
    },
  );

  it("blocks unarchive when adapter support is absent even after the DOM is enabled", () => {
    const clients = createClients();
    const el = mount(clients.config, () =>
      createComponent(ThreadListItemPrimitiveUnarchive, { disabled: false }),
    );
    clients.update({ canUnarchive: false });
    const button = el.querySelector("button")!;
    expect(button.disabled).toBe(true);
    button.disabled = false;
    flushTapSync(() => button.click());
    expect(clients.unarchive).not.toHaveBeenCalled();
  });
});
