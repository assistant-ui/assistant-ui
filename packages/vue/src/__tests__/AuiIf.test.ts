import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, type Component } from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { AuiProvider } from "../AuiProvider";
import { AuiIf } from "../AuiIf";
import { useAui } from "../useAui";
import { ThreadClient, type AnyClient } from "./fixtures";

const mountApp = (root: Component) => {
  const app = createApp(root);
  const el = document.createElement("div");
  app.mount(el);
  return { el, unmount: () => app.unmount() };
};

describe("AuiIf", () => {
  it("renders the slot only while the condition selects true", async () => {
    let aui!: AnyClient;
    const Probe = defineComponent({
      setup() {
        aui = useAui() as AnyClient;
        return () =>
          h(
            AuiIf,
            { condition: (s) => (s as AnyClient).thread.selected === 1 },
            { default: () => h("span", { id: "flag" }, "visible") },
          );
      },
    });
    const { el, unmount } = mountApp(
      defineComponent({
        setup: () => () =>
          h(
            AuiProvider,
            { config: AuiConfig({ thread: ThreadClient() } as never) },
            { default: () => h(Probe) },
          ),
      }),
    );

    expect(el.querySelector("#flag")).toBeNull();

    flushTapSync(() => aui.thread.setSelected(1));
    await nextTick();
    expect(el.querySelector("#flag")?.textContent).toBe("visible");

    flushTapSync(() => aui.thread.setSelected(0));
    await nextTick();
    expect(el.querySelector("#flag")).toBeNull();

    unmount();
  });
});
