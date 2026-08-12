// @vitest-environment jsdom

import { useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { Derived } from "../Derived";
import { useClientResource } from "../useClientResource";
import {
  useAssistantClientRef,
  useAssistantScopeEffect,
} from "../utils/tap-assistant-context";

type AnyClient = Record<string, any>;

const makeHarness = () => {
  const log: string[] = [];

  const useTargetClient = ({ id }: { id: string }) => {
    const [generation, setGeneration] = useState(0);
    return {
      getState: () => ({ id, generation }),
      poke: () => setGeneration((n) => n + 1),
      register: (tag: string) => {
        log.push(`+${id}:${tag}`);
        return () => log.push(`-${id}:${tag}`);
      },
    };
  };
  const TargetClient = resource(useTargetClient);

  const useThreadClient = () => {
    const [selected, setSelected] = useState(0);
    const t0 = useClientResource(TargetClient({ id: "t0" }));
    const t1 = useClientResource(TargetClient({ id: "t1" }));
    const targets = [t0, t1];
    return {
      getState: () => ({ selected }),
      setSelected,
      target: ({ index }: { index: number }) => targets[index]!.methods,
    };
  };
  const ThreadClient = resource(useThreadClient);

  const useRegistrarClient = ({ tag }: { tag: string }) => {
    const clientRef = useAssistantClientRef();
    useAssistantScopeEffect(
      "target" as never,
      () => {
        const target = (clientRef.current as AnyClient | null)?.optional.target;
        if (!target) return;
        return target.register(tag);
      },
      [tag],
    );
    return { getState: () => ({}) };
  };
  const RegistrarClient = resource(useRegistrarClient);

  const targetDerived = () =>
    Derived({
      source: "thread",
      query: {},
      get: (aui: AnyClient) =>
        aui.thread.target({ index: aui.thread.getState().selected }),
    } as never);

  return { log, ThreadClient, RegistrarClient, targetDerived };
};

afterEach(() => {
  cleanup();
});

describe("useAssistantScopeEffect", () => {
  it("migrates the registration when the scope's binding is structurally replaced", () => {
    const { log, ThreadClient, RegistrarClient, targetDerived } = makeHarness();
    let aui!: AnyClient;
    const Harness = ({ tag }: { tag: string }) => {
      aui = useAui({
        thread: ThreadClient(),
        target: targetDerived(),
        registrar: RegistrarClient({ tag }),
      } as never);
      return <AuiProvider value={aui as never} />;
    };
    const view = render(<Harness tag="a" />);

    expect(log).toEqual(["+t0:a"]);

    // A value update on the same binding does not re-register
    act(() => flushTapSync(() => aui.thread.target({ index: 0 }).poke()));
    expect(log).toEqual(["+t0:a"]);

    // A structural replacement migrates: cleanup on the old, setup on the new
    act(() => flushTapSync(() => aui.thread.setSelected(1)));
    expect(log).toEqual(["+t0:a", "-t0:a", "+t1:a"]);

    // A deps change re-runs against the current binding
    view.rerender(<Harness tag="b" />);
    expect(log).toEqual(["+t0:a", "-t0:a", "+t1:a", "-t1:a", "+t1:b"]);

    view.unmount();
    expect(log).toEqual(["+t0:a", "-t0:a", "+t1:a", "-t1:a", "+t1:b", "-t1:b"]);
  });

  it("sets up once the scope appears in a later structural change", () => {
    const { log, ThreadClient, RegistrarClient, targetDerived } = makeHarness();
    const Harness = ({ hasTarget }: { hasTarget: boolean }) => {
      const aui = useAui(
        (hasTarget
          ? {
              thread: ThreadClient(),
              target: targetDerived(),
              registrar: RegistrarClient({ tag: "a" }),
            }
          : {
              thread: ThreadClient(),
              registrar: RegistrarClient({ tag: "a" }),
            }) as never,
      );
      return <AuiProvider value={aui as never} />;
    };
    const view = render(<Harness hasTarget={false} />);
    expect(log).toEqual([]);

    view.rerender(<Harness hasTarget />);
    expect(log).toEqual(["+t0:a"]);

    view.rerender(<Harness hasTarget={false} />);
    expect(log).toEqual(["+t0:a", "-t0:a"]);
  });
});
