/**
 * Tests to verify when React strict mode causes double-rendering
 * for different sources of setState calls
 */

import { describe, it, expect } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { StrictMode, useState, useEffect } from "react";

describe("React Strict Mode - Rerender Sources", () => {
  describe("Source 1: Initial render", () => {
    it("should double-render on initial mount", () => {
      const events: string[] = [];

      function TestComponent() {
        const [count] = useState(0);
        events.push(`render count=${count}`);
        return <div>{count}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      expect(events).toEqual(["render count=0", "render count=0"]);
    });
  });

  describe("Source 2: setState in render", () => {
    it("should handle setState during render", () => {
      const events: string[] = [];

      function TestComponent() {
        const [count, setCount] = useState(0);
        events.push(`render count=${count}`);

        // setState during render (this pattern sets state once during initial render)
        if (count === 0) {
          setCount(1);
        }

        return <div>{count}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // ACTUAL: setState during render only renders once with old value,
      // then double-renders with new value
      expect(events).toEqual([
        "render count=0",
        "render count=1",
        "render count=1",
      ]);
    });
  });

  describe("Source 3: setState in useEffect", () => {
    it("should double-render after setState in useEffect", () => {
      const events: string[] = [];

      function TestComponent() {
        const [count, setCount] = useState(0);
        events.push(`render count=${count}`);

        useEffect(() => {
          events.push(`effect count=${count}`);
          if (count === 0) {
            setCount(1);
          }
          return () => {
            events.push(`cleanup count=${count}`);
          };
        }, [count]);

        return <div>{count}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "effect count=0",
        "cleanup count=0",
        "effect count=0",
        "render count=1",
        "render count=1",
        "cleanup count=0",
        "effect count=1",
      ]);
    });
  });

  describe("Source 4: setState in event handler", () => {
    it("should ALSO double-render after setState in event handler (React 19)", () => {
      const events: string[] = [];

      function TestComponent() {
        const [count, setCount] = useState(0);
        events.push(`render count=${count}`);

        return (
          <button
            onClick={() => {
              events.push("click");
              setCount(count + 1);
            }}
          >
            {count}
          </button>
        );
      }

      const { getByRole } = render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // Initial render is double
      expect(events).toEqual(["render count=0", "render count=0"]);

      events.length = 0; // Clear events

      // Click the button
      fireEvent.click(getByRole("button"));

      // ACTUAL: In React 19 strict mode, ALL renders are doubled!
      // Even renders triggered by event handlers!
      expect(events).toEqual(["click", "render count=1", "render count=1"]);
    });

    it("should double-render on ALL event handler clicks (React 19)", () => {
      const events: string[] = [];

      function TestComponent() {
        const [count, setCount] = useState(0);
        events.push(`render count=${count}`);

        return (
          <button
            onClick={() => {
              events.push("click");
              setCount((c) => c + 1);
            }}
          >
            {count}
          </button>
        );
      }

      const { getByRole } = render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      events.length = 0; // Clear initial renders

      // Multiple clicks
      fireEvent.click(getByRole("button"));
      fireEvent.click(getByRole("button"));
      fireEvent.click(getByRole("button"));

      // ACTUAL: Each click causes DOUBLE render in React 19 strict mode
      expect(events).toEqual([
        "click",
        "render count=1",
        "render count=1",
        "click",
        "render count=2",
        "render count=2",
        "click",
        "render count=3",
        "render count=3",
      ]);
    });
  });

  describe("Source 5: setState in setTimeout", () => {
    it("should double-render AND double-call setTimeout callback (React 19)", async () => {
      const events: string[] = [];

      function TestComponent() {
        const [count, setCount] = useState(0);
        events.push(`render count=${count}`);

        useEffect(() => {
          if (count === 0) {
            setTimeout(() => {
              events.push("setTimeout");
              setCount(1);
            }, 10);
          }
        }, [count]);

        return <div>{count}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // Wait for setTimeout
      await waitFor(() => {
        expect(events).toContain("setTimeout");
      });

      // ACTUAL: setTimeout callback runs TWICE and renders are DOUBLED
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "setTimeout",
        "setTimeout",
        "render count=1",
        "render count=1",
      ]);
    });
  });

  describe("Source 6: setState in Promise/async", () => {
    it("should double-render AND double-call Promise callback (React 19)", async () => {
      const events: string[] = [];

      function TestComponent() {
        const [count, setCount] = useState(0);
        events.push(`render count=${count}`);

        useEffect(() => {
          if (count === 0) {
            Promise.resolve().then(() => {
              events.push("promise");
              setCount(1);
            });
          }
        }, [count]);

        return <div>{count}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // Wait for promise
      await waitFor(() => {
        expect(events).toContain("promise");
      });

      // ACTUAL: Promise callback runs TWICE and renders are DOUBLED
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "promise",
        "promise",
        "render count=1",
        "render count=1",
      ]);
    });
  });

  describe("Source 7: Multiple setState calls", () => {
    it("should batch multiple setState calls in event handlers (single render)", () => {
      const events: string[] = [];

      function TestComponent() {
        const [count1, setCount1] = useState(0);
        const [count2, setCount2] = useState(0);
        events.push(`render count1=${count1} count2=${count2}`);

        return (
          <button
            onClick={() => {
              events.push("click");
              setCount1(1);
              setCount2(2);
            }}
          >
            Click
          </button>
        );
      }

      const { getByRole } = render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      events.length = 0; // Clear initial renders

      fireEvent.click(getByRole("button"));

      // ACTUAL: Both setState calls batched, but render is DOUBLED
      expect(events).toEqual([
        "click",
        "render count1=1 count2=2",
        "render count1=1 count2=2",
      ]);
    });

    it("should batch multiple setState calls in useEffect (single double-render)", () => {
      const events: string[] = [];

      function TestComponent() {
        const [count1, setCount1] = useState(0);
        const [count2, setCount2] = useState(0);
        events.push(`render count1=${count1} count2=${count2}`);

        useEffect(() => {
          if (count1 === 0 && count2 === 0) {
            setCount1(1);
            setCount2(2);
          }
        }, [count1, count2]);

        return <div>Test</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // Initial double-render, then batched setState causes another double-render
      expect(events).toEqual([
        "render count1=0 count2=0",
        "render count1=0 count2=0",
        "render count1=1 count2=2",
        "render count1=1 count2=2",
      ]);
    });
  });

  describe("Source 8: setState in useLayoutEffect", () => {
    it("should double-render after setState in useLayoutEffect", () => {
      const events: string[] = [];
      const { useLayoutEffect } = require("react");

      function TestComponent() {
        const [count, setCount] = useState(0);
        events.push(`render count=${count}`);

        useLayoutEffect(() => {
          events.push(`layoutEffect count=${count}`);
          if (count === 0) {
            setCount(1);
          }
          return () => {
            events.push(`layoutCleanup count=${count}`);
          };
        }, [count]);

        return <div>{count}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // useLayoutEffect runs synchronously after render, before paint
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "layoutEffect count=0",
        "layoutCleanup count=0",
        "layoutEffect count=0",
        "render count=1",
        "render count=1",
        "layoutCleanup count=0",
        "layoutEffect count=1",
      ]);
    });
  });

  describe("Source 9: Effect with dependencies calling setState (derived state)", () => {
    it("should handle effect with dependencies and setState", () => {
      const events: string[] = [];

      function TestComponent() {
        const [count] = useState(0);
        const [doubled, setDoubled] = useState(0);
        events.push(`render count=${count} doubled=${doubled}`);

        useEffect(() => {
          events.push(`effect count=${count}`);
          setDoubled(count * 2);
          return () => {
            events.push(`cleanup count=${count}`);
          };
        }, [count]);

        return <div>{doubled}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // setDoubled(0*2) = setDoubled(0) is a no-op, so no extra render
      expect(events).toEqual([
        "render count=0 doubled=0",
        "render count=0 doubled=0",
        "effect count=0",
        "cleanup count=0",
        "effect count=0",
      ]);
    });

    it("should handle effect with dependencies and setState after state change", () => {
      const events: string[] = [];

      function TestComponent() {
        const [count, setCount] = useState(0);
        const [doubled, setDoubled] = useState(0);
        events.push(`render count=${count} doubled=${doubled}`);

        useEffect(() => {
          events.push(`effect count=${count}`);
          setDoubled(count * 2);
          return () => {
            events.push(`cleanup count=${count}`);
          };
        }, [count]);

        return (
          <button onClick={() => setCount((c) => c + 1)}>Click</button>
        );
      }

      const { getByRole } = render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      events.length = 0;

      fireEvent.click(getByRole("button"));

      // Double-render with new count, effect sets doubled=2, triggers another double-render
      expect(events).toEqual([
        "render count=1 doubled=0",
        "render count=1 doubled=0",
        "cleanup count=0",
        "effect count=1",
        "render count=1 doubled=2",
        "render count=1 doubled=2",
      ]);
    });
  });
});
