import { StrictMode } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useTapHost } from "../../index";
import { c as _c } from "../../react-shim/compiler-runtime";

const SENTINEL = Symbol.for("react.memo_cache_sentinel");

afterEach(() => {
  cleanup();
});

describe("compiled memo identity under StrictMode", () => {
  it("keeps one memoized instance across the StrictMode render replay", () => {
    const instances: object[] = [];

    function Harness() {
      useTapHost(function CompiledHost() {
        const $ = _c(1);
        let owner;
        if ($[0] === SENTINEL) {
          owner = { listeners: new Set<() => void>() };
          $[0] = owner;
        } else {
          owner = $[0];
        }
        instances.push(owner as object);
        return null;
      });
      return null;
    }

    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );

    expect(instances.length).toBeGreaterThanOrEqual(2);
    expect(new Set(instances)).toHaveLength(1);
  });
});
