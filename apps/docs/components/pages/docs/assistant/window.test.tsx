// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { AssistantPanelProvider } from "./context";
import { AskAiWindow } from "./window";

const chunk = vi.hoisted(() => {
  let reject!: (error: Error) => void;
  const pending = new Promise<void>((_, fail) => {
    reject = fail;
  });
  let requested!: () => void;
  const started = new Promise<void>((resolve) => {
    requested = resolve;
  });
  return { pending, reject, started, requested };
});

vi.mock("./session", async (importOriginal) => {
  const original = await importOriginal<typeof import("./session")>();
  chunk.requested();
  await chunk.pending;
  return { ...original };
});

beforeAll(async () => {
  await vi.importActual("./session");
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
  expect(screen.getByRole("status").textContent).toBe("Loading chat…");
  await act(async () => {
    await chunk.started;
    chunk.reject(new Error("Chat chunk could not load"));
    await vi.dynamicImportSettled();
  });
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
