/**
 * tap-only strict-mode behaviors: nested child resources and withKey identity.
 * Children render inline during the parent's render (unlike React components),
 * so these sequences have no React analog to compare against; everything that
 * does is covered differentially in strictmode-parity.test.tsx.
 */

import { describe, it, expect } from "vitest";
import { resource } from "../../core/resource";
import { isDevelopment } from "../../core/helpers/env";
import { useState } from "../../react-hooks/useState";
import { useEffect } from "../../react-hooks/useEffect";
import { useResource } from "../../hooks/useResource";
import { createTapRoot } from "../../core/createTapRoot";
import { withKey } from "../../core/withKey";

describe("Strict Mode", () => {
  it("should be in development", () => {
    expect(isDevelopment).toBe(true);
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

    const sub = createTapRoot(function Root() {
      return useTestResource();
    });
    const output = sub.getValue();

    expect(renderCount).toBe(2);
    expect(output.renderCount).toBe(2);
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

    const sub = createTapRoot(function Root() {
      return useTestResource();
    });
    const output = sub.getValue();

    expect(renderCount).toBe(4);
    expect(fnCount).toBe(4);
    expect(output.renderCount).toBe(4);
    expect(output.fnCount).toBe(4);
    expect(output.fnState).toBe(3);
    expect(mountCount).toBe(4);
    expect(unmountCount).toBe(3);
  });

  it("should sequence child remounts on key change", () => {
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

    createTapRoot(function Root() {
      return useTestResource();
    });

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
  });
});
