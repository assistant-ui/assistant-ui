/**
 * @vitest-environment jsdom
 */
import { act, type FC } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ComposerPrimitiveTriggerPopoverRoot,
  type TriggerPopoverActiveAria,
  type TriggerPopoverRootContextValue,
  useTriggerPopoverActiveAriaOptional,
  useTriggerPopoverRootContext,
} from "./TriggerPopoverRootContext";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("TriggerPopoverRootContext active ARIA", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const renderWithRoot = async () => {
    const ctxRef = { current: null as TriggerPopoverRootContextValue | null };
    const ariaRef = { current: null as TriggerPopoverActiveAria | null };

    const Probe: FC = () => {
      ctxRef.current = useTriggerPopoverRootContext();
      ariaRef.current = useTriggerPopoverActiveAriaOptional();
      return null;
    };

    await act(async () => {
      root.render(
        <ComposerPrimitiveTriggerPopoverRoot>
          <Probe />
        </ComposerPrimitiveTriggerPopoverRoot>,
      );
    });

    return {
      ctx: () => ctxRef.current as TriggerPopoverRootContextValue,
      aria: () => ariaRef.current,
    };
  };

  it("returns null initially inside a root", async () => {
    const { aria } = await renderWithRoot();
    expect(aria()).toBeNull();
  });

  it("publishes a descriptor and surfaces it via the hook", async () => {
    const { ctx, aria } = await renderWithRoot();

    await act(async () => {
      ctx().setActiveAria("@", {
        popoverId: "popover-mention",
        highlightedItemId: "popover-mention-option-a",
      });
    });

    expect(aria()).toEqual({
      popoverId: "popover-mention",
      highlightedItemId: "popover-mention-option-a",
    });
  });

  it("clears the descriptor when the owning char releases it", async () => {
    const { ctx, aria } = await renderWithRoot();

    await act(async () => {
      ctx().setActiveAria("@", {
        popoverId: "popover-mention",
        highlightedItemId: undefined,
      });
    });
    expect(aria()).not.toBeNull();

    await act(async () => {
      ctx().setActiveAria("@", null);
    });
    expect(aria()).toBeNull();
  });

  it("ignores a clear call from a non-owning char", async () => {
    const { ctx, aria } = await renderWithRoot();

    await act(async () => {
      ctx().setActiveAria("@", {
        popoverId: "popover-mention",
        highlightedItemId: undefined,
      });
    });

    await act(async () => {
      ctx().setActiveAria("/", null);
    });

    expect(aria()).toEqual({
      popoverId: "popover-mention",
      highlightedItemId: undefined,
    });
  });

  it("replaces the descriptor when a different char takes over", async () => {
    const { ctx, aria } = await renderWithRoot();

    await act(async () => {
      ctx().setActiveAria("@", {
        popoverId: "popover-mention",
        highlightedItemId: "popover-mention-option-a",
      });
    });
    await act(async () => {
      ctx().setActiveAria("/", {
        popoverId: "popover-slash",
        highlightedItemId: "popover-slash-option-x",
      });
    });

    expect(aria()).toEqual({
      popoverId: "popover-slash",
      highlightedItemId: "popover-slash-option-x",
    });
  });

  it("returns null when the consumer is rendered outside a root", async () => {
    const ariaRef = { current: null as TriggerPopoverActiveAria | null };
    const Solo: FC = () => {
      ariaRef.current = useTriggerPopoverActiveAriaOptional();
      return null;
    };

    await act(async () => {
      root.render(<Solo />);
    });

    expect(ariaRef.current).toBeNull();
  });
});
