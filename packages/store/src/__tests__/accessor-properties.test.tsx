// @vitest-environment jsdom

import { useRef, useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  flushTapSync,
  resource,
  withKey,
  type ResourceElement,
} from "@assistant-ui/tap";
import { useAui } from "../useAui";
import { Derived } from "../Derived";
import type { AssistantClient } from "../types/client";
import { useClientResource } from "../useClientResource";
import { getClientId } from "../utils/client-accessor";

type AnyClient = Record<string, any>;

const useThreadClient = () => {
  const [selected, setSelected] = useState(0);
  const messagesRef = useRef([
    { getState: () => ({ id: "m0" }) },
    { getState: () => ({ id: "m1" }) },
  ]);
  return {
    getState: () => ({ selected }),
    setSelected: (i: number) => setSelected(i),
    message: ({ index }: { index: number }) => messagesRef.current[index]!,
  };
};

const ThreadClient = resource(useThreadClient);

type IdentityClientMethods = {
  getState(): { id: string };
};

const useIdentityClient = ({ id }: { id: string }): IdentityClientMethods => ({
  getState: () => ({ id }),
});

const IdentityClient = resource(useIdentityClient);

const useAlternateIdentityClient = ({
  id,
}: {
  id: string;
}): IdentityClientMethods => ({
  getState: () => ({ id }),
});

const AlternateIdentityClient = resource(useAlternateIdentityClient);

const messageDerived = () =>
  Derived({
    source: "thread",
    query: {},
    get: (aui: AnyClient) =>
      aui.thread.message({ index: aui.thread.getState().selected }),
  } as never);

const setup = () => {
  let aui!: AnyClient;
  let bump!: () => void;
  const Harness = () => {
    const [, setTick] = useState(0);
    bump = () => setTick((t) => t + 1);
    aui = useAui({
      thread: ThreadClient(),
      message: messageDerived(),
    } as unknown as useAui.Props);
    return null;
  };
  const view = render(<Harness />);
  return { getAui: () => aui, bump, view };
};

afterEach(() => {
  cleanup();
});

