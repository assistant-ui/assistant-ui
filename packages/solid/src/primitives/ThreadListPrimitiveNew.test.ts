import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent } from "solid-js";
import { render } from "solid-js/web";
import { useState } from "react";
import { resource } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { AuiProvider } from "../AuiProvider";
import { ThreadListPrimitiveNew } from "./ThreadListPrimitiveNew";

const createThreads = () => {
  const switchToNewThread = vi.fn();
  const useThreads = () => {
    const [mainThreadId, setMainThreadId] = useState("t1");
    return {
      getState: () => ({ newThreadId: "t2", mainThreadId }),
      switchToNewThread: () => {
        switchToNewThread();
        setMainThreadId("t2");
      },
    };
  };
  return { Threads: resource(useThreads), switchToNewThread };
};

const mountNew = (props: Parameters<typeof ThreadListPrimitiveNew>[0] = {}) => {
  const { Threads, switchToNewThread } = createThreads();
  const container = document.createElement("div");
  // Solid delegates click to the document, so the tree must be attached
  document.body.append(container);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: Threads() } as never),
        get children() {
          return createComponent(ThreadListPrimitiveNew, {
            ...props,
            children: "New thread",
          });
        },
      }),
    container,
  );
  return {
    button: container.querySelector("button")!,
    switchToNewThread,
    unmount: () => {
      dispose();
      container.remove();
    },
  };
};

describe("ThreadListPrimitiveNew", () => {
  let unmount = () => {};
  afterEach(() => unmount());

  it("renders a button that switches to a new thread", async () => {
    const view = mountNew({ class: "new" });
    unmount = view.unmount;

    expect(view.button.type).toBe("button");
    expect(view.button.className).toBe("new");
    expect(view.button.textContent).toBe("New thread");

    view.button.click();
    await vi.waitFor(() =>
      expect(view.switchToNewThread).toHaveBeenCalledTimes(1),
    );
  });

  it("runs the caller's handler first and lets it veto the switch", () => {
    const onClick = vi.fn((event: MouseEvent) => event.preventDefault());
    const view = mountNew({ onClick });
    unmount = view.unmount;

    view.button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(view.switchToNewThread).not.toHaveBeenCalled();
  });

  it("supports a bound handler tuple", () => {
    const onClick = vi.fn();
    const view = mountNew({ onClick: [onClick, "data"] });
    unmount = view.unmount;

    view.button.click();
    expect(onClick).toHaveBeenCalledWith("data", expect.any(MouseEvent));
  });

  it("does nothing while disabled", () => {
    const view = mountNew({ disabled: true });
    unmount = view.unmount;

    expect(view.button.disabled).toBe(true);
    view.button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(view.switchToNewThread).not.toHaveBeenCalled();
  });

  it("marks itself active while the new thread is the main one", async () => {
    const view = mountNew();
    unmount = view.unmount;

    expect(view.button.hasAttribute("data-active")).toBe(false);
    view.button.click();
    await vi.waitFor(() => {
      expect(view.button.getAttribute("data-active")).toBe("true");
      expect(view.button.getAttribute("aria-current")).toBe("true");
    });
  });
});
