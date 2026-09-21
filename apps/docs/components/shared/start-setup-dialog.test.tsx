// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StartSetupDialog } from "./start-setup-dialog";

const mocks = vi.hoisted(() => ({ push: vi.fn(), beginSetup: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("./setup-navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./setup-navigation")>()),
  useBeginSetup: () => mocks.beginSetup,
}));

afterEach(cleanup);

const open = () => {
  render(<StartSetupDialog>Start setup</StartSetupDialog>);
  fireEvent.click(screen.getByRole("button", { name: "Start setup" }));
  return screen.getByRole("button", { name: "Continue" });
};

describe("start setup dialog", () => {
  it("enables Continue only once a method is chosen", () => {
    const confirm = open();
    expect(confirm).toHaveProperty("disabled", true);
    expect(mocks.beginSetup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: /Coding agent/ }));
    expect(confirm).toHaveProperty("disabled", false);
  });

  it("starts an assistant-ui setup session for the coding agent", () => {
    const confirm = open();
    fireEvent.click(screen.getByRole("radio", { name: /Coding agent/ }));
    fireEvent.click(confirm);
    expect(mocks.beginSetup).toHaveBeenCalledWith(["assistant-ui"]);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("sends the manual path to the installation guide", () => {
    const confirm = open();
    fireEvent.click(screen.getByRole("radio", { name: /Manual/ }));
    fireEvent.click(confirm);
    expect(mocks.push).toHaveBeenCalledWith("/docs/installation");
    expect(mocks.beginSetup).not.toHaveBeenCalled();
  });
});
