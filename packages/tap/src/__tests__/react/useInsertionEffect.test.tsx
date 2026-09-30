import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import {
  Activity,
  StrictMode,
  Suspense,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
} from "react";
import { createTapRoot } from "../../core/createTapRoot";
import { resource } from "../../core/resource";
import { flushTapSync } from "../../core/scheduler";
import { withKey } from "../../core/withKey";
import { useResource } from "../../hooks/useResource";
import { useResources } from "../../hooks/useResources";
import { useTapHost } from "../../hooks/useTapHost";
import { useTapRoot } from "../../hooks/useTapRoot";

afterEach(cleanup);

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

describe.each(hosts)("$name insertion lifetime", ({ useHost, size }) => {
  describe.each([false, true])("nested in a resource: %s", (nested) => {
    const fixture = (onRelease?: () => void) => {
      const events: { id: object; kind: string }[] = [];
      const setup = vi.fn();
      const release = vi.fn();
      function useLifetime() {
        const id = useRef({}).current;
        useEffect(
          () => () => {
            events.push({ id, kind: "passive" });
          },
          [],
        );
        useInsertionEffect(() => {
          setup(id);
          return () => {
            events.push({ id, kind: "insertion" });
            release(id);
            onRelease?.();
          };
        }, []);
      }
      const Parent = resource(function useParent() {
        useInsertionEffect(
          () => () => {
            events.push({ id: Parent, kind: "parent insertion" });
          },
          [],
        );
        useEffect(
          () => () => {
            events.push({ id: Parent, kind: "parent passive" });
          },
          [],
        );
        useHost(useLifetime);
      });
      function Host() {
        if (nested) useResource(Parent());
        else useHost(useLifetime);
        return <span>host</span>;
      }
      function Oracle() {
        useInsertionEffect(oracleSetup, []);
        return null;
      }
      const oracleRelease = vi.fn();
      const oracleSetup = vi.fn(() => oracleRelease);
      const content = (
        <>
          <Host />
          <Oracle />
        </>
      );
      const ui = (hidden = false, key = "first") => (
        <StrictMode>
          <Activity key={key} mode={hidden ? "hidden" : "visible"}>
            {content}
          </Activity>
        </StrictMode>
      );
      const expectLive = () => {
        expect(setup).toHaveBeenCalledTimes(size);
        expect(release).not.toHaveBeenCalled();
        expect(oracleSetup).toHaveBeenCalledTimes(1);
        expect(oracleRelease).not.toHaveBeenCalled();
      };
      const expectReleased = () => {
        expect(release.mock.calls).toEqual(setup.mock.calls);
        expect(oracleRelease).toHaveBeenCalledTimes(
          oracleSetup.mock.calls.length,
        );
      };
      return {
        Parent,
        Host,
        Oracle,
        ui,
        setup,
        release,
        events,
        expectLive,
        expectReleased,
      };
    };

    it("preserves insertion cells through StrictMode and Activity hide and reveal", async () => {
      const f = fixture();
      const view = render(f.ui());
      f.expectLive();
      const passiveOrder = [
        ...(nested ? [{ id: f.Parent, kind: "parent passive" }] : []),
        ...f.setup.mock.calls.map(([id]) => ({ id, kind: "passive" })),
      ];
      expect(f.events).toEqual(passiveOrder);
      view.rerender(f.ui());
      f.expectLive();
      f.events.length = 0;
      view.rerender(f.ui(true));
      await act(async () => {});
      f.expectLive();
      expect(f.events).toEqual(passiveOrder);
      view.rerender(f.ui());
      f.expectLive();
      view.unmount();
      f.expectReleased();
      await act(async () => {});
      f.expectReleased();
    });

    it("releases a hidden host once after its passive effects have disconnected", async () => {
      const f = fixture();
      const view = render(f.ui());
      view.rerender(f.ui(true));
      await act(async () => {});
      f.expectLive();
      view.unmount();
      expect(f.release).not.toHaveBeenCalled();
      await act(async () => {});
      f.expectReleased();
    });

    it("never acquires insertion cells when deleted before its first reveal", async () => {
      const f = fixture();
      const view = render(f.ui(true));
      await act(async () => {});
      expect(f.setup).not.toHaveBeenCalled();
      view.unmount();
      await act(async () => {});
      expect(f.release).not.toHaveBeenCalled();
    });

    it("releases synchronously on visible deletion before passive cleanup", () => {
      const f = fixture();
      const view = render(f.ui());
      f.expectLive();
      f.events.length = 0;
      view.unmount();
      f.expectReleased();
      for (const [id] of f.setup.mock.calls) {
        expect(
          f.events
            .filter((event) => event.id === id)
            .map((event) => event.kind),
        ).toEqual(["insertion", "passive"]);
      }
      expect(f.events.map((event) => event.kind)).toEqual([
        ...(nested ? ["parent insertion"] : []),
        ...Array<string>(size).fill("insertion"),
        ...(nested ? ["parent passive"] : []),
        ...Array<string>(size).fill("passive"),
      ]);
    });

    it("releases the old host once on a React key remount", () => {
      const f = fixture();
      const view = render(f.ui());
      f.expectLive();
      view.rerender(f.ui(false, "second"));
      expect(f.setup).toHaveBeenCalledTimes(size * 2);
      expect(f.release.mock.calls).toEqual(f.setup.mock.calls.slice(0, size));
      view.unmount();
      f.expectReleased();
    });

    it("preserves insertion cells while a committed Suspense boundary re-suspends", async () => {
      const f = fixture();
      let suspended = false;
      let resolve!: () => void;
      const pending = new Promise<void>((done) => {
        resolve = done;
      });
      function Gate() {
        if (suspended) throw pending;
        return null;
      }
      const ui = () => (
        <StrictMode>
          <Suspense fallback={<span>loading</span>}>
            <f.Host />
            <f.Oracle />
            <Gate />
          </Suspense>
        </StrictMode>
      );
      const view = render(ui());
      f.expectLive();
      suspended = true;
      view.rerender(ui());
      expect(view.getByText("loading")).toBeDefined();
      await act(async () => {});
      f.expectLive();
      await act(async () => {
        suspended = false;
        resolve();
      });
      expect(view.queryByText("loading")).toBeNull();
      f.expectLive();
      view.unmount();
      f.expectReleased();
    });

    it.each([false, true])(
      "permits a release cleanup to dispatch with hidden: %s",
      async (hidden) => {
        let update!: () => void;
        const f = fixture(() => update());
        function App({
          show,
          hidden = false,
        }: {
          show: boolean;
          hidden?: boolean;
        }) {
          const [count, setCount] = useState(0);
          update = () => setCount((value) => value + 1);
          return (
            <>
              <span data-testid="count">{count}</span>
              {show && f.ui(hidden)}
            </>
          );
        }
        const error = vi.spyOn(console, "error");
        try {
          const view = render(<App show />);
          if (hidden) view.rerender(<App show hidden />);
          await act(async () => {
            view.rerender(<App show={false} />);
          });
          expect(f.release).toHaveBeenCalledTimes(size);
          expect(view.getByTestId("count").textContent).toBe(String(size));
          expect(error.mock.calls.flat().join(" ")).not.toContain(
            "useInsertionEffect must not schedule updates",
          );
        } finally {
          error.mockRestore();
        }
      },
    );
  });
});

