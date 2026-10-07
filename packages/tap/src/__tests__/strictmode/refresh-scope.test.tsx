import { cleanup, render } from "@testing-library/react";
import {
  StrictMode,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
} from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resource } from "../../core/resource";
import { withKey } from "../../core/withKey";
import { useResource } from "../../hooks/useResource";
import { useResources } from "../../hooks/useResources";
import { useTapHost } from "../../hooks/useTapHost";
import { useRefreshScope } from "../../internal";

afterEach(cleanup);

describe("refresh scopes under StrictMode", () => {
  it.each([
    ["passive", useEffect],
    ["layout", useLayoutEffect],
    ["insertion", useInsertionEffect],
  ] as const)(
    "refreshes nested memos and replays each child's %s effect once",
    (_, useTestEffect) => {
      let value = "old";
      const childRender = vi.fn();
      const setup = vi.fn();
      const dispose = vi.fn();
      const Child = resource(function useChild(id: string) {
        childRender(id);
        const memo = useMemo(() => value, []);
        useTestEffect(() => {
          setup(id, memo);
          return () => dispose(id, memo);
        }, []);
        return memo;
      });
      const single = Child("single");
      const keyed = [
        withKey("a", Child("a"), []),
        withKey("b", Child("b"), []),
      ];

      function App({ token }: { token: number }) {
        const { value: result } = useTapHost(function useParent() {
          return useRefreshScope(token, () => [
            useResource(single),
            ...useResources(keyed),
          ]);
        });
        return <output>{result.join(",")}</output>;
      }

      const { rerender, unmount, getByRole } = render(
        <StrictMode>
          <App token={0} />
        </StrictMode>,
      );
      const mountRenders = childRender.mock.calls.length;
      const mountSetups = setup.mock.calls.length;
      const mountCleanups = dispose.mock.calls.length;
      expect(getByRole("status").textContent).toBe("old,old,old");

      rerender(
        <StrictMode>
          <App token={0} />
        </StrictMode>,
      );
      expect(childRender).toHaveBeenCalledTimes(mountRenders);
      expect(setup).toHaveBeenCalledTimes(mountSetups);
      expect(dispose).toHaveBeenCalledTimes(mountCleanups);

      value = "new";
      rerender(
        <StrictMode>
          <App token={1} />
        </StrictMode>,
      );
      expect(getByRole("status").textContent).toBe("new,new,new");
      expect(childRender.mock.calls.length).toBeGreaterThan(mountRenders);
      expect(setup.mock.calls.slice(mountSetups)).toEqual([
        ["single", "new"],
        ["a", "new"],
        ["b", "new"],
      ]);
      expect(dispose.mock.calls.slice(mountCleanups)).toEqual([
        ["single", "old"],
        ["a", "old"],
        ["b", "old"],
      ]);

      const refreshRenders = childRender.mock.calls.length;
      rerender(
        <StrictMode>
          <App token={1} />
        </StrictMode>,
      );
      expect(childRender).toHaveBeenCalledTimes(refreshRenders);
      expect(setup).toHaveBeenCalledTimes(mountSetups + 3);
      expect(dispose).toHaveBeenCalledTimes(mountCleanups + 3);
      unmount();
      expect(dispose.mock.calls.slice(mountCleanups + 3)).toEqual([
        ["single", "new"],
        ["a", "new"],
        ["b", "new"],
      ]);
    },
  );

  it.each([
    ["passive", useEffect],
    ["layout", useLayoutEffect],
    ["insertion", useInsertionEffect],
  ] as const)(
    "adds exactly one %s effect replay to a normal StrictMode update",
    (_, useTestEffect) => {
      const setup = vi.fn();
      const dispose = vi.fn();
      const controlSetup = vi.fn();
      const controlDispose = vi.fn();

      function App({ token, value }: { token: number; value: string }) {
        useTapHost(function useHostedEffects() {
          useTestEffect(() => {
            controlSetup(value);
            return () => controlDispose(value);
          }, []);
          useRefreshScope(token, () => {
            useTestEffect(() => {
              setup(value);
              return () => dispose(value);
            }, []);
          });
        });
        return null;
      }

      const { rerender, unmount } = render(
        <StrictMode>
          <App token={0} value="old" />
        </StrictMode>,
      );
      expect(setup.mock.calls).toEqual(controlSetup.mock.calls);
      expect(dispose.mock.calls).toEqual(controlDispose.mock.calls);
      const mountSetups = setup.mock.calls.length;
      const mountCleanups = dispose.mock.calls.length;

      rerender(
        <StrictMode>
          <App token={0} value="unchanged" />
        </StrictMode>,
      );
      expect(setup).toHaveBeenCalledTimes(mountSetups);
      expect(dispose).toHaveBeenCalledTimes(mountCleanups);

      rerender(
        <StrictMode>
          <App token={1} value="new" />
        </StrictMode>,
      );
      expect(controlSetup).toHaveBeenCalledTimes(mountSetups);
      expect(controlDispose).toHaveBeenCalledTimes(mountCleanups);
      expect(setup).toHaveBeenCalledTimes(mountSetups + 1);
      expect(dispose).toHaveBeenCalledTimes(mountCleanups + 1);
      expect(dispose).toHaveBeenLastCalledWith("old");
      expect(setup).toHaveBeenLastCalledWith("new");

      rerender(
        <StrictMode>
          <App token={1} value="unchanged" />
        </StrictMode>,
      );
      expect(setup).toHaveBeenCalledTimes(mountSetups + 1);
      expect(dispose).toHaveBeenCalledTimes(mountCleanups + 1);
      unmount();
      expect(dispose).toHaveBeenCalledTimes(mountCleanups + 2);
      expect(dispose).toHaveBeenLastCalledWith("new");
    },
  );
});
