import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseAnsi, TerminalBlock } from "./terminal-block";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TerminalBlock", () => {
  it("labels successful and failed completions with their state", () => {
    const { rerender } = render(
      <TerminalBlock
        data-testid="terminal"
        command="echo success"
        lines={[]}
        visibleCount={0}
        done
      />,
    );

    expect(screen.getByText("exit 0")).toBeTruthy();
    expect(screen.getByTestId("terminal").dataset.state).toBe("done");

    rerender(
      <TerminalBlock
        data-testid="terminal"
        command="still running"
        lines={["starting"]}
        visibleCount={1}
        done={false}
      />,
    );

    expect(screen.getByTestId("terminal").dataset.state).toBe("running");

    rerender(
      <TerminalBlock
        data-testid="terminal"
        command="failing command"
        lines={[]}
        visibleCount={0}
        done
        exitCode={2}
      />,
    );

    expect(screen.getByText("exit 2")).toBeTruthy();
    expect(screen.getByTestId("terminal").dataset.state).toBe("failed");
  });

  it("counts stdout before stderr when revealing output", () => {
    const { rerender } = render(
      <TerminalBlock
        command="run"
        lines={["stdout one", "stdout two"]}
        stderr={["stderr one"]}
        visibleCount={2}
        done
      />,
    );

    expect(screen.getByText("stdout one")).toBeTruthy();
    expect(screen.getByText("stdout two")).toBeTruthy();
    expect(screen.queryByText("stderr one")).toBeNull();

    rerender(
      <TerminalBlock
        command="run"
        lines={["stdout one", "stdout two"]}
        stderr={["stderr one"]}
        visibleCount={3}
        done
      />,
    );

    const stdout = screen.getByText("stdout two");
    const stderr = screen.getByText("stderr one");
    expect(
      stdout.compareDocumentPosition(stderr) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });

  it("collapses completed output until the toggle expands it", () => {
    render(
      <TerminalBlock
        command="run"
        lines={["one", "two", "three"]}
        visibleCount={3}
        done
        maxCollapsedLines={2}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Show all 3 lines" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBeTruthy();
    expect(screen.queryByText("three")).toBeNull();

    fireEvent.click(toggle);

    expect(
      screen
        .getByRole("button", { name: "Show less" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByText("three")).toBeTruthy();
  });

  it("only offers copied output after a completed run has output", () => {
    const { rerender } = render(
      <TerminalBlock
        command="run"
        lines={["one"]}
        visibleCount={1}
        done={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Copy output" })).toBeNull();

    rerender(<TerminalBlock command="run" lines={[]} visibleCount={0} done />);
    expect(screen.queryByRole("button", { name: "Copy output" })).toBeNull();

    rerender(
      <TerminalBlock command="run" lines={["one"]} visibleCount={1} done />,
    );
    expect(screen.getByRole("button", { name: "Copy output" })).toBeTruthy();
  });

  it("copies the visible text instead of the raw ANSI escapes", () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(
      <TerminalBlock
        command="run"
        lines={["\u001b[31mred\u001b[0m line"]}
        visibleCount={1}
        done
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy output" }));

    expect(writeText).toHaveBeenCalledWith("red line");
  });
});

describe("parseAnsi", () => {
  it("keeps supported foreground colors and text styles through resets", () => {
    expect(parseAnsi("\u001b[1;94mblue\u001b[22mdim\u001b[39mplain")).toEqual([
      { text: "blue", color: 94, bold: true, dim: false },
      { text: "dim", color: 94, bold: false, dim: false },
      { text: "plain", color: undefined, bold: false, dim: false },
    ]);
  });

  it("strips cursor, erase, and OSC sequences", () => {
    expect(parseAnsi("\u001b[2Kready\u001b]0;title\u0007\u001b[2Dnow")).toEqual(
      [{ text: "readynow", color: undefined, bold: false, dim: false }],
    );
  });

  it("consumes extended color parameters instead of misreading them as plain codes", () => {
    expect(parseAnsi("\u001b[38;2;255;100;50mtruecolor")).toEqual([
      { text: "truecolor", color: undefined, bold: false, dim: false },
    ]);
    expect(parseAnsi("\u001b[48;5;34mindexed")).toEqual([
      { text: "indexed", color: undefined, bold: false, dim: false },
    ]);
  });
});
