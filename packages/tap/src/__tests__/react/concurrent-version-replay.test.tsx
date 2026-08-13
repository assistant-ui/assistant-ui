import { describe, it, expect, afterEach, vi } from "vitest";
import {
  StrictMode,
  startTransition,
  useReducer as useReactReducer,
} from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { act } from "@testing-library/react";
import type { TapRoot } from "../../core/types";
import { resource } from "../../core/resource";
import { commitRoot, setRootVersion } from "../../core/helpers/root";
import { renderResourceFiber } from "../../core/ResourceFiber";
import { useResource } from "../../index";
import { useReducer as useResourceReducer } from "../../react-hooks/useReducer";
import { useMemo as useResourceMemo } from "../../react-hooks/useMemo";
import { useState as useResourceState } from "../../react-hooks/useState";
import { c as _c } from "../../react-shim/compiler-runtime";
import {
  cleanupAllResources,
  createTestResource,
  renderTest,
} from "../test-utils";

const probes = vi.hoisted(() => ({
  belowCommitted: 0,
  changelogLengths: [] as number[],
}));

vi.mock("../../core/helpers/root", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../core/helpers/root")>();
  return {
    ...original,
    setRootVersion: (root: TapRoot, version: number) => {
      if (version < root.committedVersion) probes.belowCommitted++;
      if (version > root.committedVersion) {
        probes.changelogLengths.push(root.changelog.length);
      }
      return original.setRootVersion(root, version);
    },
  };
});

let reactRoot: Root | undefined;
let container: HTMLElement | undefined;
let oracleRoot: Root | undefined;
let oracleContainer: HTMLElement | undefined;

afterEach(async () => {
  await act(async () => {
    reactRoot?.unmount();
    oracleRoot?.unmount();
  });
  container?.remove();
  oracleContainer?.remove();
  reactRoot = undefined;
  container = undefined;
  oracleRoot = undefined;
  oracleContainer = undefined;
  cleanupAllResources();
  probes.belowCommitted = 0;
  probes.changelogLengths.length = 0;
});

const mountOracle = (): ((chunk: string) => void) => {
  let push!: (chunk: string) => void;
  function Oracle() {
    const [chunks, dispatch] = useReactReducer(
      (s: readonly string[], c: string) => [...s, c],
      [] as readonly string[],
    );
    push = dispatch;
    return <div>{chunks.join(",")}</div>;
  }
  oracleContainer = document.createElement("div");
  document.body.appendChild(oracleContainer);
  oracleRoot = createRoot(oracleContainer);
  act(() => oracleRoot!.render(<Oracle />));
  return (chunk) => push(chunk);
};

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

type CompiledStreamValue = {
  chunks: readonly string[];
  push: (chunk: string) => void;
};

const useCompiledStream = (): CompiledStreamValue => {
  const [chunks, push] = useResourceReducer(
    (s: readonly string[], c: string) => [...s, c],
    [] as readonly string[],
  );
  const $ = _c(2);
  if ($[0] !== chunks) {
    $[0] = chunks;
    $[1] = { chunks, push } satisfies CompiledStreamValue;
  }
  return $[1] as CompiledStreamValue;
};
const CompiledStream = resource(useCompiledStream);

