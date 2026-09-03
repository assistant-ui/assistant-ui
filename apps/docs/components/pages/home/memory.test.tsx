// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  memories: [] as { id: string; text: string; createdAt: number }[],
  instruction: undefined as string | undefined,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAssistantInstructions: ({ instruction }: { instruction: string }) => {
    mocks.instruction = instruction;
  },
}));

vi.mock("@/lib/memory-store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/memory-store")>()),
  useMemories: () => mocks.memories,
}));

import { MemoryInstructions, RememberToolUI, SidebarMemory } from "./memory";

afterEach(() => {
  cleanup();
});

describe("RememberToolUI", () => {
  it("renders the remembered chip and forgets it", () => {
    const onForget = vi.fn();
    render(
      <RememberToolUI
        status={{ type: "complete" }}
        result={{
          id: "memory-1",
          text: "They prefer TypeScript examples.",
          change: "added",
        }}
        onForget={onForget}
      />,
    );

    expect(screen.getByText(/They prefer TypeScript examples\./)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: 'Forget "They prefer TypeScript examples."',
      }),
    );

    expect(onForget).toHaveBeenCalledWith("memory-1");
  });
});

describe("SidebarMemory", () => {
  it("renders nothing when there are no memories", () => {
    const { container } = render(<SidebarMemory memories={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("lists memories and clears them", () => {
    const memories = [
      {
        id: "memory-1",
        text: "They prefer TypeScript examples.",
        createdAt: 1,
      },
    ];
    let clear = () => {};
    const view = render(
      <SidebarMemory memories={memories} onClear={() => clear()} />,
    );
    clear = () => view.rerender(<SidebarMemory memories={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Memory (1)" }));
    expect(screen.getByText("They prefer TypeScript examples.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Forget all" }));

    expect(view.container.firstChild).toBeNull();
  });
});

describe("MemoryInstructions", () => {
  it("keeps the instruction block inside the route's system prompt budget", () => {
    const memories = Array.from({ length: 20 }, (_, index) => ({
      id: `memory-${index}`,
      text: `${index}`.padEnd(200, "x"),
      createdAt: index,
    }));
    mocks.memories = memories;

    render(<MemoryInstructions />);

    const instruction = mocks.instruction!;
    expect(instruction.length).toBeLessThanOrEqual(1_200);
    expect(instruction).toContain(memories.at(-1)!.text);
    expect(instruction).not.toContain(memories[0]!.text);
  });
});
