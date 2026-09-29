import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useCallbackRef } from "../useCallbackRef";

afterEach(cleanup);

describe("useCallbackRef", () => {
  const Harness = ({ label }: { label: string }) => {
    const Wrapped = useCallbackRef(() => (
      <span data-testid="out">{label}</span>
    ));
    return <Wrapped />;
  };

  it("keeps the same component identity across renders", () => {
    let seen: unknown;
    const Capture = ({ label }: { label: string }) => {
      const Wrapped = useCallbackRef(() => <span>{label}</span>);
      seen ??= Wrapped;
      expect(Wrapped).toBe(seen);
      return <Wrapped />;
    };
    const { rerender } = render(<Capture label="a" />);
    rerender(<Capture label="b" />);
  });

  it("renders the latest callback in the render that supplies it", () => {
    const { rerender } = render(<Harness label="a" />);
    expect(screen.getByTestId("out").textContent).toBe("a");

    rerender(<Harness label="b" />);
    expect(screen.getByTestId("out").textContent).toBe("b");
  });
});
