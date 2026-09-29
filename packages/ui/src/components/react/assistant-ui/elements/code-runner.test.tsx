import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CodeRunner } from "./code-runner";

afterEach(cleanup);

describe("CodeRunner", () => {
  it("shows the run action only when it can run the snippet", () => {
    const onRun = vi.fn();
    const { rerender } = render(
      <CodeRunner language="ts" code="1 + 1" state="idle" output={[]} />,
    );

    expect(
      screen.queryByRole("button", { name: "Run this snippet" }),
    ).toBeNull();

    rerender(
      <CodeRunner
        language="ts"
        code="1 + 1"
        state="idle"
        output={[]}
        onRun={onRun}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Run this snippet" }));

    expect(onRun).toHaveBeenCalledOnce();
  });

  it("keeps the disabled running indicator without a handler", () => {
    render(
      <CodeRunner
        language="ts"
        code="await run()"
        state="running"
        output={[]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Run this snippet" }),
    ).toHaveProperty("disabled", true);
  });
});
