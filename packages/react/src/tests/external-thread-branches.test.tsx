// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { FC } from "react";
import { describe, it, expect, vi } from "vitest";
import { useAui, AuiProvider } from "@assistant-ui/store";
import type {
  ExternalThreadBranchAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import {
  ExternalThread,
  type ExternalThreadProps,
} from "../client/ExternalThread";

const message = (id: string, role: "user" | "assistant"): ThreadMessage =>
  ({
    id,
    role,
    content: [{ type: "text", text: `text of ${id}` }],
    createdAt: new Date(1718000000000),
    ...(role === "assistant"
      ? { status: { type: "complete", reason: "stop" } }
      : { attachments: [] }),
    metadata: { custom: {} },
  }) as ThreadMessage;

const renderThread = (props: ExternalThreadProps) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC<{ threadProps: ExternalThreadProps }> = ({ threadProps }) => {
    const aui = useAui({ thread: ExternalThread(threadProps) });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };
  const utils = render(<App threadProps={props} />);
  return {
    aui: () => captured.aui!,
    rerender: (next: ExternalThreadProps) =>
      utils.rerender(<App threadProps={next} />),
  };
};

const baseProps = (
  branches?: ExternalThreadBranchAdapter,
): ExternalThreadProps => ({
  messages: [message("u1", "user"), message("a2", "assistant")],
  isRunning: false,
  ...(branches ? { branches } : {}),
});

const adapterFor = (
  ids: readonly string[],
  switchToBranch = vi.fn(),
): ExternalThreadBranchAdapter => ({
  getBranches: (messageId) => (ids.includes(messageId) ? ids : []),
  switchToBranch,
});

describe("ExternalThread branches", () => {
  it("defaults to single-branch state without an adapter", () => {
    const { aui } = renderThread(baseProps());
    const state = aui().thread().getState();
    expect(state.messages[1]!.branchNumber).toBe(1);
    expect(state.messages[1]!.branchCount).toBe(1);
    expect(state.capabilities.switchToBranch).toBe(false);
    expect(() =>
      aui().thread().message({ index: 1 }).switchToBranch({ position: "next" }),
    ).not.toThrow();
  });

  it("derives branchNumber and branchCount from the adapter", () => {
    const { aui } = renderThread(baseProps(adapterFor(["a1", "a2", "a3"])));
    const state = aui().thread().getState();
    expect(state.messages[1]!.branchNumber).toBe(2);
    expect(state.messages[1]!.branchCount).toBe(3);
    expect(state.capabilities.switchToBranch).toBe(true);
  });

  it("resolves previous and next to sibling ids and no-ops at the edges", () => {
    const switchToBranch = vi.fn();
    const { aui } = renderThread(
      baseProps(adapterFor(["a1", "a2", "a3"], switchToBranch)),
    );
    const msg = () => aui().thread().message({ index: 1 });

    msg().switchToBranch({ position: "previous" });
    expect(switchToBranch).toHaveBeenLastCalledWith("a1");
    msg().switchToBranch({ position: "next" });
    expect(switchToBranch).toHaveBeenLastCalledWith("a3");

    switchToBranch.mockClear();
    const edge = renderThread({
      messages: [message("u1", "user"), message("a1", "assistant")],
      isRunning: false,
      branches: adapterFor(["a1", "a2"], switchToBranch),
    });
    edge.aui().thread().message({ index: 1 }).switchToBranch({
      position: "previous",
    });
    expect(switchToBranch).not.toHaveBeenCalled();
  });

  it("forwards an explicit branchId unvalidated but ignores self-switches", () => {
    const switchToBranch = vi.fn();
    const { aui } = renderThread(
      baseProps(adapterFor(["a1", "a2"], switchToBranch)),
    );
    const msg = () => aui().thread().message({ index: 1 });

    msg().switchToBranch({ branchId: "not-in-the-list" });
    expect(switchToBranch).toHaveBeenLastCalledWith("not-in-the-list");

    switchToBranch.mockClear();
    msg().switchToBranch({ branchId: "a2" });
    expect(switchToBranch).not.toHaveBeenCalled();
  });

  it("falls back to single-branch state when getBranches omits the own id", () => {
    const switchToBranch = vi.fn();
    const { aui } = renderThread(
      baseProps({
        getBranches: () => ["b1", "b2"],
        switchToBranch,
      }),
    );
    const state = aui().thread().getState();
    expect(state.messages[1]!.branchNumber).toBe(1);
    expect(state.messages[1]!.branchCount).toBe(1);

    aui().thread().message({ index: 1 }).switchToBranch({ position: "next" });
    expect(switchToBranch).not.toHaveBeenCalled();
  });

  it("keeps message state identity across adapter recreation with equal values", () => {
    const messages = [message("u1", "user"), message("a2", "assistant")];
    const { aui, rerender } = renderThread({
      messages,
      isRunning: false,
      branches: adapterFor(["a1", "a2", "a3"]),
    });
    const before = aui().thread().getState().messages[1];

    rerender({
      messages,
      isRunning: false,
      branches: adapterFor(["a1", "a2", "a3"]),
    });
    const after = aui().thread().getState().messages[1];

    expect(after!.branchNumber).toBe(2);
    expect(before!.parts[0]).toBe(after!.parts[0]);
  });
});
