// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource } from "@assistant-ui/tap";
import { useAui } from "../useAui";
import { AuiProvider } from "../AuiProvider";
import { Derived } from "../Derived";
import type { AssistantClient } from "../types/client";

type AnyClient = Record<string, any>;

const useThreadClient = () => {
  const [title] = useState("hello");
  return {
    getState: () => ({ title }),
    rename: () => {},
  };
};

const ThreadClient = resource(useThreadClient);

const setup = () => {
  let aui!: AnyClient;
  const Harness = () => {
    aui = useAui({ thread: ThreadClient() } as unknown as useAui.Props);
    return null;
  };
  render(<Harness />);
  return aui as AssistantClient & AnyClient;
};

afterEach(() => {
  cleanup();
});

describe("optional client view", () => {
  it("returns the same bound accessor for available scopes", () => {
    const aui = setup();

    expect(aui.optional.thread).toBe(aui.thread);
    expect(aui.optional.thread?.getState().title).toBe("hello");
  });

  it("resolves unavailable scopes to undefined while the base client throws", () => {
    const aui = setup();

    expect(aui.optional.threadListItem).toBeUndefined();
    expect(aui.optional.threadListItem?.remoteId).toBeUndefined();
    expect(aui.optional.notARegisteredScope).toBeUndefined();
    expect(() => aui.threadListItem.remoteId).toThrow(
      'The current scope does not have a "threadListItem" property.',
    );
  });

  it("resolves every scope to undefined outside an AuiProvider", () => {
    const { result } = renderHook(() => useAui() as AnyClient);

    expect(result.current.optional.thread).toBeUndefined();
    expect(result.current.optional.thread?.cancelRun()).toBeUndefined();
  });

  it("resolves inherited and derived scopes on a child provider", () => {
    const parent = setup();
    let child!: AnyClient;
    const Child = () => {
      child = useAui({
        message: Derived({
          source: "thread",
          query: {},
          get: (aui: AnyClient) => aui.thread,
        } as never),
      } as never);
      return null;
    };
    render(
      <AuiProvider value={parent}>
        <Child />
      </AuiProvider>,
    );

    expect(child.optional.message).toBe(child.message);
    expect(child.optional.thread).toBe(child.thread);
    expect(child.optional.composer).toBeUndefined();
  });

  it("resolves absent scopes on a hand-built parent chain to undefined", () => {
    const handBuilt = {
      subscribe: () => () => {},
      on: () => () => {},
    };
    let child!: AnyClient;
    const Child = () => {
      child = useAui({ thread: ThreadClient() } as unknown as useAui.Props);
      return null;
    };
    render(
      <AuiProvider value={handBuilt as never}>
        <Child />
      </AuiProvider>,
    );

    expect(child.optional.thread).toBe(child.thread);
    expect(child.optional.composer).toBeUndefined();
  });

  it("keeps optional out of enumeration while reporting it via in", () => {
    const aui = setup();

    expect("optional" in aui).toBe(true);
    expect(Object.keys(aui)).not.toContain("optional");
    expect(Object.keys({ ...aui })).not.toContain("optional");
    expect("optional" in aui.optional).toBe(false);
    expect(Object.keys(aui.optional)).toContain("thread");
    expect((aui.optional as AnyClient).__proto__).toBeUndefined();
  });

  it("keeps the view referentially stable per client", () => {
    const aui = setup();

    expect(aui.optional).toBe(aui.optional);
  });

  it("reports the same shape on the no-provider client", () => {
    const { result } = renderHook(() => useAui() as AnyClient);
    const aui = result.current;

    expect("optional" in aui).toBe(true);
    expect(Object.keys(aui)).not.toContain("optional");
    expect(aui.optional).toBe(aui.optional);
  });
});
