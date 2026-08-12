import { describe, it, expect } from "vitest";
import { createResourceFiberRoot } from "../../core/helpers/root";
import {
  createResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
  unmountResourceFiber,
} from "../../core/ResourceFiber";
import { useEffect } from "../../react-hooks/useEffect";
import { useState } from "../../react-hooks/useState";

// Every shipped host defers dispatches past the current pass; a host that
// synchronously re-renders and commits from inside a setup is the remaining
// reachable shape (flushTapSync during a React-driven commit). The superseded
// frame's cleanup must run instead of overwriting the nested frame's.
describe("commit reentrancy", () => {
  it("a nested commit from inside a setup supersedes the outer frame's cleanup", () => {
    const events: string[] = [];

    const hook = () => {
      const [count, setCount] = useState(0);
      useEffect(() => {
        events.push(`setup:${count}`);
        if (count === 0) setCount(1);
        return () => events.push(`cleanup:${count}`);
      }, [count]);
      return count;
    };

    const root = createResourceFiberRoot((evaluate, apply) => {
      if (!evaluate()) return;
      apply();
      renderResourceFiber(fiber, []);
      commitResourceFiber(fiber);
    });
    const fiber = createResourceFiber(hook, root, undefined, null);

    renderResourceFiber(fiber, []);
    commitResourceFiber(fiber);

    expect(events).toEqual(["setup:0", "setup:1", "cleanup:0"]);

    unmountResourceFiber(fiber);

    expect(events).toEqual(["setup:0", "setup:1", "cleanup:0", "cleanup:1"]);
  });
});
