// @vitest-environment jsdom

import { act } from "react";
import { afterEach, expect, it } from "vitest";
import { useHostDestroySignal } from "./useHostDestroySignal";

type Family = { current: unknown };
type RendererInternals = {
  setRefreshHandler: (resolve: (type: unknown) => Family | undefined) => void;
  scheduleRefresh: (
    root: unknown,
    update: { staleFamilies: Set<Family>; updatedFamilies: Set<Family> },
  ) => void;
};

// Fast Refresh drives React through the renderer internals handed to the
// DevTools hook, so the hook has to exist before react-dom loads.
let renderer: RendererInternals | undefined;
const fiberRoots = new Set<unknown>();
Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  __REACT_DEVTOOLS_GLOBAL_HOOK__: {
    supportsFiber: true,
    inject: (internals: RendererInternals) => {
      renderer = internals;
      return 1;
    },
    onScheduleFiberRoot: () => {},
    onCommitFiberRoot: (_id: number, root: unknown) => fiberRoots.add(root),
    onCommitFiberUnmount: () => {},
  },
});
const { cleanup, render } = await import("@testing-library/react");

afterEach(cleanup);

let signal: AbortSignal | undefined;
const Before = () => {
  signal = useHostDestroySignal();
  return null;
};
const After = () => {
  signal = useHostDestroySignal();
  return null;
};

it("stays armed across a Fast Refresh of its host and aborts on unmount", async () => {
  const view = render(<Before />);
  const armed = signal!;

  const family: Family = { current: After };
  renderer!.setRefreshHandler((type) =>
    type === Before || type === After ? family : undefined,
  );
  await act(async () => {
    for (const fiberRoot of fiberRoots) {
      renderer!.scheduleRefresh(fiberRoot, {
        staleFamilies: new Set(),
        updatedFamilies: new Set([family]),
      });
    }
  });
  await act(async () => {});
  expect(signal).toBe(armed);
  expect(armed.aborted).toBe(false);

  view.unmount();
  await act(async () => {});
  expect(armed.aborted).toBe(true);
});
