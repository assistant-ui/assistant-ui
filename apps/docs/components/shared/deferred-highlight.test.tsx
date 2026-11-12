// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DeferredHighlight } from "./deferred-highlight";

vi.mock("react-shiki", async (importOriginal) => {
  await importOriginal();
  throw new Error("Highlight chunk unavailable");
});
afterEach(cleanup);

it("keeps current source visible if the highlighter cannot load", async () => {
  const report = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const { rerender } = render(
      <DeferredHighlight language="tsx" theme="vitesse-dark">
        const first = 1;
      </DeferredHighlight>,
    );
    expect(screen.getByText("const first = 1;")).toBeTruthy();
    await vi.dynamicImportSettled();
    rerender(
      <DeferredHighlight language="tsx" theme="vitesse-dark">
        const second = 2;
      </DeferredHighlight>,
    );
    expect(screen.getByText("const second = 2;")).toBeTruthy();
  } finally {
    report.mockRestore();
  }
});
