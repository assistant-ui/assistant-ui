import { afterEach, describe, expect, it, vi } from "vitest";
import { Activity, StrictMode, useInsertionEffect, useState } from "react";
import { cleanup, render, act } from "@testing-library/react";
import { resource } from "../../core/resource";
import {
  useResource,
  useResources,
  useTapHost,
  useTapRoot,
  withKey,
} from "../../index";
import { useEffect as useResourceEffect } from "../../react-hooks/useEffect";

type Probe = {
  events: string[];
  onRelease?: () => void;
};

const useLeaf = (probe: Probe) => {
  useInsertionEffect(() => {
    probe.events.push("insert");
    return () => {
      probe.events.push("remove");
    };
  }, []);
  useResourceEffect(
    () => () => {
      probe.events.push("release");
      probe.onRelease?.();
    },
    [],
  );
  return null;
};
const Leaf = resource(useLeaf);

const useBranch = (probe: Probe) => useResource(Leaf(probe));
const Branch = resource(useBranch);

const hosts = {
  useResource: function ResourceHost({ probe }: { probe: Probe }) {
    useResource(Branch(probe));
    return null;
  },
  useResources: function ResourcesHost({ probe }: { probe: Probe }) {
    useResources([withKey("branch", Branch(probe))]);
    return null;
  },
  useTapHost: function TapHostHost({ probe }: { probe: Probe }) {
    useTapHost(function TapHost() {
      return useResource(Branch(probe));
    });
    return null;
  },
  useTapRoot: function TapRootHost({ probe }: { probe: Probe }) {
    useTapRoot(function TapRoot() {
      return useResource(Branch(probe));
    });
    return null;
  },
};

const insertionPhaseUpdates = (calls: readonly unknown[][]) =>
  calls
    .map(([message]) => String(message))
    .filter((message) =>
      message.includes("useInsertionEffect must not schedule updates"),
    );

describe.each(Object.entries(hosts))(
  "useInsertionEffect in a resource hosted by %s",
  (_, Host) => {
    afterEach(cleanup);

    const renderHost = (probe: Probe, hidden: boolean) => (
      <StrictMode>
        <Activity mode={hidden ? "hidden" : "visible"}>
          <Host probe={probe} />
        </Activity>
      </StrictMode>
    );

    it("keeps its cleanup through Activity hides and runs it on deletion", async () => {
      const probe: Probe = { events: [] };
      const view = render(renderHost(probe, false));
      await act(async () => view.rerender(renderHost(probe, true)));
      await act(async () => view.rerender(renderHost(probe, false)));
      await act(async () => view.rerender(renderHost(probe, true)));
      await act(async () => view.rerender(renderHost(probe, false)));
      expect(probe.events.filter((event) => event !== "release")).toEqual([
        "insert",
      ]);

      view.unmount();
      expect(probe.events.filter((event) => event !== "release")).toEqual([
        "insert",
        "remove",
      ]);
    });

    it("runs its cleanup when a hidden host is deleted", async () => {
      const probe: Probe = { events: [] };
      const view = render(renderHost(probe, false));
      await act(async () => view.rerender(renderHost(probe, true)));
      expect(probe.events.at(-1)).toBe("release");

      view.unmount();
      expect(probe.events.at(-1)).toBe("remove");
      expect(probe.events.filter((event) => event === "remove")).toHaveLength(
        1,
      );
    });

    it("runs effect cleanups after React's insertion phase on deletion", () => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      let hide!: () => void;
      let released = 0;
      function Parent() {
        const [shown, setShown] = useState(true);
        const [, setReleases] = useState(0);
        const [probe] = useState<Probe>(() => ({
          events: [],
          onRelease: () => setReleases((count) => count + 1),
        }));
        hide = () => setShown(false);
        released = probe.events.filter((event) => event === "release").length;
        return shown ? <Host probe={probe} /> : null;
      }

      render(<Parent />);
      act(() => hide());
      const warnings = insertionPhaseUpdates(errors.mock.calls);
      errors.mockRestore();

      expect(warnings).toEqual([]);
      expect(released).toBeGreaterThan(0);
    });
  },
);
