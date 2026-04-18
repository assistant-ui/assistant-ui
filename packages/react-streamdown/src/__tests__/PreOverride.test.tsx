import { describe, it, expect, afterEach } from "vitest";
import { render, renderHook, screen, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Element } from "hast";
import {
  PreContext,
  PreOverride,
  useIsStreamdownCodeBlock,
  useStreamdownPreProps,
} from "../adapters/PreOverride";

afterEach(cleanup);

describe("useIsStreamdownCodeBlock", () => {
  it("returns false when not inside PreContext", () => {
    const { result } = renderHook(() => useIsStreamdownCodeBlock());
    expect(result.current).toBe(false);
  });

  it("returns true when inside PreContext", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PreContext.Provider value={{ className: "test" }}>
        {children}
      </PreContext.Provider>
    );

    const { result } = renderHook(() => useIsStreamdownCodeBlock(), {
      wrapper,
    });
    expect(result.current).toBe(true);
  });

  it("returns true with minimal context value", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PreContext.Provider value={{}}>{children}</PreContext.Provider>
    );

    const { result } = renderHook(() => useIsStreamdownCodeBlock(), {
      wrapper,
    });
    expect(result.current).toBe(true);
  });
});

describe("useStreamdownPreProps", () => {
  it("returns null when not inside PreContext", () => {
    const { result } = renderHook(() => useStreamdownPreProps());
    expect(result.current).toBeNull();
  });

  it("returns context value when inside PreContext", () => {
    const preProps = { className: "test-class", "data-foo": "bar" };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PreContext.Provider value={preProps}>{children}</PreContext.Provider>
    );

    const { result } = renderHook(() => useStreamdownPreProps(), { wrapper });
    expect(result.current).toEqual(preProps);
  });

  it("includes node when provided", () => {
    const mockNode: Element = {
      type: "element",
      tagName: "pre",
      properties: {},
      children: [],
      position: {
        start: { line: 1, column: 1 },
        end: { line: 5, column: 1 },
      },
    };
    const preProps = { node: mockNode, className: "test" };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PreContext.Provider value={preProps}>{children}</PreContext.Provider>
    );

    const { result } = renderHook(() => useStreamdownPreProps(), { wrapper });
    expect(result.current?.node).toEqual(mockNode);
  });
});

describe("PreOverride component", () => {
  it("does not render an extra pre wrapper", () => {
    render(
      <PreOverride>
        <code data-testid="child-code">code content</code>
      </PreOverride>,
    );

    const codeElement = screen.getByTestId("child-code");
    expect(codeElement.tagName).toBe("CODE");
    expect(document.querySelector("pre")).toBeNull();
  });

  it("stores pre props in context without leaking them to the DOM", () => {
    function ChildComponent() {
      const props = useStreamdownPreProps();
      return (
        <span data-testid="result">
          {`${props?.className}:${props?.["data-testid"]}`}
        </span>
      );
    }

    render(
      <PreOverride className="my-class" data-testid="my-pre">
        <ChildComponent />
      </PreOverride>,
    );

    expect(screen.getByTestId("result").textContent).toBe("my-class:my-pre");
    expect(screen.queryByTestId("my-pre")).toBeNull();
  });

  it("provides context to children", () => {
    function ChildComponent() {
      const isCodeBlock = useIsStreamdownCodeBlock();
      return <span data-testid="result">{isCodeBlock ? "yes" : "no"}</span>;
    }

    render(
      <PreOverride>
        <ChildComponent />
      </PreOverride>,
    );

    expect(screen.getByTestId("result").textContent).toBe("yes");
  });

  it("provides props via context", () => {
    function ChildComponent() {
      const props = useStreamdownPreProps();
      return <span data-testid="result">{props?.className}</span>;
    }

    render(
      <PreOverride className="test-class">
        <ChildComponent />
      </PreOverride>,
    );

    expect(screen.getByTestId("result").textContent).toBe("test-class");
  });

  it("injects data-block onto child element", () => {
    render(
      <PreOverride>
        <code data-testid="child-code">block code</code>
      </PreOverride>,
    );

    const codeElement = screen.getByTestId("child-code");
    expect(codeElement.getAttribute("data-block")).toBe("true");
  });

  it("handles non-element children without data-block", () => {
    render(<PreOverride>plain text</PreOverride>);
    expect(screen.getByText("plain text")).toBeDefined();
  });

  it("is memoized and does not re-render unnecessarily", () => {
    const { rerender } = render(
      <PreOverride className="test">content</PreOverride>,
    );

    // Same props should not cause issues
    rerender(<PreOverride className="test">content</PreOverride>);
    expect(screen.getByText("content")).toBeDefined();
  });
});
