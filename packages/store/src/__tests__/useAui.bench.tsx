// @vitest-environment jsdom

/**
 * Focused useAui benchmark. Run:
 *
 *   pnpm --filter @assistant-ui/store exec vitest bench --run src/__tests__/useAui.bench.tsx
 */
import type { ReactNode } from "react";
import { useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { bench, describe } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { Derived } from "../Derived";
import { useAui } from "../useAui";
import { useClientResource } from "../useClientResource";
import { AuiProvider } from "../utils/react-assistant-context";

const PROVIDER_COUNT = 100;

const useItem = () => ({
  getState: () => ({}),
});
const Item = resource(useItem);

let bumpThread!: () => void;

const useThread = () => {
  const [, setVersion] = useState(0);
  const item = useClientResource(Item());
  bumpThread = () => setVersion((version) => version + 1);
  return {
    getState: () => ({}),
    item: () => item.methods,
  };
};
const Thread = resource(useThread);

const Root = ({ children }: { children: ReactNode }) => {
  const aui = useAui({
    thread: Thread(),
  } as unknown as useAui.Props);
  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

const DerivedScopes = ({ count }: { count: 1 | 2 }) => {
  const aui = useAui({
    message: Derived({
      source: "thread",
      query: {},
      get: (parent) => parent.thread.item(),
    } as never),
    ...(count === 2
      ? {
          composer: Derived({
            source: "thread",
            query: {},
            get: (parent) => parent.thread.item(),
          } as never),
        }
      : {}),
  } as unknown as useAui.Props);
  return <AuiProvider value={aui}>{null}</AuiProvider>;
};

const DerivedTree = ({ count }: { count: 1 | 2 }) => (
  <Root>
    {Array.from({ length: PROVIDER_COUNT }, (_, index) => (
      <DerivedScopes key={index} count={count} />
    ))}
  </Root>
);

describe(`useAui with ${PROVIDER_COUNT} derived providers`, () => {
  for (const count of [1, 2] as const) {
    bench(`mount and unmount, ${count} scope(s)`, () => {
      const view = render(<DerivedTree count={count} />);
      view.unmount();
    });

    bench(
      `parent update, ${count} scope(s)`,
      () => {
        act(() => flushTapSync(bumpThread));
      },
      {
        setup: () => {
          render(<DerivedTree count={count} />);
        },
        teardown: cleanup,
      },
    );
  }
});
