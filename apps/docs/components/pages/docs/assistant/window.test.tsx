// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AssistantPanelProvider } from "./context";
import { AskAiWindow } from "./window";

vi.mock("./session", async (importOriginal) => {
  await importOriginal();
  throw new Error("Chat chunk could not load");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("keeps the page and close control available when the chat chunk fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <AssistantPanelProvider>
      <h1>Documentation</h1>
      <AskAiWindow />
    </AssistantPanelProvider>,
  );
  fireEvent.keyDown(document, { key: "i", ctrlKey: true });
  await act(async () => vi.dynamicImportSettled());
  expect(
    await screen.findByRole("button", { name: "Reload page" }),
  ).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain(
    "Chat could not load.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Close chat" }));
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByRole("heading", { name: "Documentation" })).toBeTruthy();
});
