// @vitest-environment jsdom

import { Suspense, type ReactNode } from "react";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Unstable_TriggerItem } from "@assistant-ui/core";
import type { TriggerBehavior } from "./triggerSelectionResource";

const mocks = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock("./TriggerPopover", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./TriggerPopover")>()),
  useTriggerBehaviorRegistration: () => ({ register: mocks.register }),
}));

import { ComposerPrimitiveTriggerPopoverAction } from "./TriggerPopoverAction";
import { ComposerPrimitiveTriggerPopoverDirective } from "./TriggerPopoverDirective";

const item: Unstable_TriggerItem = {
  id: "item-1",
  type: "test",
  label: "Item",
};

const verifyCommittedCallback = async (
  renderBehavior: (callback: (item: Unstable_TriggerItem) => void) => ReactNode,
  invoke: (behavior: TriggerBehavior) => void,
) => {
  let behavior: TriggerBehavior | undefined;
  mocks.register.mockImplementation((next: TriggerBehavior) => {
    behavior = next;
    return () => {};
  });

  let suspend = false;
  const suspended = new Promise<never>(() => {});
  const renderProbe = vi.fn();
  const Suspender = () => {
    if (suspend) throw suspended;
    return null;
  };
  const Probe = () => {
    renderProbe();
    return null;
  };
  const View = ({
    callback,
  }: {
    callback: (item: Unstable_TriggerItem) => void;
  }) => (
    <Suspense fallback={null}>
      {renderBehavior(callback)}
      <Probe />
      <Suspender />
    </Suspense>
  );

  const committed = vi.fn();
  const abandoned = vi.fn();
  const view = render(<View callback={committed} />);

  await waitFor(() => expect(behavior).toBeDefined());
  renderProbe.mockClear();

  suspend = true;
  view.rerender(<View callback={abandoned} />);
  await waitFor(() => expect(renderProbe).toHaveBeenCalled());

  invoke(behavior!);
  expect(committed).toHaveBeenCalledExactlyOnceWith(item);
  expect(abandoned).not.toHaveBeenCalled();

  suspend = false;
  view.rerender(<View callback={abandoned} />);
  invoke(behavior!);
  expect(abandoned).toHaveBeenCalledExactlyOnceWith(item);
};

describe("TriggerPopover behavior callbacks", () => {
  beforeEach(() => {
    mocks.register.mockReset();
  });

  it("keeps the committed action callback during abandoned renders", async () => {
    await verifyCommittedCallback(
      (onExecute) => (
        <ComposerPrimitiveTriggerPopoverAction onExecute={onExecute} />
      ),
      (behavior) => {
        if (behavior.kind !== "action") throw new Error("Expected action");
        behavior.onExecute(item);
      },
    );
  });

  it("keeps the committed directive callback during abandoned renders", async () => {
    await verifyCommittedCallback(
      (onInserted) => (
        <ComposerPrimitiveTriggerPopoverDirective onInserted={onInserted} />
      ),
      (behavior) => {
        if (behavior.kind !== "directive") {
          throw new Error("Expected directive");
        }
        behavior.onInserted?.(item);
      },
    );
  });
});
