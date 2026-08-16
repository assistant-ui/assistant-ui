// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import {
  attachTransformScopes,
  forwardTransformScopes,
  type ScopesConfig,
} from "../attachTransformScopes";

type AnyClient = Record<string, any>;
type AnyScopes = Record<string, unknown>;

const makeClient = (name: string) => {
  const useClient = () => ({ getState: () => ({ name }) });
  return [useClient, resource(useClient)] as const;
};

const mount = (clients: AnyScopes, children?: ReactNode) => {
  let aui!: AnyClient;
  const Harness = () => {
    aui = useAui(clients as unknown as useAui.Props);
    return <AuiProvider value={aui as never}>{children}</AuiProvider>;
  };
  render(<Harness />);
  return () => aui;
};

afterEach(() => {
  cleanup();
});

describe("attachTransformScopes", () => {
  it("a transform can add sibling scopes, which get mounted", () => {
    const [useA, A] = makeClient("a");
    const [, B] = makeClient("b");
    attachTransformScopes(useA, (scopes) => {
      (scopes as AnyScopes).b ??= B();
    });

    const getAui = mount({ a: A() });

    expect(getAui().a.getState()).toEqual({ name: "a" });
    expect(getAui().b.getState()).toEqual({ name: "b" });
  });

  it("scopes added by transforms are themselves transformed (fixpoint)", () => {
    const [useA, A] = makeClient("a");
    const [useB, B] = makeClient("b");
    const [, C] = makeClient("c");
    attachTransformScopes(useA, (scopes) => {
      (scopes as AnyScopes).b ??= B();
    });
    attachTransformScopes(useB, (scopes) => {
      (scopes as AnyScopes).c ??= C();
    });

    const getAui = mount({ a: A() });

    expect(getAui().b.getState()).toEqual({ name: "b" });
    expect(getAui().c.getState()).toEqual({ name: "c" });
  });

  it("each transform runs once per pass, even when it always writes", () => {
    const [useA, A] = makeClient("a");
    const [, B] = makeClient("b");
    const transform = vi.fn((scopes: ScopesConfig) => {
      (scopes as AnyScopes).b = B();
    });
    attachTransformScopes(useA, transform);

    const getAui = mount({ a: A() });

    expect(transform).toHaveBeenCalledTimes(1);
    expect(getAui().b.getState()).toEqual({ name: "b" });
  });

  it("a transform can inspect the parent client to add scopes conditionally", () => {
    const makeConditional = () => {
      const [useA, A] = makeClient("a");
      const [, Fallback] = makeClient("fallback-thread");
      attachTransformScopes(useA, (scopes, parent) => {
        if ((parent as AnyClient).thread.source === null) {
          (scopes as AnyScopes).thread = Fallback();
        }
      });
      return A;
    };

    const getRootAui = mount({ a: makeConditional()() });
    expect(getRootAui().thread.getState()).toEqual({ name: "fallback-thread" });

    let childAui!: AnyClient;
    const Child = () => {
      childAui = useAui({
        a: makeConditional()(),
      } as unknown as useAui.Props);
      return null;
    };
    const [, ParentThread] = makeClient("parent-thread");
    mount({ thread: ParentThread() }, <Child />);
    expect(childAui.thread.getState()).toEqual({ name: "parent-thread" });
  });

  it("attaching twice to the same hook throws", () => {
    const [useA] = makeClient("a");
    attachTransformScopes(useA, () => {});
    expect(() => attachTransformScopes(useA, () => {})).toThrow(
      "transformScopes is already attached",
    );
  });

  it("forwardTransformScopes runs the source transform before the target's own", () => {
    const order: string[] = [];
    const [useSource] = makeClient("source");
    const [useTarget, Target] = makeClient("target");
    attachTransformScopes(useSource, () => {
      order.push("source");
    });
    attachTransformScopes(useTarget, () => {
      order.push("target");
    });
    forwardTransformScopes(useTarget, useSource);

    mount({ a: Target() });

    expect(order).toEqual(["source", "target"]);
  });
});