describe("createTapRoot callback insertion lifetime", () => {
  it.each([false, true])(
    "releases the callback fiber with mountOnSubscribe: %s",
    (mountOnSubscribe) => {
      const release = vi.fn();
      const setup = vi.fn(() => release);
      const root = createTapRoot(
        function useLifetime() {
          useInsertionEffect(setup, []);
        },
        { mountOnSubscribe },
      );
      const unsubscribe = root.subscribe(() => {});
      expect(setup).toHaveBeenCalledTimes(1);
      expect(release).not.toHaveBeenCalled();
      if (mountOnSubscribe) {
        flushTapSync(unsubscribe);
        expect(release).not.toHaveBeenCalled();
        const unsubscribeAgain = root.subscribe(() => {});
        expect(setup).toHaveBeenCalledTimes(1);
        flushTapSync(unsubscribeAgain);
        expect(release).not.toHaveBeenCalled();
      }
      root.unmount();
      root.unmount();
      expect(release).toHaveBeenCalledTimes(1);
      flushTapSync(unsubscribe);
    },
  );
});

it("releases every keyed child when an insertion cleanup throws", () => {
  const failure = new Error("Release failed");
  const release = vi.fn();
  const Child = resource(function useChild(key: string) {
    useInsertionEffect(
      () => () => {
        release(key);
        if (key === "a") throw failure;
      },
      [],
    );
  });
  function Host() {
    useResources([withKey("a", Child("a")), withKey("b", Child("b"))]);
    return null;
  }
  const view = render(
    <StrictMode>
      <Host />
    </StrictMode>,
  );
  expect(() => view.unmount()).toThrow(failure);
  expect(release.mock.calls).toEqual([["a"], ["b"]]);
});

it("creates a fresh resource when a hidden hook swap returns to a released hook", async () => {
  const release = vi.fn();
  const First = resource(function useFirst() {
    const id = useRef({}).current;
    useInsertionEffect(() => () => release(id), []);
    return id;
  });
  const Second = resource(function useSecond() {
    return useRef({}).current;
  });
  let current: object | undefined;
  function Host({ swapped }: { swapped: boolean }) {
    current = useResource(swapped ? Second() : First());
    return null;
  }
  const ui = (hidden: boolean, swapped = false) => (
    <StrictMode>
      <Activity mode={hidden ? "hidden" : "visible"}>
        <Host swapped={swapped} />
      </Activity>
    </StrictMode>
  );
  const view = render(ui(false));
  const first = current;
  view.rerender(ui(true));
  view.rerender(ui(true, true));
  await act(async () => {});
  expect(release.mock.calls).toEqual([[first]]);
  view.rerender(ui(true));
  view.rerender(ui(false));
  expect(current).not.toBe(first);
  view.unmount();
  expect(release.mock.calls).toEqual([[first], [current]]);
});

