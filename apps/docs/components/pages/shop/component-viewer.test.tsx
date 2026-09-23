// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComponentViewer } from "./component-viewer";
import { textPreset } from "./component-viewer-entries";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
}));

Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
  history.replaceState(null, "", "#");
});

describe("ComponentViewer", () => {
  it("opens on the intro and switches entries from the rail", async () => {
    render(<ComponentViewer />);
    expect(screen.getByText(/Welcome to the setup wizard/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Choice" }));
    expect(
      await screen.findByRole("heading", {
        name: "Which agent framework runs your backend?",
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Closed" }));
    expect(await screen.findByText(/Setup complete/)).toBeTruthy();
  });

  it("applies a text preset to an option label", async () => {
    location.hash = "choice";
    render(<ComponentViewer />);
    const aside = screen.getByRole("complementary");
    fireEvent.click(
      (await within(aside).findAllByRole("button", { name: "no spaces" }))[1]!,
    );
    expect(
      screen.getAllByText(textPreset("no spaces", "")).length,
    ).toBeGreaterThan(0);
  });

  it("walks the install entry through planning, writing and running", async () => {
    location.hash = "install";
    render(<ComponentViewer />);
    expect(await screen.findByRole("progressbar")).toBeTruthy();
    const phase = within(screen.getByRole("complementary"))
      .getAllByRole("combobox")
      .find((select) => within(select).queryByText("planning") !== null)!;
    fireEvent.change(phase, { target: { value: "planning" } });
    expect(await screen.findByText("Planning the steps…")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    fireEvent.change(phase, { target: { value: "writing" } });
    expect(await screen.findByText("Writing the next step…")).toBeTruthy();
    expect(screen.getByText("Install @assistant-ui/react")).toBeTruthy();
  });
});
