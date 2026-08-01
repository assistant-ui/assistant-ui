// @vitest-environment jsdom

import { StrictMode, useRef, useState } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useTapHost } from "../index";
import { c } from "./compiler-runtime";

const MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");

type RenderRecord = {
  cache: unknown[];
  memoized: object;
  ref: { current: object };
  state: object;
};

// Emulates React Compiler output running inside a tap resource: compiled
// consumer dist allocates its memo cache through `c()` from this module.
function useCompiledEmulation(records: RenderRecord[]) {
  const $ = c(1);
  let memoized: object;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    memoized = {};
    $[0] = memoized;
  } else {
    memoized = $[0] as object;
  }
  const ref = useRef<object>({});
  const [state] = useState<object>(() => ({}));
  records.push({ cache: $, memoized, ref, state });
}

const makeHarness = (records: RenderRecord[]) => {
  return function Harness(_props: { tick: number }) {
    useTapHost(function CompiledHost() {
      useCompiledEmulation(records);
      return null;
    });
    return null;
  };
};

afterEach(() => {
  cleanup();
});

describe("compiled memo cache inside a tap resource", () => {
  it("re-seeds the c() cache on an uncommitted StrictMode replay while hook cells survive", () => {
    const records: RenderRecord[] = [];
    const Harness = makeHarness(records);

    render(
      <StrictMode>
        <Harness tick={0} />
      </StrictMode>,
    );

    expect(records.length).toBeGreaterThanOrEqual(2);
    expect(new Set(records.map((r) => r.cache))).toHaveLength(records.length);
    expect(new Set(records.map((r) => r.memoized))).toHaveLength(
      records.length,
    );
    expect(new Set(records.map((r) => r.ref))).toHaveLength(1);
    expect(new Set(records.map((r) => r.state))).toHaveLength(1);
  });

  it("persists the committed c() cache across post-mount re-renders", () => {
    const records: RenderRecord[] = [];
    const Harness = makeHarness(records);

    const view = render(
      <StrictMode>
        <Harness tick={0} />
      </StrictMode>,
    );
    const committed = records.at(-1)!;

    const mountRecords = records.length;
    view.rerender(
      <StrictMode>
        <Harness tick={1} />
      </StrictMode>,
    );

    const postCommit = records.slice(mountRecords);
    expect(postCommit.length).toBeGreaterThanOrEqual(1);
    for (const record of postCommit) {
      expect(record.memoized).toBe(committed.memoized);
      expect(record.ref).toBe(committed.ref);
      expect(record.state).toBe(committed.state);
    }
  });
});
