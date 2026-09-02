// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import {
  createTapRoot,
  flushTapSync,
  resource,
  useResource,
} from "@assistant-ui/tap";
import type { Unstable_TriggerAdapter } from "@assistant-ui/core";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TriggerNavigationResource } from "../primitives/composer/trigger/triggerNavigationResource";
import { unstable_useMentionAdapter } from "./useMentionAdapter";

const runtime = vi.hoisted(() => {
  const state = {
    tools: {} as Record<string, { description?: string }>,
  };
  const listeners = new Map<string, Set<() => void>>();
  const events: string[] = [];
  return {
    state,
    listeners,
    events,
    client: {
      thread: {
        getModelContext: () => ({ tools: state.tools }),
      },
      on: (
        selector: string | { scope: string; event: string },
        listener: () => void,
      ) => {
        const event = typeof selector === "string" ? selector : selector.event;
        events.push(event);
        const eventListeners = listeners.get(event) ?? new Set();
        eventListeners.add(listener);
        listeners.set(event, eventListeners);
        return () => eventListeners.delete(listener);
      },
    },
    emit: (event: string) =>
      listeners.get(event)?.forEach((listener) => listener()),
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => runtime.client,
}));

const TestNavigationResource = resource(function useTestNavigationResource(
  initialAdapter: Unstable_TriggerAdapter,
) {
  const [adapter, setAdapter] = useState(initialAdapter);
  const navigation = useResource(
    TriggerNavigationResource({ adapter, query: "", open: true }),
  );
  return { navigation, setAdapter };
});

