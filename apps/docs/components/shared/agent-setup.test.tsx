// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentSetup } from "./agent-setup";

afterEach(() => {
  cleanup();
});

describe("agent setup banner", () => {
  it("copies the setup prompt for the page's product", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<AgentSetup product="elements/thread-list" />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy the setup prompt for your coding agent",
      }),
    );
    expect(writeText).toHaveBeenCalledWith(
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/thread-list`",
    );
  });

  it("copies the bare prompt for assistant-ui itself", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<AgentSetup product="assistant-ui" prominent />);
    expect(
      screen.getByText("Install assistant-ui with your coding agent"),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy the setup prompt for your coding agent",
      }),
    );
    expect(writeText).toHaveBeenCalledWith("install and set up assistant-ui");
  });

  it("renders a guide's Setup section with the page URL as the prompt", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<AgentSetup product="guides/attachments" section />);
    expect(screen.getByText("Ask your coding agent:")).toBeTruthy();
    expect(screen.queryByText(/You can also use your coding agent/)).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy the setup prompt for your coding agent",
      }),
    );
    expect(writeText).toHaveBeenCalledWith(
      "set up https://www.assistant-ui.com/docs/guides/attachments",
    );
    expect(
      screen.getByRole("button", { name: "More ways to install" }),
    ).toBeTruthy();
  });

  it("renders nothing for an unknown product", () => {
    const { container } = render(<AgentSetup product="nope" />);
    expect(container.innerHTML).toBe("");
  });
});
