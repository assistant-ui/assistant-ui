// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Heatmap } from "./heatmap";

const calendarStyleRows = ["Mon", "", "Wed", "", "Fri", "", ""];

const matrixWithBlankAndRepeatedRowLabels = {
  rows: calendarStyleRows,
  cols: ["0h", "", "6h"],
  values: Array.from({ length: calendarStyleRows.length }, (_, r) =>
    Array.from({ length: 3 }, (_, c) => r + c + 1),
  ),
};

afterEach(cleanup);

describe("Heatmap row label keys", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  const duplicateKeyWarnings = () =>
    consoleError.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes("same key"),
    );

  it("uses unique keys for row labels when mark is cell", () => {
    render(
      <Heatmap mark="cell" matrix={matrixWithBlankAndRepeatedRowLabels} />,
    );
    expect(duplicateKeyWarnings()).toEqual([]);
  });

  it("uses unique keys for row labels when mark is dot", () => {
    render(<Heatmap mark="dot" matrix={matrixWithBlankAndRepeatedRowLabels} />);
    expect(duplicateKeyWarnings()).toEqual([]);
  });
});
