// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallCommands } from "./install-commands";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const row = (label: string) => screen.getByText(label).parentElement!;

describe("InstallCommands", () => {
  it("labels create for a new project and init for an existing one", () => {
    render(<InstallCommands />);
    expect(
      within(row("New project")).getByText("npx assistant-ui@latest create"),
    ).toBeDefined();
    expect(
      within(row("Existing project")).getByText("npx assistant-ui@latest init"),
    ).toBeDefined();
  });

  it("copies the command its button is labelled with", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<InstallCommands />);
    fireEvent.click(
      screen.getByRole("button", { name: "Copy existing project command" }),
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("npx assistant-ui@latest init"),
    );
  });
});
