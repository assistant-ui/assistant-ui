import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { AuiConfig } from "@assistant-ui/store/client";
import { flushTapSync } from "@assistant-ui/tap";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import {
  AssistantRuntimeImpl,
  LocalRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAuiState } from "../useAuiState";
import { ThreadPrimitiveMessages } from "../primitives/ThreadPrimitiveMessages";
import { MessagePrimitiveParts } from "../primitives/MessagePrimitiveParts";
import {
  ActionBarPrimitiveEdit,
  ActionBarPrimitiveReload,
} from "../primitives/actionBar";
import { ComposerPrimitiveInput } from "../primitives/ComposerPrimitiveInput";
import { ComposerPrimitiveSend } from "../primitives/ComposerPrimitiveSend";

const Part = defineComponent({
  setup() {
    const text = useAuiState((s) =>
      s.part.type === "text" ? s.part.text : "",
    );
    return () => h("span", text.value);
  },
});

const ReloadMessage = defineComponent({
  setup() {
    return () =>
      h("div", [
        h(MessagePrimitiveParts, null, {
          default: () => h(Part),
        }),
        h(ActionBarPrimitiveReload),
      ]);
  },
});

const EditableMessage = defineComponent({
  setup() {
    const role = useAuiState((s) => s.message.role);
    return () =>
      h("div", { class: `message-${role.value}` }, [
        h(MessagePrimitiveParts, null, {
          default: () => h(Part),
        }),
        h(ActionBarPrimitiveEdit, { class: "edit" }),
        h(ComposerPrimitiveInput, { class: "editor" }),
        h(ComposerPrimitiveSend, { class: "send" }),
      ]);
  },
});

const createRuntime = () => {
  const core = new LocalRuntimeCore(
    {
      adapters: {
        chatModel: {
          async run({ messages }) {
            await new Promise((resolve) => setTimeout(resolve, 20));
            const text = messages
              .at(-1)
              ?.content.filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("");
            return {
              content: [{ type: "text", text: `Echo: ${text} (again)` }],
            };
          },
        },
      },
    },
    [
      {
        id: "u1",
        role: "user",
        content: [{ type: "text", text: "hello" }],
        createdAt: new Date(),
      },
      {
        id: "a1",
        role: "assistant",
        content: [{ type: "text", text: "Echo: hello" }],
        status: { type: "complete", reason: "unknown" },
        createdAt: new Date(),
      },
    ],
  );
  return new AssistantRuntimeImpl(core);
};

const mountChat = (
  runtime: AssistantRuntimeImpl,
  MessageView = ReloadMessage,
) => {
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
          {
            default: () =>
              h(ThreadPrimitiveMessages, null, {
                default: () => h(MessageView),
              }),
          },
        ),
    }),
  );
  const el = document.createElement("div");
  app.mount(el);
  return { app, el };
};

afterEach(() => vi.restoreAllMocks());

describe("PartByIndexProvider", () => {
  it("does not log when reload temporarily replaces a message with empty parts", async () => {
    const runtime = createRuntime();
    const { app, el } = mountChat(runtime);
    await nextTick();

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    el.querySelectorAll("button")[1]!.click();

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.textContent).toContain("Echo: hello (again)");
    });
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(
      consoleError.mock.calls.some((call) =>
        call.some((value) =>
          String(value).includes("useClientLookup: index 0 out of bounds"),
        ),
      ),
    ).toBe(false);
    app.unmount();
  });

  it("does not log when edit-save temporarily replaces a message with empty parts", async () => {
    const runtime = createRuntime();
    const { app, el } = mountChat(runtime, EditableMessage);
    await nextTick();

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const user = el.querySelector<HTMLElement>(".message-user")!;
    user.querySelector<HTMLButtonElement>("button.edit")!.click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(
        user.querySelector<HTMLTextAreaElement>("textarea.editor")!.value,
      ).toBe("hello");
    });

    const editor = user.querySelector<HTMLTextAreaElement>("textarea.editor")!;
    editor.value = "goodbye";
    flushTapSync(() => editor.dispatchEvent(new Event("input")));
    user.querySelector<HTMLButtonElement>("button.send")!.click();

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.textContent).toContain("Echo: goodbye (again)");
    });
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(
      consoleError.mock.calls.some((call) =>
        call.some((value) =>
          String(value).includes("useClientLookup: index 0 out of bounds"),
        ),
      ),
    ).toBe(false);
    app.unmount();
  });
});
