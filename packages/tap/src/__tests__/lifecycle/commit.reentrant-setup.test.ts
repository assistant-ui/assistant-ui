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

  it("supersedes the outer frame even when the setup callback is referentially stable", () => {
    const events: string[] = [];
    let current = 0;
    let setCurrent: (value: number) => void;

    const setup = () => {
      const count = current;
      events.push(`setup:${count}`);
      if (count === 0) setCurrent(1);
      return () => events.push(`cleanup:${count}`);
    };

    const hook = () => {
      const [count, setCount] = useState(0);
      current = count;
      setCurrent = setCount;
      useEffect(setup, [count]);
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
