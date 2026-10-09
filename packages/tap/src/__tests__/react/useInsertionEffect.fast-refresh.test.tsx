/** @vitest-environment jsdom */
import {
  act,
  Activity,
  StrictMode,
  useInsertionEffect,
  useRef,
  version,
} from "react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { resource } from "../../core/resource";
import { withKey } from "../../core/withKey";
import { useResource } from "../../hooks/useResource";
import { useResources } from "../../hooks/useResources";
import { useTapHost } from "../../hooks/useTapHost";
import { useTapRoot } from "../../hooks/useTapRoot";
import { flushTapSync } from "../../core/scheduler";
import { useState as useResourceState } from "../../react-hooks/useState";

type Family = { current: unknown };
type RendererInternals = {
  setRefreshHandler: (resolve: (type: unknown) => Family | undefined) => void;
  scheduleRefresh: (
    root: unknown,
    update: { staleFamilies: Set<Family>; updatedFamilies: Set<Family> },
  ) => void;
};

let renderer: RendererInternals | undefined;
const fiberRoots = new Set<unknown>();
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
vi.stubGlobal("__REACT_DEVTOOLS_GLOBAL_HOOK__", {
  supportsFiber: true,
  inject: (internals: RendererInternals) => {
    renderer = internals;
    return 1;
  },
  onScheduleFiberRoot: () => {},
  onCommitFiberRoot: (_id: number, root: unknown) => fiberRoots.add(root),
  onCommitFiberUnmount: () => {},
});
const { cleanup, render } = await import("@testing-library/react");

const onReact18 = version.startsWith("18.");

afterEach(() => {
  cleanup();
  fiberRoots.clear();
});
afterAll(() => vi.unstubAllGlobals());

const hosts = [
  {
    name: "useResource",
    size: 1,
    useHost: (callback: () => void) => useResource(resource(callback)()),
  },
  {
    name: "useResources",
    size: 2,
    useHost: (callback: () => void) =>
      useResources([
        withKey("a", resource(callback)()),
        withKey("b", resource(callback)()),
      ]),
  },
  {
    name: "useTapHost",
    size: 1,
    useHost: (callback: () => void) => useTapHost(callback),
  },
  {
    name: "useTapRoot",
    size: 1,
    useHost: (callback: () => void) => useTapRoot(callback),
  },
];

describe.each(hosts)("$name Fast Refresh", ({ useHost, size }) => {
  describe.each([false, true])("nested in a resource: %s", (nested) => {
    it.for(["visible", "hidden", "revealed"])(
      "retains insertion cells through a real refresh while %s",
      async (mode, { skip }) => {
        skip(onReact18 && mode !== "visible", "Activity is React 19 only");
        const setup = vi.fn();
        const release = vi.fn();
        function useLifetime() {
          const id = useRef({}).current;
          useInsertionEffect(() => {
            setup(id);
            return () => release(id);
          }, []);
        }
        const Parent = resource(function useParent() {
          useHost(useLifetime);
        });
        function useHostedLifetime() {
          if (nested) useResource(Parent());
          else useHost(useLifetime);
        }
        let rendered: string | undefined;
        let state: object | undefined;
        function Before() {
          rendered = "before";
          state = useRef({}).current;
          useHostedLifetime();
          return null;
        }
        function After() {
          rendered = "after";
          state = useRef({}).current;
          useHostedLifetime();
          return null;
        }
        const ui = (hidden: boolean) => (
          <StrictMode>
            {onReact18 ? (
              // Activity is React 19 only; the visible-mode refresh runs without it on React 18.
              <Before />
            ) : (
              <Activity mode={hidden ? "hidden" : "visible"}>
                <Before />
              </Activity>
            )}
          </StrictMode>
        );
        const view = render(ui(false));
        const initialState = state;
        if (mode !== "visible") view.rerender(ui(true));
        expect(setup).toHaveBeenCalledTimes(size);
        expect(release).not.toHaveBeenCalled();

        const family: Family = { current: After };
        renderer!.setRefreshHandler((type) =>
          type === Before || type === After ? family : undefined,
        );
        await act(async () => {
          for (const root of fiberRoots) {
            renderer!.scheduleRefresh(root, {
              staleFamilies: new Set(),
              updatedFamilies: new Set([family]),
            });
          }
        });
        await act(async () => {});
        expect(rendered).toBe("after");
        expect(state).toBe(initialState);
        expect(setup).toHaveBeenCalledTimes(size);
        expect(release).not.toHaveBeenCalled();

        if (mode === "revealed") {
          view.rerender(ui(false));
          expect(state).toBe(initialState);
          expect(setup).toHaveBeenCalledTimes(size);
          expect(release).not.toHaveBeenCalled();
        }

        view.unmount();
        await act(async () => {});
        expect(release.mock.calls).toEqual(setup.mock.calls);
      },
    );
  });
});

it("keeps non-StrictMode tap updates single after Fast Refresh", async () => {
  let setCount!: (value: number) => void;
  let renders = 0;
  function useCounter() {
    useTapRoot(function Counter() {
      const [count, set] = useResourceState(0);
      setCount = set;
      renders++;
      return count;
    });
  }
  function Before() {
    useCounter();
    return null;
  }
  function After() {
    useCounter();
    return null;
  }
  render(<Before />);
  const family: Family = { current: After };
  renderer!.setRefreshHandler((type) =>
    type === Before || type === After ? family : undefined,
  );
  await act(async () => {
    for (const root of fiberRoots)
      renderer!.scheduleRefresh(root, {
        staleFamilies: new Set(),
        updatedFamilies: new Set([family]),
      });
  });
  renders = 0;
  act(() => flushTapSync(() => setCount(1)));
  expect(renders).toBe(1);
});
