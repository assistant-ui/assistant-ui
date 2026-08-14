import { describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import { provideAui } from "../provideAui";
import {
  composerCancel,
  composerInput,
  composerSend,
} from "../primitives/composer";
import Host from "./fixtures/Host.svelte";
import { createEchoRuntime, flushEvents, type AnyClient } from "./clients";

const target = () => document.createElement("div");

const mountEcho = (
  setup: (tools: { aui: AnyClient }) => void,
  echo = createEchoRuntime(),
) => {
  const app = mount(Host, {
    target: target(),
    props: {
      setup: () => {
        const aui = provideAui(
          AuiConfig({ threads: RuntimeAdapter(echo.runtime) }),
        ) as AnyClient;
        setup({ aui });
      },
    },
  });
  return { app, echo };
};

describe("composer builders", () => {
  it("send flips disabled with the draft and routes clicks to the adapter", async () => {
    let aui!: AnyClient;
    let send!: ReturnType<typeof composerSend>;
    const { app, echo } = mountEcho((tools) => {
      aui = tools.aui;
      send = composerSend();
    });

    expect(send.props.type).toBe("button");
    expect(send.props.disabled).toBe(true);

    flushTapSync(() => aui.composer.setText("hello"));
    expect(send.props.disabled).toBe(false);

    send.props.onclick();
    await flushEvents();
    expect(echo.onNew).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(aui.composer.getState().text).toBe(""));

    flushSync(() => void unmount(app));
  });

  it("send onclick is inert while disabled", () => {
    let send!: ReturnType<typeof composerSend>;
    const { app, echo } = mountEcho(() => {
      send = composerSend();
    });

    send.props.onclick();
    expect(echo.onNew).not.toHaveBeenCalled();

    flushSync(() => void unmount(app));
  });

  it("input binds the draft and submits on Enter with newline fallthrough", async () => {
    let aui!: AnyClient;
    let input!: ReturnType<typeof composerInput>;
    const { app, echo } = mountEcho((tools) => {
      aui = tools.aui;
      input = composerInput();
    });

    const textarea = document.createElement("textarea");
    textarea.value = "draft";
    input.props.oninput({ target: textarea } as unknown as Event);
    expect(input.props.value).toBe("draft");
    expect(aui.composer.getState().text).toBe("draft");

    const enter = (init: KeyboardEventInit) => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        cancelable: true,
        ...init,
      });
      input.props.onkeydown(event);
      return event;
    };

    expect(enter({ shiftKey: true }).defaultPrevented).toBe(false);
    expect(echo.onNew).not.toHaveBeenCalled();

    expect(enter({}).defaultPrevented).toBe(true);
    await flushEvents();
    expect(echo.onNew).toHaveBeenCalledTimes(1);

    // The draft is now empty, so Enter cannot send and falls through
    expect(enter({}).defaultPrevented).toBe(false);
    expect(echo.onNew).toHaveBeenCalledTimes(1);

    flushSync(() => void unmount(app));
  });

  it("cancel routes to the adapter during a run", async () => {
    let cancel!: ReturnType<typeof composerCancel>;
    const { app, echo } = mountEcho(() => {
      cancel = composerCancel();
    });

    flushTapSync(() => echo.setRunning(true));
    await vi.waitFor(() => expect(cancel.props.disabled).toBe(false));

    cancel.props.onclick();
    await flushEvents();
    expect(echo.onCancel).toHaveBeenCalledTimes(1);

    flushSync(() => void unmount(app));
  });
});
