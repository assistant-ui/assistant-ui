// @vitest-environment jsdom
// repro: temporary benchmark for sw-121 (two-mode useAui).
// Logs wall-clock medians; no timing assertions.

import type { FC, ReactNode } from "react";
import { useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource, withKey } from "@assistant-ui/tap";
import { AuiProvider } from "../utils/react-assistant-context";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useClientLookup } from "../useClientLookup";
import { Derived } from "../Derived";

const MESSAGE_COUNT = 500;
const ITERATIONS = 5;

const useItem = ({ id }: { id: string }) => {
  return {
    getState: () => ({ id, text: `text-${id}` }),
  };
};
const Item = resource(useItem);

const useThread = ({ ids }: { ids: string[] }) => {
  const items = useClientLookup(ids.map((id) => withKey(id, Item({ id }))));
  return {
    getState: () => ({ count: ids.length }),
    item: (lookup: { index: number }) => items.get(lookup),
  };
};
const Thread = resource(useThread);

const ThreadProvider: FC<{ ids: string[]; children: ReactNode }> = ({
  ids,
  children,
}) => {
  const aui = useAui({ thread: Thread({ ids }) } as unknown as useAui.Props);
  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

// Mirrors core's MessageByIndexProvider: Derived-only useAui mount
const MessageProvider: FC<{ index: number; children: ReactNode }> = ({
  index,
  children,
}) => {
  const aui = useAui({
    message: Derived({
      source: "thread",
      query: { type: "index", index },
      get: (aui: any) => aui.thread().item({ index }),
    } as any),
    composer: Derived({
      source: "message",
      query: {},
      get: (aui: any) => aui.thread().item({ index }),
    } as any),
  } as unknown as useAui.Props);
  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

const texts: string[] = [];
const Leaf: FC<{ index: number }> = ({ index }) => {
  texts[index] = useAuiState((s: any) => s.message.text);
  return null;
};

const harness: { setIds: ((ids: string[]) => void) | null } = { setIds: null };

const App: FC<{ initialIds: string[] }> = ({ initialIds }) => {
  const [ids, setIds] = useState(initialIds);
  harness.setIds = setIds;
  return (
    <ThreadProvider ids={ids}>
      {ids.map((id, index) => (
        <MessageProvider key={id} index={index}>
          <Leaf index={index} />
        </MessageProvider>
      ))}
    </ThreadProvider>
  );
};

const makeIds = () => Array.from({ length: MESSAGE_COUNT }, (_, i) => `m${i}`);

const median = (samples: number[]) =>
  [...samples].sort((a, b) => a - b)[samples.length >> 1]!;

afterEach(() => {
  cleanup();
});

describe("repro sw-121: derived-only useAui benchmark", () => {
  it(`mount, first-message delete, remount with ${MESSAGE_COUNT} messages`, () => {
    const mount: number[] = [];
    const update: number[] = [];
    const remount: number[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const ids = makeIds();

      let t0 = performance.now();
      const view = render(<App initialIds={ids} />);
      mount.push(performance.now() - t0);
      expect(texts[0]).toBe("text-m0");
      expect(texts[MESSAGE_COUNT - 1]).toBe(`text-m${MESSAGE_COUNT - 1}`);

      t0 = performance.now();
      act(() => harness.setIds!(ids.slice(1)));
      update.push(performance.now() - t0);
      expect(texts[0]).toBe("text-m1");

      t0 = performance.now();
      view.unmount();
      render(<App initialIds={makeIds()} />);
      remount.push(performance.now() - t0);
      expect(texts[0]).toBe("text-m0");

      cleanup();
    }

    console.log(
      `[sw-121 bench] messages=${MESSAGE_COUNT} iterations=${ITERATIONS}\n` +
        `  mount           median ${median(mount).toFixed(1)}ms  (${mount.map((s) => s.toFixed(1)).join(", ")})\n` +
        `  delete-first    median ${median(update).toFixed(1)}ms  (${update.map((s) => s.toFixed(1)).join(", ")})\n` +
        `  unmount+remount median ${median(remount).toFixed(1)}ms  (${remount.map((s) => s.toFixed(1)).join(", ")})`,
    );
  });
});
