// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  theme: "light" as string | undefined,
  setTheme: vi.fn(),
}));

vi.mock("next-themes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-themes")>()),
  useTheme: () => ({ theme: mocks.theme, setTheme: mocks.setTheme }),
}));

import { SetThemeToolUI } from "./set-theme-card";

type SetThemeToolUIProps = ComponentProps<typeof SetThemeToolUI>;

const createProps = (
  overrides: Partial<SetThemeToolUIProps> = {},
): SetThemeToolUIProps => ({
  type: "tool-call",
  toolCallId: "set-theme-1",
  toolName: "set_theme",
  args: { theme: "dark" },
  argsText: '{"theme":"dark"}',
  status: { type: "requires-action", reason: "tool-calls" },
  addResult: vi.fn(),
  resume: vi.fn(),
  respondToApproval: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  mocks.theme = "light";
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("SetThemeToolUI", () => {
  it("renders the approval controls while awaiting a decision", () => {
    render(<SetThemeToolUI {...createProps()} />);

    expect(screen.getByRole("button", { name: "Deny" })).toBeTruthy();
    const allow = screen.getByRole("button", { name: "Allow" });
    expect(allow).toBeTruthy();
    expect(document.activeElement).not.toBe(allow);
    const panel = screen.getByRole("group");
    expect(
      document.getElementById(panel.getAttribute("aria-labelledby")!)
        ?.textContent,
    ).toBe("Switch to dark mode");
  });

  it("applies the requested theme and reports the approved result", () => {
    const addResult = vi.fn();
    render(<SetThemeToolUI {...createProps({ addResult })} />);

    fireEvent.click(screen.getByRole("button", { name: "Allow" }));

    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
    expect(addResult).toHaveBeenCalledWith({
      approved: true,
      theme: "dark",
      previousTheme: "light",
    });
    expect(mocks.setTheme.mock.invocationCallOrder[0]).toBeLessThan(
      addResult.mock.invocationCallOrder[0]!,
    );
  });

  it("reports a denied result without changing the theme", () => {
    const addResult = vi.fn();
    render(<SetThemeToolUI {...createProps({ addResult })} />);

    fireEvent.click(screen.getByRole("button", { name: "Deny" }));

    expect(mocks.setTheme).not.toHaveBeenCalled();
    expect(addResult).toHaveBeenCalledWith({
      approved: false,
      theme: "dark",
    });
  });

  it("renders the result and restores the previous theme from Undo", () => {
    mocks.theme = "dark";
    mocks.setTheme.mockImplementation((next: string) => {
      mocks.theme = next;
    });
    const view = render(
      <SetThemeToolUI
        {...createProps({
          result: {
            approved: true,
            theme: "dark",
            previousTheme: "light",
          },
          status: { type: "complete" },
        })}
      />,
    );

    expect(screen.getByText(/changed the theme to/)).toBeTruthy();
    expect(screen.getByText(/dark/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "undo" }));

    expect(mocks.setTheme).toHaveBeenCalledWith("light");

    view.rerender(
      <SetThemeToolUI
        {...createProps({
          result: {
            approved: true,
            theme: "dark",
            previousTheme: "light",
          },
          status: { type: "complete" },
        })}
      />,
    );

    expect(screen.getByText(/reverted the theme to/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "undo" })).toBeNull();
  });

  it("reports the revert once the page is back on the previous theme", () => {
    mocks.theme = "light";
    render(
      <SetThemeToolUI
        {...createProps({
          result: {
            approved: true,
            theme: "dark",
            previousTheme: "light",
          },
          status: { type: "complete" },
        })}
      />,
    );

    expect(screen.getByText(/reverted the theme to/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "undo" })).toBeNull();
  });

  it("renders the declined outcome", () => {
    render(
      <SetThemeToolUI
        {...createProps({
          result: { approved: false, theme: "dark" },
          status: { type: "complete" },
        })}
      />,
    );

    expect(screen.getByText("theme change declined")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
