// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { analytics } from "@/lib/analytics";
import { SetupCommandPrompt } from "./setup-command-prompt";

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  toastSuccess.mockClear();
  toastError.mockClear();
});

const stubClipboard = () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
};

const openMenu = () =>
  fireEvent.click(screen.getByRole("button", { name: "More ways to install" }));

describe("setup command prompt", () => {
  it("shows only the prompt, no label, and copies it", () => {
    const writeText = stubClipboard();
    const copied = vi.spyOn(analytics.cta, "promptCopied");
    render(<SetupCommandPrompt page="home" section="hero" />);
    const prompt = screen.getByRole("button", {
      name: "Copy the setup prompt for your coding agent",
    });
    expect(prompt.textContent).toBe("install and set up assistant-ui");
    fireEvent.click(prompt);
    expect(writeText).toHaveBeenCalledWith("install and set up assistant-ui");
    expect(copied).toHaveBeenCalledWith({ page: "home", section: "hero" });
  });

  it("opens the menu and reports it once per open", async () => {
    const opened = vi.spyOn(analytics.cta, "setupMenuOpened");
    render(<SetupCommandPrompt page="home" section="hero" />);
    expect(screen.queryByRole("menu")).toBeNull();
    openMenu();
    expect(await screen.findByRole("menu")).toBeTruthy();
    expect(opened).toHaveBeenCalledTimes(1);
    expect(opened).toHaveBeenCalledWith("hero");
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent?.trim()),
    ).toEqual(["Copy prompt for coding agents", "Manual installation steps"]);
  });

  it("copies the prompt from the menu", async () => {
    const writeText = stubClipboard();
    const copied = vi.spyOn(analytics.cta, "promptCopied");
    render(<SetupCommandPrompt page="docs" section="overview" />);
    openMenu();
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "Copy prompt for coding agents",
      }),
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("install and set up assistant-ui"),
    );
    await waitFor(() =>
      expect(copied).toHaveBeenCalledWith({
        page: "docs",
        section: "overview",
      }),
    );
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("says so instead of claiming a copy when the clipboard write fails", async () => {
    const writeText = stubClipboard();
    writeText.mockRejectedValue(new Error("denied"));
    const copied = vi.spyOn(analytics.cta, "promptCopied");
    render(<SetupCommandPrompt page="docs" section="overview" />);
    openMenu();
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "Copy prompt for coding agents",
      }),
    );
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(copied).not.toHaveBeenCalled();
  });

  it("links the manual steps and reports the click with the menu location", async () => {
    const clicked = vi.spyOn(analytics.cta, "clicked");
    render(<SetupCommandPrompt page="home" section="hero" />);
    openMenu();
    const manual = await screen.findByRole("menuitem", {
      name: "Manual installation steps",
    });
    expect(manual.getAttribute("href")).toBe("/docs/manual-installation");
    fireEvent.click(manual);
    expect(clicked).toHaveBeenCalledWith("start_setup_manual", "hero_menu");
  });
});