describe.each([false, true])(
  "resource replacement with keyed children: %s",
  (multiple) => {
    describe.each([false, true])("nested in a resource: %s", (nested) => {
      const fixture = () => {
        const setup = vi.fn();
        const release = vi.fn();
        function useLifetime(label: string) {
          useInsertionEffect(() => {
            setup(label);
            return () => release(label);
          }, []);
        }
        const First = resource(function useFirst() {
          useLifetime("first");
        });
        const Second = resource(function useSecond() {
          useLifetime("second");
        });
        const Stable = resource(function useStable() {
          useLifetime("stable");
        });
        type Props = {
          swapped?: boolean;
          childKey?: string;
          suspended?: boolean;
          removed?: boolean;
        };
        const pending = new Promise<void>(() => {});
        function useChildren({
          swapped = false,
          childKey = "a",
          suspended = false,
          removed = false,
        }: Props) {
          const element = withKey(childKey, swapped ? Second() : First());
          if (multiple) {
            useResources(
              removed
                ? [withKey("b", Stable())]
                : [element, withKey("b", Stable())],
            );
          } else {
            useResource(element);
          }
          if (suspended) throw pending;
        }
        const Parent = resource(useChildren);
        function Host(props: Props) {
          if (nested) useResource(Parent(props));
          else useChildren(props);
          return <span>ready</span>;
        }
        const ui = (props: Props = {}) => (
          <StrictMode>
            <Suspense fallback={<span>loading</span>}>
              <Host {...props} />
            </Suspense>
          </StrictMode>
        );
        return { setup, release, ui };
      };

      it.each(["hook", "key"])(
        "permanently releases only the replaced child on a %s swap",
        (swap) => {
          const f = fixture();
          const view = render(f.ui());
          expect(f.release).not.toHaveBeenCalled();
          view.rerender(
            f.ui(swap === "hook" ? { swapped: true } : { childKey: "new" }),
          );
          expect(f.release.mock.calls).toEqual([["first"]]);
          expect(f.setup.mock.calls).toEqual(
            multiple
              ? [["first"], ["stable"], [swap === "hook" ? "second" : "first"]]
              : [["first"], [swap === "hook" ? "second" : "first"]],
          );
          view.unmount();
          expect(f.release.mock.calls.map(([label]) => label).sort()).toEqual(
            f.setup.mock.calls.map(([label]) => label).sort(),
          );
        },
      );

      it("keeps the committed child when a suspended replacement is abandoned", () => {
        const f = fixture();
        const view = render(f.ui());
        view.rerender(f.ui({ swapped: true, suspended: true }));
        expect(view.getByText("loading")).toBeDefined();
        expect(f.release).not.toHaveBeenCalled();
        view.rerender(f.ui());
        expect(view.queryByText("loading")).toBeNull();
        expect(f.setup.mock.calls).toEqual(
          multiple ? [["first"], ["stable"]] : [["first"]],
        );
        expect(f.release).not.toHaveBeenCalled();
        view.unmount();
        expect(f.release.mock.calls).toEqual(f.setup.mock.calls);
      });

      it("releases the committed child when deleted during a suspended replacement", async () => {
        const f = fixture();
        const view = render(f.ui());
        view.rerender(f.ui({ swapped: true, suspended: true }));
        expect(f.release).not.toHaveBeenCalled();
        view.unmount();
        await act(async () => {});
        expect(f.release.mock.calls).toEqual(f.setup.mock.calls);
        expect(f.setup.mock.calls).toEqual(
          multiple ? [["first"], ["stable"]] : [["first"]],
        );
      });

      if (multiple)
        it("permanently releases a removed key while retaining its sibling", () => {
          const f = fixture();
          const view = render(f.ui());
          view.rerender(f.ui({ removed: true }));
          expect(f.setup.mock.calls).toEqual([["first"], ["stable"]]);
          expect(f.release.mock.calls).toEqual([["first"]]);
          view.unmount();
          expect(f.release.mock.calls).toEqual(f.setup.mock.calls);
        });
    });
  },
);

describe.each([false, true])(
  "keys removed in one update, nested in a resource: %s",
  (nested) => {
    it("runs every insertion cleanup before any passive cleanup", () => {
      const events: string[] = [];
      const Child = resource(function useChild({ id }: { id: string }) {
        useEffect(
          () => () => {
            events.push(`passive ${id}`);
          },
          [id],
        );
        useInsertionEffect(
          () => () => {
            events.push(`insertion ${id}`);
          },
          [id],
        );
      });
      const useChildren = (ids: readonly string[]) =>
        useResources(ids.map((id) => withKey(id, Child({ id }))));
      const Parent = resource(function useParent({
        ids,
      }: {
        ids: readonly string[];
      }) {
        useChildren(ids);
      });
      function Host({ ids }: { ids: readonly string[] }) {
        if (nested) useResource(Parent({ ids }));
        else useChildren(ids);
        return null;
      }
      const view = render(<Host ids={["a", "b", "c"]} />);
      view.rerender(<Host ids={["c"]} />);
      expect(events).toEqual([
        "insertion a",
        "insertion b",
        "passive a",
        "passive b",
      ]);
      view.unmount();
    });
  },
);
