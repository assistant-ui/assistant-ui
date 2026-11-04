// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

// The missing-config state renders neither of these, and both pull in the whole runtime.
vi.mock("./shell/XuluxShell", () => ({ XuluxShell: () => null }));
vi.mock("./runtime/xulux-thread-list-adapter", () => ({
  createXuluxLocalThreadListAdapter: vi.fn(),
}));

import { XuluxApp } from "./XuluxApp";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ASSISTANT_BASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_XULUX_ASSISTANT_BASE_URL", "");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

it("gives the skip link a target on /learn without a cloud URL", () => {
  render(<XuluxApp mode="learn" />);

  expect(screen.getByRole("main").id).toBe("main-content");
  expect(screen.getByText(/Xulux playground requires/)).toBeTruthy();
});

it("leaves the main landmark to the playground page", () => {
  render(<XuluxApp mode="playground" />);

  expect(screen.queryByRole("main")).toBeNull();
  expect(screen.getByText(/Xulux playground requires/)).toBeTruthy();
});
