import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useTapRoot, flushTapSync } from "../../index";
import { useState as useResourceState } from "../../react-hooks/useState";
import { useEffect as useResourceEffect } from "../../react-hooks/useEffect";

describe("useTapRoot nested flush", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not publish a render superseded by a nested handleUpdate", () => {
    const seen: number[] = [];
    let handle: useTapRoot.Root<{ count: number }> | null = null;

    function Host() {
      handle = useTapRoot(function CounterRoot() {
        const [count, setCount] = useResourceState(0);
        useResourceEffect(() => {
          if (count === 0) flushTapSync(() => setCount(1));
        }, [count]);
        return { count };
      });
      return null;
    }

    render(<Host />);
    handle!.subscribe(() => seen.push(handle!.getValue().count));

    expect(handle!.getValue().count).toBe(1);
    expect(seen).toEqual([]);
  });
});
