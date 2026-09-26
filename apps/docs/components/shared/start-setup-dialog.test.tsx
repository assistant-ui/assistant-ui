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
  render(<StartSetupDialog location="hero">Start setup</StartSetupDialog>);
  fireEvent.click(screen.getByRole("button", { name: "Start setup" }));
  return screen.getByRole("button", { name: "Continue" });
};

describe("start setup dialog", () => {
  it("opens with the recommended method chosen", () => {
    const confirm = open();
    expect(screen.getByRole("radio", { name: /Coding agent/ })).toHaveProperty(
      "checked",
      true,
    );
    expect(confirm).toHaveProperty("disabled", false);
    expect(mocks.beginSetup).not.toHaveBeenCalled();
  });

  it("preselects the recommended method again when reopened after another choice", () => {
    open();
    fireEvent.click(screen.getByRole("radio", { name: /Manual/ }));
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    expect(screen.queryByRole("radio", { name: /Manual/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start setup" }));
    expect(screen.getByRole("radio", { name: /Coding agent/ })).toHaveProperty(
      "checked",
      true,
    );
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
