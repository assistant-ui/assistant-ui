/**
 * @vitest-environment jsdom
 */
import { act, type FC } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ComposerPrimitiveTriggerPopoverRoot,
  type TriggerPopoverActiveAria,
  useTriggerPopoverActiveAriaOptional,
  useTriggerPopoverAriaPublish,
} from "./TriggerPopoverRootContext";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

type PublishHandle = ReturnType<typeof useTriggerPopoverAriaPublish>;

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
    const publishRef = { current: null as PublishHandle | null };
    const ariaRef = { current: null as TriggerPopoverActiveAria | null };

    const Probe: FC = () => {
      publishRef.current = useTriggerPopoverAriaPublish();
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
      publish: () => publishRef.current as PublishHandle,
      aria: () => ariaRef.current,
    };
  };

  it("returns null initially inside a root", async () => {
    const { aria } = await renderWithRoot();
    expect(aria()).toBeNull();
  });

  it("publishes a descriptor and surfaces it via the hook", async () => {
    const { publish, aria } = await renderWithRoot();

    await act(async () => {
      publish().setActiveAria("@", {
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
    const { publish, aria } = await renderWithRoot();

    await act(async () => {
      publish().setActiveAria("@", {
        popoverId: "popover-mention",
        highlightedItemId: undefined,
      });
    });
    expect(aria()).not.toBeNull();

    await act(async () => {
      publish().setActiveAria("@", null);
    });
    expect(aria()).toBeNull();
  });

  it("ignores a clear call from a non-owning char", async () => {
    const { publish, aria } = await renderWithRoot();

    await act(async () => {
      publish().setActiveAria("@", {
        popoverId: "popover-mention",
        highlightedItemId: undefined,
      });
    });

    await act(async () => {
      publish().setActiveAria("/", null);
    });

    expect(aria()).toEqual({
      popoverId: "popover-mention",
      highlightedItemId: undefined,
    });
  });

  it("replaces the descriptor when a different char takes over", async () => {
    const { publish, aria } = await renderWithRoot();

    await act(async () => {
      publish().setActiveAria("@", {
        popoverId: "popover-mention",
        highlightedItemId: "popover-mention-option-a",
      });
    });
    await act(async () => {
      publish().setActiveAria("/", {
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
