import { describe, it, expect } from "vitest";
import { resource } from "../../core/resource";
import { isDevelopment } from "../../core/helpers/env";
import { useRef } from "../../hooks/useRef";
import { useState } from "../../hooks/useState";
import { useEffect } from "../../hooks/useEffect";
import { useMemo } from "../../hooks/useMemo";
import { useResource } from "../../hooks/useResource";
import { createResourceRoot } from "../../core/createResourceRoot";
import { withKey } from "../../core/withKey";

describe("Strict Mode", () => {
  it("should be in development", () => {
    expect(isDevelopment).toBe(true);
  });

  it("should persist useMemo cache across strict mode double render", () => {
    const events: string[] = [];
    let outerCount = 0;
    let memoCount = 0;

    const useTestResource = () => {
      const idx = outerCount++;
      events.push(`outer-${idx}`);

      useMemo(() => {
        events.push(`memo-${memoCount++}`);
        return {};
      }, []);

      events.push(`outerend-${idx}`);
    };

    const TestResource = resource(useTestResource);

    const root = createResourceRoot();
    root.render(TestResource());

    console.log("Events:", events);

    // useMemo factory runs twice during first render (strict mode double-call)
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

  it("should double-invoke useMemo factory and use the first result", () => {
    const events: string[] = [];
    let memoCallCount = 0;

    const useTestResource = () => {
      const memoValue = useMemo(() => {
        memoCallCount++;
        events.push(`memo-${memoCallCount}`);
        return memoCallCount;
      }, []);

      events.push(`render memoValue=${memoValue}`);
    };

    const TestResource = resource(useTestResource);

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

    const useTestResource = () => {
      renderCount++;
      return { renderCount };
    };

    const TestResource = resource(useTestResource);

    const root = createResourceRoot();
    const sub = root.render(TestResource());
    const output = sub.getValue();

    expect(renderCount).toBe(2);
    expect(output.renderCount).toBe(2);
  });

  it("should double-call hook fns", () => {
    let renderCount = 0;

    const useTestResource = () => {
      const ref = useRef(0);
      const [count] = useState(() => {
        renderCount++;
        return ++ref.current;
      });
      const [count2] = useState(() => {
        renderCount++;
        return ++ref.current;
      });

      expect(count).toBe(1);
      expect(count2).toBe(3);
      expect(ref.current).toBe(4);
    };

    const TestResource = resource(useTestResource);

    const root = createResourceRoot();
    root.render(TestResource());

    expect(renderCount).toBe(4);
  });

  it("should double-commit effects", () => {
    const events: string[] = [];
    const useTestResource = () => {
      const ref = useRef(0);
      ref.current++;
      const count = ref.current;

      useEffect(() => {
        events.push("mount-1");

        return () => {
          events.push("unmount-1");
        };
      });

      useEffect(() => {
        events.push("mount-2");

        return () => {
          events.push("unmount-2");
        };
      }, []);

      useEffect(() => {
        expect(count).toBe(2);

        events.push("mount-3");

        return () => {
          events.push("unmount-3");
        };
      }, [count]);
    };

    const TestResource = resource(useTestResource);

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

    const useTestChildResource = () => {
      renderCount++;
      return { renderCount };
    };

    const TestChildResource = resource(useTestChildResource);

    const useTestResource = () => {
      return useResource(TestChildResource());
    };

    const TestResource = resource(useTestResource);

    const root = createResourceRoot();
    const sub = root.render(TestResource());
    const output = sub.getValue();

    expect(renderCount).toBe(2);
    expect(output.renderCount).toBe(2);
  });

  it("should double-mount before handling state updates", () => {
    const events: string[] = [];
    const useTestResource = () => {
      const [id, setId] = useState(0);
      events.push(`render-${id}`);
      useEffect(() => {
        events.push(`mount-${id}`);
        setId(1);
        return () => {
          events.push(`unmount-${id}`);
        };
      });
    };

    const TestResource = resource(useTestResource);

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

    const useTestChildResource = () => {
      const [fnState] = useState(() => {
        fnCount++;
        return fnCount;
      });
      const count = incrementRenderCount();
      useEffect(() => {
        expect(fnState % 2).toBe(1);
        expect(count).toBe(fnState + 1);

        mountCount++;
        return () => {
          unmountCount++;
        };
      }, [fnState, count]);
      return { renderCount, fnCount, fnState };
    };

    const TestChildResource = resource(useTestChildResource);

    const useTestResource = () => {
      const [id, setId] = useState(0);
      useEffect(() => {
        setId(1);
      });
      return useResource(withKey(id, TestChildResource()));
    };

    const TestResource = resource(useTestResource);

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
    const useTestChildResource = () => {
      renderCount++;
      events.push(`render-${renderCount}`);

      useState(() => {
        return events.push(`fn-${renderCount}`);
      });

      const count = renderCount;
      useEffect(() => {
        events.push(`mount-${count}`);
        return () => {
          events.push(`unmount-${count}`);
        };
      });
    };

    const TestChildResource = resource(useTestChildResource);

    const useTestResource = () => {
      const [id, setId] = useState(0);
      events.push(`outer-render-${id}`);
      useEffect(() => {
        events.push(`outer-mount-${id}`);
        setId(1);

        return () => {
          events.push(`outer-unmount-${id}`);
        };
      });
      return useResource(withKey(id, TestChildResource()));
    };

    const TestResource = resource(useTestResource);

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
