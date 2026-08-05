// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource } from "@assistant-ui/tap";
import { useAui } from "../useAui";
import { AuiProvider } from "../AuiProvider";
import { getProxiedAssistantState } from "../utils/proxied-assistant-state";
import type { AssistantClient } from "../types/client";

type AnyClient = Record<string, any>;
type AnyState = Record<string, any>;

const useThreadClient = () => {
  const [title] = useState("hello");
  return {
    getState: () => ({ title }),
  };
};

const ThreadClient = resource(useThreadClient);

const useListClient = () => {
  const [items] = useState<string[]>([]);
  return {
    getState: () => ({ items }),
  };
};

const ListClient = resource(useListClient);

const setup = () => {
  let aui!: AnyClient;
  const Harness = () => {
    aui = useAui({ thread: ThreadClient() } as unknown as useAui.Props);
    return null;
  };
  render(<Harness />);
  return aui as AssistantClient;
};

afterEach(() => {
  cleanup();
});

describe("optional client view", () => {
  it("returns the same accessor for available scopes", () => {
    const aui = setup() as AnyClient;

    expect(aui.optional.thread).toBe(aui.thread);
    expect(aui.optional.thread.getState().title).toBe("hello");
    expect(aui.optional.thread?.getState().title).toBe("hello");
  });

  it("resolves unavailable scopes to undefined while the base client throws", () => {
    const aui = setup() as AnyClient;

    expect(aui.optional.threadListItem).toBeUndefined();
    expect(aui.optional.threadListItem?.getState()).toBeUndefined();
    expect(aui.optional.notARegisteredScope).toBeUndefined();
    expect(() => aui.threadListItem.getState()).toThrow(
      'The current scope does not have a "threadListItem" property.',
    );
  });

  it("resolves scopes to undefined outside an AuiProvider", () => {
    const { result } = renderHook(() => useAui());
    const aui = result.current as AnyClient;

    expect(aui.optional.thread).toBeUndefined();
    expect(aui.optional.thread?.getState()).toBeUndefined();
    expect("optional" in aui).toBe(true);
    expect(Reflect.ownKeys(aui)).toContain("optional");
    expect(Object.keys(aui)).toContain("optional");
    expect(() => aui.thread.getState()).toThrow(
      "You are using a component or hook that requires an AuiProvider.",
    );
  });

  it("exposes inherited and own scopes on a derived client", () => {
    const parent = setup();

    let child!: AnyClient;
    const Child = () => {
      child = useAui({ list: ListClient() } as unknown as useAui.Props);
      return null;
    };
    render(<AuiProvider value={parent}>{<Child />}</AuiProvider>);

    expect(child.optional.thread).toBe(child.thread);
    expect(child.optional.list).toBe(child.list);
    expect(child.optional.threadListItem).toBeUndefined();
  });

  it("reflects optional in traps without treating it as a scope", () => {
    const aui = setup() as AnyClient;

    expect("optional" in aui).toBe(true);
    expect(Reflect.ownKeys(aui)).toContain("optional");
    expect(Object.keys(aui)).not.toContain("optional");
    expect("optional" in aui.optional).toBe(false);
    expect(Reflect.ownKeys(aui.optional)).toContain("thread");
    expect(Reflect.ownKeys(aui.optional)).not.toContain("optional");
    expect(Reflect.ownKeys(aui.optional)).not.toContain("on");
  });

  it("is referentially stable per client", () => {
    const aui = setup() as AnyClient;

    expect(aui.optional).toBe(aui.optional);
  });

  it("resolves scopes absent from a hand-built parent chain to undefined", () => {
    const handBuilt = {
      subscribe: () => () => {},
      on: () => () => {},
    } as unknown as AssistantClient;

    let child!: AnyClient;
    const Child = () => {
      child = useAui({ thread: ThreadClient() } as unknown as useAui.Props);
      return null;
    };
    render(<AuiProvider value={handBuilt}>{<Child />}</AuiProvider>);

    expect(child.optional.thread).toBe(child.thread);
    expect(child.optional.threadListItem).toBeUndefined();
    expect(child.optional.toString).toBeUndefined();
    expect(child.optional.constructor).toBeUndefined();
    const s = getProxiedAssistantState(child as AssistantClient) as AnyState;
    expect(s.optional.threadListItem).toBeUndefined();
    expect(s.optional.toString).toBeUndefined();
  });

  it("does not surface the client optional view through the state proxy", () => {
    const aui = setup();
    const s = getProxiedAssistantState(aui) as AnyState;

    expect(s.optional.optional).toBeUndefined();
    expect(Object.keys(s)).toEqual(["thread", "optional"]);
  });
});
