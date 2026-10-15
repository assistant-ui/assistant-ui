// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssistantRuntimeProvider } from "../../context";
import { useLocalRuntime } from "../../legacy-runtime/runtime-cores/local/useLocalRuntime";
import { ThreadPrimitiveRoot } from "../thread/ThreadRoot";
import { ComposerPrimitiveInput } from "./ComposerInput";

const adapter = { async *run() {} };

type Runtime = ReturnType<typeof useLocalRuntime>;

const setup = () => {
  let runtime: Runtime | null = null;
  const App = () => {
    const currentRuntime = useLocalRuntime(adapter);
    runtime = currentRuntime;
    return (
      <AssistantRuntimeProvider runtime={currentRuntime}>
        <input aria-label="Outside thread" />
        <ThreadPrimitiveRoot>
          <button type="button">Inside thread</button>
          <ComposerPrimitiveInput aria-label="Composer" autoFocus />
          <ThreadPrimitiveRoot>
            <button type="button">Nested thread</button>
          </ThreadPrimitiveRoot>
        </ThreadPrimitiveRoot>
      </AssistantRuntimeProvider>
    );
  };

  render(<App />);
  const composer = screen.getByRole("textbox", {
    name: "Composer",
  }) as HTMLTextAreaElement;
  const startRun = async () => {
    await act(async () => {
      await runtime!.thread.append("Programmatic message");
    });
  };
  return { composer, startRun };
};

describe("ComposerPrimitiveInput run-start focus", () => {
  it("keeps focus in an input outside the thread", async () => {
    const { startRun } = setup();
    const outside = screen.getByRole("textbox", { name: "Outside thread" });
    act(() => outside.focus());

    await startRun();

    expect(document.activeElement).toBe(outside);
  });

  it("focuses the composer when nothing is focused", async () => {
    const { composer, startRun } = setup();
    act(() => composer.blur());
    expect(document.activeElement).toBe(document.body);

    await startRun();

    expect(document.activeElement).toBe(composer);
  });

  it("focuses the composer when another element in its thread is focused", async () => {
    const { composer, startRun } = setup();
    const inside = screen.getByRole("button", { name: "Inside thread" });
    act(() => inside.focus());

    await startRun();

    expect(document.activeElement).toBe(composer);
  });

  it("keeps focus inside a nested thread root", async () => {
    const { startRun } = setup();
    const nested = screen.getByRole("button", { name: "Nested thread" });
    act(() => nested.focus());

    await startRun();

    expect(document.activeElement).toBe(nested);
  });

  it("preserves the focused composer's selection", async () => {
    const { composer, startRun } = setup();
    fireEvent.change(composer, { target: { value: "hello world" } });
    act(() => {
      composer.focus();
      composer.setSelectionRange(2, 5);
    });

    await startRun();

    expect(document.activeElement).toBe(composer);
    expect(composer.selectionStart).toBe(2);
    expect(composer.selectionEnd).toBe(5);
  });
});
