// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  memories: [] as { id: string; text: string; createdAt: number }[],
}));

vi.mock("@/lib/memory-store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/memory-store")>()),
  useMemories: () => mocks.memories,
}));

import { MemoryView } from "./memory";

afterEach(() => {
  cleanup();
});

describe("MemoryView", () => {
  it("explains where memories live and offers no bulk action when empty", () => {
    mocks.memories = [];
    render(<MemoryView />);

    expect(screen.getByText(/Nothing remembered yet/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "forget all" })).toBeNull();
  });

  it("lists memories and forgets one", () => {
    mocks.memories = [
      {
        id: "memory-1",
        text: "They prefer TypeScript examples.",
        createdAt: 1,
      },
      { id: "memory-2", text: "They ship on Vercel.", createdAt: 2 },
    ];
    const onForget = vi.fn();
    render(<MemoryView onForget={onForget} />);

    expect(screen.getByText("They ship on Vercel.")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: 'Forget "They prefer TypeScript examples."',
      }),
    );

    expect(onForget).toHaveBeenCalledWith("memory-1");
  });

  it("clears every memory", () => {
    mocks.memories = [
      {
        id: "memory-1",
        text: "They prefer TypeScript examples.",
        createdAt: 1,
      },
    ];
    const onClear = vi.fn();
    render(<MemoryView onClear={onClear} />);

    fireEvent.click(screen.getByRole("button", { name: "forget all" }));

    expect(onClear).toHaveBeenCalled();
  });
});