describe("React-hosted reducer replay below the committed version", () => {
  it("logs a StrictMode-dispatched record once", async () => {
    let api!: { push: (chunk: string) => void };

    function App() {
      const value = useResource(Stream());
      api = value;
      return <div>{value.chunks.join(",")}</div>;
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
      api.push("one");
    });

    expect(probes.changelogLengths).toEqual([1, 1]);
    expect(container.textContent).toBe("one");
  });

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

  it("replays a compiled memo cache below the committed version", async () => {
    probes.belowCommitted = 0;
    const recoverable = vi.fn();
    const identities: CompiledStreamValue[] = [];
    let api!: CompiledStreamValue;

    function App() {
      const value = useResource(CompiledStream());
      api = value;
      identities.push(value);
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

    await act(async () => {
      api.push("after");
    });

    expect(identities.at(-1)?.chunks).toEqual(["t1", "s1", "after"]);
    expect(recoverable).not.toHaveBeenCalled();
    expect(probes.belowCommitted).toBeGreaterThan(0);
  });

  it("rolls back a compiled memo cache with the resource version", () => {
    let computes = 0;
    const fiber = createTestResource((x: number) => {
      const $ = _c(2);
      if ($[0] !== x) {
        computes++;
        $[0] = x;
        $[1] = { x };
      }
      return $[1] as { x: number };
    });

    const committed = renderTest(fiber, 1);
    setRootVersion(fiber.root, 3);
    commitRoot(fiber.root);
    setRootVersion(fiber.root, 4);
    expect(renderResourceFiber(fiber, [2])).toEqual({ x: 2 });

    setRootVersion(fiber.root, 2);
    expect(renderTest(fiber, 1)).toBe(committed);
    expect(computes).toBe(2);
  });

  it("rebases a mid-tick mixed-lane chain to the React oracle", async () => {
    let api!: { chunks: readonly string[]; push: (c: string) => void };

    function App() {
      const value = useResource(Stream());
      api = value;
      return <div>{value.chunks.join(",")}</div>;
    }

    container = document.createElement("div");
    document.body.appendChild(container);
    reactRoot = createRoot(container);
    await act(async () => {
      reactRoot!.render(<App />);
    });
    const oraclePush = mountOracle();

    await act(async () => {
      api.push("a");
      oraclePush("a");
      startTransition(() => {
        api.push("t");
        oraclePush("t");
      });
      flushSync(() => {
        api.push("c");
        oraclePush("c");
      });
    });

    expect(oracleContainer!.textContent).toBe("a,t,c");
    expect(container.textContent).toBe(oracleContainer!.textContent);
  });

  it("rebases a mid-tick mixed-lane chain under StrictMode", async () => {
    let api!: { chunks: readonly string[]; push: (c: string) => void };

    function App() {
      const value = useResource(Stream());
      api = value;
      return <div>{value.chunks.join(",")}</div>;
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
      api.push("a");
      startTransition(() => api.push("t"));
      flushSync(() => api.push("c"));
    });

    expect(container.textContent).toBe("a,t,c");
  });

  it("rebases a transition across two flushSync commits to the React oracle", async () => {
    let api!: { chunks: readonly string[]; push: (c: string) => void };

    function App() {
      const value = useResource(Stream());
      api = value;
      return <div>{value.chunks.join(",")}</div>;
    }

    container = document.createElement("div");
    document.body.appendChild(container);
    reactRoot = createRoot(container);
    await act(async () => {
      reactRoot!.render(<App />);
    });
    const oraclePush = mountOracle();

    await act(async () => {
      startTransition(() => {
        api.push("t1");
        oraclePush("t1");
      });
      flushSync(() => {
        api.push("s1");
        oraclePush("s1");
      });
      flushSync(() => {
        api.push("s2");
        oraclePush("s2");
      });
    });

    expect(oracleContainer!.textContent).toBe("t1,s1,s2");
    expect(container.textContent).toBe(oracleContainer!.textContent);
  });

  it("rebases a mid-tick mixed-lane chain across two sync commits to the React oracle", async () => {
    let api!: { chunks: readonly string[]; push: (c: string) => void };

    function App() {
      const value = useResource(Stream());
      api = value;
      return <div>{value.chunks.join(",")}</div>;
    }

    container = document.createElement("div");
    document.body.appendChild(container);
    reactRoot = createRoot(container);
    await act(async () => {
      reactRoot!.render(<App />);
    });
    const oraclePush = mountOracle();

    await act(async () => {
      api.push("a");
      oraclePush("a");
      startTransition(() => {
        api.push("t");
        oraclePush("t");
      });
      flushSync(() => {
        api.push("c1");
        oraclePush("c1");
      });
      flushSync(() => {
        api.push("c2");
        oraclePush("c2");
      });
    });

    expect(oracleContainer!.textContent).toBe("a,t,c1,c2");
    expect(container.textContent).toBe(oracleContainer!.textContent);
  });

  it("rebases two interleaved transitions across sync commits to the React oracle", async () => {
    let api!: { chunks: readonly string[]; push: (c: string) => void };

    function App() {
      const value = useResource(Stream());
      api = value;
      return <div>{value.chunks.join(",")}</div>;
    }

    container = document.createElement("div");
    document.body.appendChild(container);
    reactRoot = createRoot(container);
    await act(async () => {
      reactRoot!.render(<App />);
    });
    const oraclePush = mountOracle();

    await act(async () => {
      api.push("a");
      oraclePush("a");
      startTransition(() => {
        api.push("tA");
        oraclePush("tA");
      });
      flushSync(() => {
        api.push("c1");
        oraclePush("c1");
      });
      startTransition(() => {
        api.push("tB");
        oraclePush("tB");
      });
      flushSync(() => {
        api.push("c2");
        oraclePush("c2");
      });
    });

    expect(container.textContent).toBe(oracleContainer!.textContent);
  });
});
