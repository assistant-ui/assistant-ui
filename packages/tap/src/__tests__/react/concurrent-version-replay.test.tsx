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
import { useState as useResourceState } from "../../react-hooks/useState";
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

const useStreamWithCounter = () => {
  const [chunks, push] = useResourceReducer(
    (s: readonly string[], c: string) => [...s, c],
    [] as readonly string[],
  );
  const [count, increment] = useResourceState(0);
  return useResourceMemo(
    () => ({ chunks, count, push, increment }),
    [chunks, count],
  );
};
const StreamWithCounter = resource(useStreamWithCounter);

describe("React-hosted reducer replay below the committed version", () => {
  it("delivers a transition update rebased across a sync commit without recoverable errors", async () => {
    const recoverable = vi.fn();
    let api!: { chunks: readonly string[]; push: (c: string) => void };

    function App() {
      const value = useResource(Stream());
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
    expect(delivered).toEqual(["t1", "s1"]);

    await act(async () => {
      api.push("after");
    });

    expect(container.textContent).toContain("after");
    expect(recoverable).not.toHaveBeenCalled();
    expect(probes.belowCommitted).toBeGreaterThan(0);
  });

  it("recomputes eager state when a cumulative update is rebased", async () => {
    let api!: {
      chunks: readonly string[];
      count: number;
      push: (chunk: string) => void;
      increment: (action: (value: number) => number) => void;
    };

    function App() {
      const value = useResource(StreamWithCounter());
      api = value;
      return (
        <div>
          {value.chunks.join(",")}|{value.count}
        </div>
      );
    }

    container = document.createElement("div");
    document.body.appendChild(container);
    reactRoot = createRoot(container);

    await act(async () => {
      reactRoot!.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    });

    await act(async () => {
      startTransition(() => {
        api.push("t1");
        api.increment((value) => value + 1);
      });
      flushSync(() => {
        api.push("s1");
        api.increment((value) => value + 1);
      });
    });

    expect(container.textContent).toBe("t1,s1|2");
  });
});
