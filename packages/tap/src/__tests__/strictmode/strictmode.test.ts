import { describe, it, expect } from "vitest";
import { resource } from "../../core/resource";
import { isDevelopment } from "../../core/helpers/env";
import { tapRef } from "../../hooks/tap-ref";
import { tapState } from "../../hooks/tap-state";
import { tapEffect } from "../../hooks/tap-effect";
import { tapMemo } from "../../hooks/tap-memo";
import { tapResource } from "../../hooks/tap-resource";
import { createResourceRoot } from "../../core/createResourceRoot";
import { withKey } from "../../core/withKey";

describe("Strict Mode", () => {
  it("should be in development", () => {
    expect(isDevelopment).toBe(true);
  });

  it("should persist tapMemo cache across strict mode double render", () => {
    const events: string[] = [];
    let outerCount = 0;
    let memoCount = 0;

    const TestResource = resource(() => {
      const idx = outerCount++;
      events.push(`outer-${idx}`);

      tapMemo(() => {
        events.push(`memo-${memoCount++}`);
        return {};
      }, []);

      events.push(`outerend-${idx}`);
    });

    const root = createResourceRoot();
    root.render(TestResource());

    console.log("Events:", events);

    // tapMemo factory runs twice during first render (strict mode double-call)
    // but should NOT run during second render (cache should persist)
    expect(events).toEqual([
      "outer-0",
      "memo-0",
      "memo-1",
      "outerend-0",
      "outer-1",
      // no memo call here — cache should be reused
      "outerend-1",
    ]);
  });

  it("should double-invoke tapMemo factory and use the first result", () => {
    const events: string[] = [];
    let memoCallCount = 0;

    const TestResource = resource(() => {
      const memoValue = tapMemo(() => {
        memoCallCount++;
        events.push(`memo-${memoCallCount}`);
        return memoCallCount;
      }, []);

      events.push(`render memoValue=${memoValue}`);
    });

    const root = createResourceRoot();
    root.render(TestResource());

    // Matches React useMemo behavior: factory is double-invoked,
    // first result is kept
    expect(events).toEqual([
      "memo-1",
      "memo-2",
      "render memoValue=1",
      "render memoValue=1",
    ]);
  });

  it("should double-render on first render", () => {
    let renderCount = 0;

    const TestResource = resource(() => {
      renderCount++;
      return { renderCount };
    });

    const root = createResourceRoot();
    const sub = root.render(TestResource());
    const output = sub.getValue();

    expect(renderCount).toBe(2);
    expect(output.renderCount).toBe(2);
  });

  it("should double-call hook fns", () => {
    let renderCount = 0;

    const TestResource = resource(() => {
      const ref = tapRef(0);
      const [count] = tapState(() => {
        renderCount++;
        return ++ref.current;
      });
      const [count2] = tapState(() => {
        renderCount++;
        return ++ref.current;
      });

      expect(count).toBe(1);
      expect(count2).toBe(3);
      expect(ref.current).toBe(4);
    });

    const root = createResourceRoot();
    root.render(TestResource());

    expect(renderCount).toBe(4);
  });

  it("should double-commit effects", () => {
    const events: string[] = [];
    const TestResource = resource(() => {
      const ref = tapRef(0);
      ref.current++;
      const count = ref.current;

      tapEffect(() => {
        events.push("mount-1");

        return () => {
          events.push("unmount-1");
        };
      });

      tapEffect(() => {
        events.push("mount-2");

        return () => {
          events.push("unmount-2");
        };
      }, []);

      tapEffect(() => {
        expect(count).toBe(2);

        events.push("mount-3");

        return () => {
          events.push("unmount-3");
        };
      }, [count]);
    });

    const root = createResourceRoot();
    root.render(TestResource());

    expect(events).toEqual([
      "mount-1",
      "mount-2",
      "mount-3",
      "unmount-1",
      "unmount-2",
      "unmount-3",
      "mount-1",
      "mount-2",
      "mount-3",
    ]);
  });

  it("should double-render on child render", () => {
    let renderCount = 0;

    const TestChildResource = resource(() => {
      renderCount++;
      return { renderCount };
    });

    const TestResource = resource(() => {
      return tapResource(TestChildResource());
    });

    const root = createResourceRoot();
    const sub = root.render(TestResource());
    const output = sub.getValue();

    expect(renderCount).toBe(2);
    expect(output.renderCount).toBe(2);
  });

  it("should double-mount before handling state updates", () => {
    const events: string[] = [];
    const TestResource = resource(() => {
      const [id, setId] = tapState(0);
      events.push(`render-${id}`);
      tapEffect(() => {
        events.push(`mount-${id}`);
        setId(1);
        return () => {
          events.push(`unmount-${id}`);
        };
      });
    });

    const root = createResourceRoot();
    root.render(TestResource());

    expect(events).toEqual([
      "render-0",
      "render-0",
      "mount-0",
      "unmount-0",
      "mount-0",
      "render-1",
      "render-1",
      "unmount-0",
      "mount-1",
    ]);
  });

  it("should double-render on child render change", () => {
    let renderCount = 0;
    let fnCount = 0;
    let mountCount = 0;
    let unmountCount = 0;

    const incrementRenderCount = () => {
      renderCount++;
      return renderCount;
    };

    const TestChildResource = resource(() => {
      const [fnState] = tapState(() => {
        fnCount++;
        return fnCount;
      });
      const count = incrementRenderCount();
      tapEffect(() => {
        expect(fnState % 2).toBe(1);
        expect(count).toBe(fnState + 1);

        mountCount++;
        return () => {
          unmountCount++;
        };
      }, [fnState, count]);
      return { renderCount, fnCount, fnState };
    });

    const TestResource = resource(() => {
      const [id, setId] = tapState(0);
      tapEffect(() => {
        setId(1);
      });
      return tapResource(withKey(id, TestChildResource()));
    });

    const root = createResourceRoot();
    const sub = root.render(TestResource());
    const output = sub.getValue();

    expect(renderCount).toBe(4);
    expect(fnCount).toBe(4);
    expect(output.renderCount).toBe(4);
    expect(output.fnCount).toBe(4);
    expect(output.fnState).toBe(3);
    expect(mountCount).toBe(4);
    expect(unmountCount).toBe(3);
  });

  it("should double-render on child render change", () => {
    let renderCount = 0;
    const events: string[] = [];
    const TestChildResource = resource(() => {
      renderCount++;
      events.push(`render-${renderCount}`);

      tapState(() => {
        return events.push(`fn-${renderCount}`);
      });

      const count = renderCount;
      tapEffect(() => {
        events.push(`mount-${count}`);
        return () => {
          events.push(`unmount-${count}`);
        };
      });
    });

    const TestResource = resource(() => {
      const [id, setId] = tapState(0);
      events.push(`outer-render-${id}`);
      tapEffect(() => {
        events.push(`outer-mount-${id}`);
        setId(1);

        return () => {
          events.push(`outer-unmount-${id}`);
        };
      });
      return tapResource(withKey(id, TestChildResource()));
    });

    const root = createResourceRoot();
    root.render(TestResource());

    expect(events).toEqual([
      "outer-render-0",
      "render-1",
      "fn-1",
      "fn-1",
      "outer-render-0",
      "render-2",
      "outer-mount-0",
      "mount-2",
      "outer-unmount-0",
      "unmount-2",
      "outer-mount-0",
      "mount-2",
      "outer-render-1",
      "render-3",
      "fn-3",
      "fn-3",
      "outer-render-1",
      "render-4",
      "outer-unmount-0",
      "outer-mount-1",
      "unmount-2",
      "mount-4",
      "unmount-4",
      "mount-4",
    ]);
    // expect(renderCount).toBe(4);
  });
});
