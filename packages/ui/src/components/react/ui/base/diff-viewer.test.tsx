import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DiffViewer } from "./diff-viewer";

const SMALL_PATCH = [
  "diff --git a/src/example.ts b/src/example.ts",
  "--- a/src/example.ts",
  "+++ b/src/example.ts",
  "@@ -1,2 +1,2 @@",
  " first",
  "-second",
  "+updated",
].join("\n");

const MULTI_FILE_PATCH = [
  "diff --git a/src/first.ts b/src/first.ts",
  "--- a/src/first.ts",
  "+++ b/src/first.ts",
  "@@ -1 +1 @@",
  "-first",
  "+updated first",
  "diff --git a/src/second.ts b/src/second.ts",
  "--- a/src/second.ts",
  "+++ b/src/second.ts",
  "@@ -1,2 +1,2 @@",
  " second",
  "-third",
  "+updated third",
].join("\n");

const NO_NEWLINE_PATCH = [
  "diff --git a/src/example.ts b/src/example.ts",
  "--- a/src/example.ts",
  "+++ b/src/example.ts",
  "@@ -1 +1 @@",
  "-first",
  "\\ No newline at end of file",
  "+updated",
  "\\ No newline at end of file",
].join("\n");

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockResolvedValue();
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("DiffViewer", () => {
  it("copies a file as a unified diff", async () => {
    render(<DiffViewer patch={SMALL_PATCH} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: "Copy diff of src/example.ts",
        }),
      );
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(
      [
        "--- a/src/example.ts",
        "+++ b/src/example.ts",
        "@@ -1,2 +1,2 @@",
        " first",
        "-second",
        "+updated",
      ].join("\n"),
    );
  });

  it("preserves no-newline markers without counting or prefixing them", async () => {
    render(<DiffViewer patch={NO_NEWLINE_PATCH} />);

    expect(screen.getByText("+1")).toBeTruthy();
    expect(screen.getByText("−1")).toBeTruthy();
    expect(
      document.querySelectorAll(
        '[data-slot="diff-viewer-line"][data-type="marker"]',
      ),
    ).toHaveLength(2);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: "Copy diff of src/example.ts",
        }),
      );
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(
      [
        "--- a/src/example.ts",
        "+++ b/src/example.ts",
        "@@ -1 +1 @@",
        "-first",
        "\\ No newline at end of file",
        "+updated",
        "\\ No newline at end of file",
      ].join("\n"),
    );
  });

  it("does not render copy buttons when copying is disabled", () => {
    render(<DiffViewer patch={SMALL_PATCH} copyable={false} />);

    expect(
      screen.queryByRole("button", { name: "Copy diff of src/example.ts" }),
    ).toBeNull();
  });

  it("only collapses files that exceed the line limit", () => {
    const view = render(
      <DiffViewer patch={SMALL_PATCH} maxCollapsedLines={3} />,
    );

    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();

    view.rerender(<DiffViewer patch={SMALL_PATCH} maxCollapsedLines={2} />);

    expect(
      screen.getByRole("button", { name: "Show all 3 lines" }),
    ).toBeTruthy();
  });

  it("expands and collapses an overlong file", () => {
    render(<DiffViewer patch={SMALL_PATCH} maxCollapsedLines={2} />);

    const toggle = screen.getByRole("button", { name: "Show all 3 lines" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBeTruthy();
    expect(screen.queryByText("updated")).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toBe("Show less");
    expect(screen.getByText("updated")).toBeTruthy();

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toBe("Show all 3 lines");
  });

  it("collapses each file in a multi-file patch independently", () => {
    render(<DiffViewer patch={MULTI_FILE_PATCH} maxCollapsedLines={1} />);

    const toggles = screen.getAllByRole("button", { name: /Show all/ });
    expect(toggles).toHaveLength(2);
    expect(toggles[0]?.textContent).toBe("Show all 2 lines");
    expect(toggles[1]?.textContent).toBe("Show all 3 lines");

    fireEvent.click(toggles[0]!);

    expect(toggles[0]?.textContent).toBe("Show less");
    expect(toggles[1]?.textContent).toBe("Show all 3 lines");
  });
});
