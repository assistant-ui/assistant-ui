import { describe, it, expect, afterEach, vi } from "vitest";
import { StrictMode, startTransition } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { act } from "@testing-library/react";
import type { TapRoot } from "../../core/types";
import { resource } from "../../core/resource";
import { useResource } from "../../index";
import { useReducer as useResourceReducer } from "../../react-hooks/useReducer";
import { useMemo as useResourceMemo } from "../../react-hooks/useMemo";
import { cleanupAllResources } from "../test-utils";

const probes = vi.hoisted(() => ({ belowCommitted: 0 }));

vi.mock("../../core/helpers/root", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../core/helpers/root")>();
  return {
    ...original,
    setRootVersion: (root: TapRoot, version: number) => {
      if (version < root.committedVersion) probes.belowCommitted++;
      return original.setRootVersion(root, version);
    },
  };
});

let reactRoot: Root | undefined;
let container: HTMLElement | undefined;

afterEach(async () => {
  await act(async () => reactRoot?.unmount());
  container?.remove();
  reactRoot = undefined;
  container = undefined;
  cleanupAllResources();
});

const useStream = () => {
  const [chunks, push] = useResourceReducer(
    (s: readonly string[], c: string) => [...s, c],
    [] as readonly string[],
  );
  return useResourceMemo(() => ({ chunks, push }), [chunks]);
};
const Stream = resource(useStream);

/**
 * A flushSync commit against a pending transition makes React replay the
 * reducer chain from a base below the committed version, which previously
 * threw "Version is less than committed version" as a recoverable error on
 * every replay. The assertions check delivery (every update present) rather
 * than exact equality: the React-hosted bridge applies replayed updates onto
 * already-committed cell state, so cross-lane replays duplicate committed
 * entries. That rebase-fidelity gap predates the version handling and is
 * tracked separately.
 */
describe("React-hosted reducer replay below the committed version", () => {
  it("delivers a transition update rebased across a sync commit without recoverable errors", async () => {
    const recoverable = vi.fn();
    let api!: { chunks: readonly string[]; push: (c: string) => void };

    function App() {
      const value = useResource(Stream({}));
      api = value;
      return <div>{value.chunks.join(",")}</div>;
    }

    container = document.createElement("div");
    document.body.appendChild(container);
    reactRoot = createRoot(container, { onRecoverableError: recoverable });

    await act(async () => {
      reactRoot!.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    });

    await act(async () => {
      startTransition(() => api.push("t1"));
      flushSync(() => api.push("s1"));
    });

    const delivered = container.textContent!.split(",");
    expect(delivered).toContain("t1");
    expect(delivered).toContain("s1");

    await act(async () => {
      api.push("after");
    });

    expect(container.textContent).toContain("after");
    expect(recoverable).not.toHaveBeenCalled();
    expect(probes.belowCommitted).toBeGreaterThan(0);
  });
});