describe("accessor property API", () => {
  it("the property IS the bound client and calling it returns the same proxy", () => {
    const { getAui } = setup();
    const aui = getAui();

    expect(Object.is(aui.thread, aui.thread())).toBe(true);
    expect(Object.is(aui.message, aui.message())).toBe(true);
    expect(typeof aui.thread).toBe("function");
  });

  it("methods work through the property and through the call", () => {
    const { getAui } = setup();
    const aui = getAui();

    expect(aui.thread.getState()).toEqual({ selected: 0 });
    expect(aui.thread().getState()).toEqual({ selected: 0 });
    expect(aui.message.getState()).toEqual({ id: "m0" });
    expect(aui.message().getState()).toEqual({ id: "m0" });
    expect(aui.thread.message({ index: 1 }).getState()).toEqual({ id: "m1" });
    expect(aui.thread().message({ index: 1 }).getState()).toEqual({
      id: "m1",
    });
  });

  it("identity is stable across renders without structural change", () => {
    const { getAui, bump } = setup();
    const aui = getAui();
    const thread = aui.thread;
    const message = aui.message;
    const threadId = getClientId(thread);
    const messageId = getClientId(message);

    act(() => bump());

    expect(getAui().thread).toBe(thread);
    expect(getAui().message).toBe(message);
    expect(getClientId(getAui().thread)).toBe(threadId);
    expect(getClientId(getAui().message)).toBe(messageId);
  });

  it("structural root replacement produces a new bound client identity", () => {
    let aui!: AnyClient;
    const clients = {
      current: IdentityClient({ id: "a" }),
      replacement: AlternateIdentityClient({ id: "b" }),
    };
    const Harness = ({ client }: { client: keyof typeof clients }) => {
      aui = useAui({ thread: clients[client] });
      return null;
    };

    const { rerender } = render(<Harness client="current" />);
    const initialAccessor = aui.thread;
    const initialClientId = getClientId(initialAccessor);

    rerender(<Harness client="replacement" />);

    expect(aui.thread).not.toBe(initialAccessor);
    expect(getClientId(aui.thread)).not.toBe(initialClientId);
  });

  it("replaces useClientResource methods only for hook or key changes", () => {
    let methods!: IdentityClientMethods;
    const useNestedThreadClient = ({
      element,
    }: {
      element: ResourceElement<IdentityClientMethods>;
    }) => {
      const client = useClientResource(element);
      methods = client.methods;
      return client.methods;
    };
    const NestedThreadClient = resource(useNestedThreadClient);
    const Harness = ({
      element,
    }: {
      element: ResourceElement<IdentityClientMethods>;
    }) => {
      useAui({
        thread: NestedThreadClient({ element }),
      });
      return null;
    };

    const { rerender } = render(
      <Harness element={withKey("current", IdentityClient({ id: "a" }))} />,
    );
    const initialMethods = methods;

    rerender(
      <Harness element={withKey("current", IdentityClient({ id: "b" }))} />,
    );
    expect(methods).toBe(initialMethods);
    expect(methods.getState()).toEqual({ id: "b" });

    rerender(
      <Harness element={withKey("replacement", IdentityClient({ id: "c" }))} />,
    );
    expect(methods).not.toBe(initialMethods);
    expect(methods.getState()).toEqual({ id: "c" });
    const keyedMethods = methods;

    rerender(
      <Harness
        element={withKey("replacement", AlternateIdentityClient({ id: "d" }))}
      />,
    );
    expect(methods).not.toBe(keyedMethods);
    expect(methods.getState()).toEqual({ id: "d" });
  });

  it("structural change produces a new bound accessor; root accessors stay", () => {
    const { getAui } = setup();
    const aui = getAui();
    const thread = aui.thread;
    const message = aui.message;

    act(() => flushTapSync(() => aui.thread.setSelected(1)));

    expect(getAui().message).not.toBe(message);
    expect(getAui().message.getState()).toEqual({ id: "m1" });
    expect(getAui().thread).toBe(thread);
  });

  it("exposes source/query/name meta as properties, hidden from enumeration", () => {
    const { getAui } = setup();
    const aui = getAui();

    expect(aui.thread.source).toBe("root");
    expect(aui.thread.query).toEqual({});
    expect(aui.thread.name).toBe("thread");
    expect(aui.message.source).toBe("thread");
    expect(aui.message.query).toEqual({});
    expect(aui.message.name).toBe("message");
    expect("source" in aui.thread).toBe(true);
    expect(Reflect.ownKeys(aui.thread)).not.toContain("source");
    expect(Object.keys(aui.message)).not.toContain("source");
  });

  it("a derived get may return an accessor; the bound instance still resolves", () => {
    let aui!: AnyClient;
    const Harness = () => {
      aui = useAui({
        thread: ThreadClient(),
        message: Derived({
          source: "thread",
          query: {},
          get: (parent: AnyClient) => parent.thread(),
        } as never),
      } as unknown as useAui.Props);
      return null;
    };
    render(<Harness />);

    expect(aui.message.getState()).toEqual({ selected: 0 });
    expect(aui.message().getState()).toEqual({ selected: 0 });
  });

  it("scope accessors of a missing provider throw on call and on member access", () => {
    let aui!: AssistantClient;
    const Harness = () => {
      aui = useAui();
      return null;
    };
    render(<Harness />);

    const accessor = (aui as AnyClient).thread;
    expect(() => accessor()).toThrow(/AuiProvider/);
    expect(() => accessor.getState()).toThrow(/AuiProvider/);
    expect(accessor.source).toBeNull();
  });

  it("undefined scopes never throw at selection time, only on use", () => {
    const { getAui } = setup();
    const aui = getAui();

    expect(Boolean(aui.composer)).toBe(true);
    expect(aui.composer.source).toBeNull();
    expect(aui.composer.query).toBeNull();
    expect(aui.composer.name).toBe("composer");
    expect(() => aui.composer()).toThrow(/"composer"/);
    expect(() => aui.composer.send()).toThrow(/"composer"/);
  });
});
