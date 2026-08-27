// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { startTransition, Suspense, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  unstable_useSlashCommandAdapter,
  type Unstable_SlashCommand,
} from "./useSlashCommandAdapter";

const command = (
  label: string,
  execute: () => void,
): Unstable_SlashCommand => ({
  id: "run",
  label,
  execute,
});

describe("unstable_useSlashCommandAdapter", () => {
  it("keeps commands scoped to committed renders", () => {
    const executeA = vi.fn();
    const executeB = vi.fn();
    const commandsA = [command("Workspace A", executeA)];
    const commandsB = [command("Workspace B", executeB)];
    const renderedLabel = vi.fn();
    const interruptedRender = vi.fn();
    const pending = new Promise<never>(() => {});
    let blocked = false;

    const Blocker = () => {
      if (blocked) {
        interruptedRender();
        throw pending;
      }
      return null;
    };
    const Wrapper = ({ children }: PropsWithChildren) => (
      <Suspense fallback={null}>
        {children}
        <Blocker />
      </Suspense>
    );

    const { result, rerender } = renderHook(
      ({ commands }) => {
        renderedLabel(commands[0]?.label);
        return unstable_useSlashCommandAdapter({ commands });
      },
      {
        initialProps: { commands: commandsA },
        wrapper: Wrapper,
      },
    );

    act(() => {
      blocked = true;
      startTransition(() => rerender({ commands: commandsB }));
    });

    expect(interruptedRender).toHaveBeenCalled();
    expect(renderedLabel).toHaveBeenCalledWith("Workspace B");
    expect(result.current.adapter.search?.("")).toEqual([
      { id: "run", type: "command", label: "Workspace A" },
    ]);

    result.current.action.onExecute({
      id: "run",
      type: "command",
      label: "Workspace A",
    });
    expect(executeA).toHaveBeenCalledOnce();
    expect(executeB).not.toHaveBeenCalled();
  });

  it("updates search while keeping actions stable after commands commit", () => {
    const executeA = vi.fn();
    const executeB = vi.fn();
    const commandsA = [command("Workspace A", executeA)];
    const commandsB = [command("Workspace B", executeB)];
    const { result, rerender } = renderHook(
      ({ commands }) => unstable_useSlashCommandAdapter({ commands }),
      { initialProps: { commands: commandsA } },
    );
    const initial = result.current;

    rerender({ commands: commandsB });

    expect(result.current.adapter).not.toBe(initial.adapter);
    expect(result.current.action).toBe(initial.action);
    expect(result.current.adapter.search?.("")).toEqual([
      { id: "run", type: "command", label: "Workspace B" },
    ]);

    result.current.action.onExecute({
      id: "run",
      type: "command",
      label: "Workspace B",
    });
    expect(executeA).not.toHaveBeenCalled();
    expect(executeB).toHaveBeenCalledOnce();
  });

  it("matches the displayed label for a command with no explicit label", () => {
    const { result } = renderHook(() =>
      unstable_useSlashCommandAdapter({
        commands: [{ id: "summarize", execute: vi.fn() }],
      }),
    );

    expect(result.current.adapter.search?.("/")).toEqual([
      { id: "summarize", type: "command", label: "/summarize" },
    ]);
    expect(result.current.adapter.search?.("sum")).toEqual([
      { id: "summarize", type: "command", label: "/summarize" },
    ]);
    expect(result.current.adapter.search?.("nope")).toEqual([]);
  });

  it("keeps the adapter stable for equivalent inline commands", () => {
    const executeA = vi.fn();
    const executeB = vi.fn();
    const { result, rerender } = renderHook(
      ({ execute }) =>
        unstable_useSlashCommandAdapter({
          commands: [{ id: "run", label: "Run", execute }],
        }),
      { initialProps: { execute: executeA } },
    );
    const initialAdapter = result.current.adapter;

    rerender({ execute: executeB });

    expect(result.current.adapter).toBe(initialAdapter);
    act(() =>
      result.current.action.onExecute(result.current.adapter.search!("")[0]!),
    );
    expect(executeA).not.toHaveBeenCalled();
    expect(executeB).toHaveBeenCalledOnce();
  });
});
