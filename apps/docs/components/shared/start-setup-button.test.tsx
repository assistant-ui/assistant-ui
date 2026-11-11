// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StartSetupButton } from "./start-setup-button";

const mocks = vi.hoisted(() => ({ beginSetup: vi.fn() }));
vi.mock("./setup-navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./setup-navigation")>()),
  useBeginSetup: () => mocks.beginSetup,
}));

afterEach(() => {
  cleanup();
  mocks.beginSetup.mockReset();
});

describe("start setup button", () => {
  it("starts an assistant-ui setup without asking how", () => {
    render(
      <StartSetupButton location="shop_product">Start setup</StartSetupButton>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start setup" }));
    expect(screen.queryByRole("radio")).toBeNull();
    expect(mocks.beginSetup).toHaveBeenCalledWith(["assistant-ui"], "", {
      source: "start_button",
      location: "shop_product",
    });
  });

  it("starts the given products with instructions from a custom trigger, keeping its own click", () => {
    const ownClick = vi.fn();
    render(
      <StartSetupButton
        location="footer"
        products={["assistant-ui", "generative-frame"]}
        instructions="Use the assistant-ui toolkit."
        trigger={<button type="button" onClick={ownClick} />}
      >
        With assistant-ui
      </StartSetupButton>,
    );
    fireEvent.click(screen.getByRole("button", { name: "With assistant-ui" }));
    expect(mocks.beginSetup).toHaveBeenCalledWith(
      ["assistant-ui", "generative-frame"],
      "Use the assistant-ui toolkit.",
      { source: "start_button", location: "footer" },
    );
    expect(ownClick).toHaveBeenCalledOnce();
  });
});