describe("unstable_useMentionAdapter", () => {
  beforeEach(() => {
    runtime.state.tools = {};
    runtime.listeners.clear();
    runtime.events.length = 0;
  });

  it("keeps categorized model-context tools current", () => {
    runtime.state.tools = {
      searchDocs: { description: "Search documentation" },
    };

    const { result } = renderHook(() =>
      unstable_useMentionAdapter({
        categories: [{ id: "people", label: "People", items: [] }],
        includeModelContextTools: true,
      }),
    );
    const initialAdapter = result.current.adapter;
    const navigationRoot = createTapRoot(function NavigationRoot() {
      return useResource(TestNavigationResource(initialAdapter));
    });

    expect(navigationRoot.getValue().navigation.categories).toEqual([
      { id: "people", label: "People" },
      { id: "tools", label: "Tools" },
    ]);
    expect(runtime.events).toContain("thread.modelContextUpdate");

    act(() =>
      flushTapSync(() =>
        navigationRoot.getValue().navigation.selectCategory("tools"),
      ),
    );

    expect(navigationRoot.getValue().navigation.items).toEqual([
      {
        id: "searchDocs",
        type: "tool",
        label: "searchDocs",
        description: "Search documentation",
      },
    ]);

    act(() => {
      runtime.state.tools = {
        createIssue: { description: "Create an issue" },
      };
      runtime.emit("thread.modelContextUpdate");
    });

    expect(result.current.adapter).not.toBe(initialAdapter);
    act(() =>
      flushTapSync(() =>
        navigationRoot.getValue().setAdapter(result.current.adapter),
      ),
    );
    expect(navigationRoot.getValue().navigation.items).toEqual([
      {
        id: "createIssue",
        type: "tool",
        label: "createIssue",
        description: "Create an issue",
      },
    ]);
    act(() => {
      runtime.state.tools = {};
      runtime.emit("thread.modelContextUpdate");
    });
    act(() =>
      flushTapSync(() =>
        navigationRoot.getValue().setAdapter(result.current.adapter),
      ),
    );

    expect(navigationRoot.getValue().navigation.categories).toEqual([
      { id: "people", label: "People" },
    ]);
    expect(navigationRoot.getValue().navigation.items).toEqual([]);
    navigationRoot.unmount();
  });

  it("keeps flat model-context tools current while navigation is open", () => {
    runtime.state.tools = {
      searchDocs: { description: "Search documentation" },
    };

    const { result } = renderHook(() => unstable_useMentionAdapter());
    const initialAdapter = result.current.adapter;
    const navigationRoot = createTapRoot(function NavigationRoot() {
      return useResource(TestNavigationResource(initialAdapter));
    });

    expect(runtime.events).toContain("thread.modelContextUpdate");

    expect(navigationRoot.getValue().navigation.items).toEqual([
      {
        id: "searchDocs",
        type: "tool",
        label: "searchDocs",
        description: "Search documentation",
      },
    ]);

    act(() => {
      runtime.state.tools = {
        createIssue: { description: "Create an issue" },
      };
      runtime.emit("thread.modelContextUpdate");
    });

    expect(result.current.adapter).not.toBe(initialAdapter);
    act(() =>
      flushTapSync(() =>
        navigationRoot.getValue().setAdapter(result.current.adapter),
      ),
    );
    expect(navigationRoot.getValue().navigation.items).toEqual([
      {
        id: "createIssue",
        type: "tool",
        label: "createIssue",
        description: "Create an issue",
      },
    ]);
    navigationRoot.unmount();
  });

  it("refreshes tool mentions when the selected thread changes", () => {
    runtime.state.tools = {
      searchDocs: { description: "Search documentation" },
    };

    const { result } = renderHook(() => unstable_useMentionAdapter());
    const initialAdapter = result.current.adapter;

    expect(runtime.events).toContain("threads.selectionChanged");

    act(() => {
      runtime.state.tools = {
        createIssue: { description: "Create an issue" },
      };
      runtime.emit("threads.selectionChanged");
    });

    expect(result.current.adapter).not.toBe(initialAdapter);
    expect(result.current.adapter.search?.("")).toEqual([
      {
        id: "createIssue",
        type: "tool",
        label: "createIssue",
        description: "Create an issue",
      },
    ]);
  });

  it("keeps adapter identity when tool mentions are unchanged", () => {
    runtime.state.tools = {
      searchDocs: { description: "Search documentation" },
    };

    const { result } = renderHook(() => unstable_useMentionAdapter());
    const initialAdapter = result.current.adapter;

    act(() => {
      runtime.state.tools = {
        searchDocs: { description: "Search documentation" },
      };
      runtime.emit("thread.modelContextUpdate");
    });

    expect(result.current.adapter).toBe(initialAdapter);
  });

  it("observes a description mutated in place on a stable tool object", () => {
    const tool = { description: "Search documentation" };
    runtime.state.tools = { searchDocs: tool };

    const { result } = renderHook(() => unstable_useMentionAdapter());
    const initialAdapter = result.current.adapter;

    act(() => {
      tool.description = "Search the docs site";
      runtime.emit("thread.modelContextUpdate");
    });

    expect(result.current.adapter).not.toBe(initialAdapter);
    expect(result.current.adapter.search?.("")).toEqual([
      {
        id: "searchDocs",
        type: "tool",
        label: "searchDocs",
        description: "Search the docs site",
      },
    ]);
  });

  it("uses an explicit tool category without custom categories", () => {
    runtime.state.tools = {
      searchDocs: { description: "Search documentation" },
    };

    const { result } = renderHook(() =>
      unstable_useMentionAdapter({
        includeModelContextTools: {
          category: { id: "actions", label: "Actions" },
        },
      }),
    );

    expect(result.current.adapter.categories()).toEqual([
      { id: "actions", label: "Actions" },
    ]);
    expect(result.current.adapter.categoryItems("actions")).toEqual([
      {
        id: "searchDocs",
        type: "tool",
        label: "searchDocs",
        description: "Search documentation",
      },
    ]);
  });

  it("keeps an async explicit item list flat when a tool category is configured", () => {
    runtime.state.tools = {
      searchDocs: { description: "Search documentation" },
      createIssue: { description: "Create an issue" },
    };

    const { result, rerender } = renderHook(
      ({
        items,
      }: {
        items: readonly {
          id: string;
          type: string;
          label: string;
        }[];
      }) =>
        unstable_useMentionAdapter({
          items,
          includeModelContextTools: {
            category: { id: "actions", label: "Actions" },
          },
        }),
      { initialProps: { items: [] } },
    );

    expect(result.current.adapter.categories()).toEqual([]);

    rerender({
      items: [
        {
          id: "searchDocs",
          type: "person",
          label: "Documentation owner",
        },
      ],
    });

    expect(result.current.adapter.categories()).toEqual([]);
    expect(result.current.adapter.search?.("")).toEqual([
      {
        id: "searchDocs",
        type: "person",
        label: "Documentation owner",
      },
      {
        id: "createIssue",
        type: "tool",
        label: "createIssue",
        description: "Create an issue",
      },
    ]);
  });
});
