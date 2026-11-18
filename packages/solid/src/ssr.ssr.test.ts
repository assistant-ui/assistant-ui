import { describe, expect, it, onTestFinished, vi } from "vitest";
import { createComponent, type JSX } from "solid-js";
import { isServer, renderToStream, renderToString } from "solid-js/web";
import {
  AuiConfig,
  type AssistantClientHandle,
} from "@assistant-ui/store/client";
import { ChainOfThoughtClient, RuntimeAdapter } from "@assistant-ui/core/store";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import * as Solid from "./index";
import { useAuiContext } from "./context";
import { TrackedSuggestions } from "./testUtils";

const createLifecycle = () => ({
  effects: 0,
  insertionEffects: 0,
  signals: new Set<AbortSignal>(),
  destroys: new Map<AssistantClientHandle, ReturnType<typeof vi.spyOn>>(),
});
type Lifecycle = ReturnType<typeof createLifecycle>;

const ObserveScope = ({ lifecycle }: { lifecycle: Lifecycle }) => {
  const source = useAuiContext().source as AssistantClientHandle;
  if (!lifecycle.destroys.has(source)) {
    const destroy = vi.spyOn(source, "destroy");
    lifecycle.destroys.set(source, destroy);
    onTestFinished(() => destroy.mockRestore());
  }
  return null;
};

const InitialTitle = (): JSX.Element =>
  Solid.useAuiState(
    (s) => s.suggestions.suggestions[0]!.title,
  ) as unknown as JSX.Element;

const createRuntime = (empty = false) => {
  const onNew = vi.fn(async () => {});
  const onSwitchToThread = vi.fn();
  const runtime = new AssistantRuntimeImpl(
    new ExternalStoreRuntimeCore({
      messages: empty
        ? []
        : [
            {
              id: "user",
              role: "user",
              content: "Initial question <script>",
              attachments: [
                {
                  id: "attachment",
                  type: "file",
                  name: "notes.md",
                  content: [],
                  status: { type: "complete" },
                },
              ],
            },
            {
              id: "assistant",
              role: "assistant",
              content: [
                { type: "reasoning", text: "Initial reasoning" },
                { type: "text", text: "Initial answer" },
              ],
              status: {
                type: "incomplete",
                reason: "error",
                error: "Initial error",
              },
            },
          ],
      convertMessage: (message: ThreadMessageLike) => message,
      onNew,
      onEdit: async () => {},
      adapters: {
        threadList: {
          threadId: "first",
          threads: empty
            ? []
            : [
                { id: "first", status: "regular", title: "First thread" },
                { id: "second", status: "regular", title: "Second thread" },
              ],
          archivedThreads: empty
            ? []
            : [
                {
                  id: "archived",
                  status: "archived",
                  title: "Archived thread",
                },
              ],
          onSwitchToThread,
        },
      },
    }),
  );
  return { runtime, onNew, onSwitchToThread };
};

const renderTree = (config: AuiConfig, lifecycle: Lifecycle) => {
  const Attachment = () => {
    createComponent(ObserveScope, { lifecycle });
    return createComponent(Solid.AttachmentPrimitiveRoot, {
      get children() {
        return [
          createComponent(Solid.AttachmentPrimitiveName, {}),
          createComponent(Solid.AttachmentPrimitiveThumb, {}),
          createComponent(Solid.AttachmentPrimitiveRemove, {
            children: "Remove",
          }),
        ];
      },
    });
  };
  const Reasoning = () => {
    createComponent(ObserveScope, { lifecycle });
    const aui = Solid.useAui();
    const parts = Solid.useAuiState((s) =>
      s.part.type === "reasoning" ? [s.part] : [],
    );
    return createComponent(Solid.AuiProvider, {
      config: AuiConfig({
        chainOfThought: ChainOfThoughtClient({
          parts: parts(),
          getMessagePart: () => aui.part,
        }),
      }),
      extends: aui,
      get children() {
        createComponent(ObserveScope, { lifecycle });
        return [
          createComponent(Solid.ChainOfThoughtPrimitiveAccordionTrigger, {
            children: "Reasoning",
          }),
          createComponent(Solid.ChainOfThoughtPrimitiveParts, {
            children: (part) => {
              createComponent(ObserveScope, { lifecycle });
              const value = part();
              return value.type === "reasoning" ? value.text : "";
            },
          }),
        ];
      },
    });
  };
  const Message = () => {
    createComponent(ObserveScope, { lifecycle });
    return createComponent(Solid.MessagePrimitiveRoot, {
      get children() {
        return [
          createComponent(Solid.MessagePrimitiveParts, {
            components: { reasoning: Reasoning },
          }),
          createComponent(Solid.MessagePrimitiveAttachments, {
            get children() {
              return createComponent(Attachment, {});
            },
          }),
          createComponent(Solid.ActionBarPrimitiveEdit, { children: "Edit" }),
          createComponent(Solid.ActionBarPrimitiveReload, {
            children: "Reload",
          }),
          createComponent(Solid.ActionBarPrimitiveCopy, { children: "Copy" }),
          createComponent(Solid.BranchPickerPrimitivePrevious, {
            children: "Previous",
          }),
          createComponent(Solid.BranchPickerPrimitiveNumber, {}),
          "/",
          createComponent(Solid.BranchPickerPrimitiveCount, {}),
          createComponent(Solid.BranchPickerPrimitiveNext, {
            children: "Next",
          }),
          createComponent(Solid.ErrorPrimitiveRoot, {
            get children() {
              return createComponent(Solid.ErrorPrimitiveMessage, {});
            },
          }),
        ];
      },
    });
  };
  const ThreadListItem = () => {
    createComponent(ObserveScope, { lifecycle });
    return createComponent(Solid.ThreadListItemPrimitiveRoot, {
      get children() {
        return [
          createComponent(Solid.ThreadListItemPrimitiveTrigger, {
            get children() {
              return createComponent(Solid.ThreadListItemPrimitiveTitle, {});
            },
          }),
          createComponent(Solid.ThreadListItemPrimitiveArchive, {
            children: "Archive",
          }),
          createComponent(Solid.ThreadListItemPrimitiveUnarchive, {
            children: "Unarchive",
          }),
          createComponent(Solid.ThreadListItemPrimitiveDelete, {
            children: "Delete",
          }),
        ];
      },
    });
  };

  return renderToString(() =>
    createComponent(Solid.AuiProvider, {
      config,
      get children() {
        createComponent(ObserveScope, { lifecycle });
        return [
          createComponent(Solid.ThreadPrimitiveRoot, {
            get children() {
              return createComponent(Solid.ThreadPrimitiveViewport, {
                get children() {
                  return [
                    createComponent(Solid.ThreadPrimitiveMessages, {
                      get children() {
                        return createComponent(Message, {});
                      },
                    }),
                    createComponent(Solid.ThreadPrimitiveScrollToBottom, {
                      children: "Latest",
                    }),
                    createComponent(Solid.ThreadPrimitiveViewportFooter, {
                      get children() {
                        return [
                          createComponent(Solid.ComposerPrimitiveInput, {}),
                          createComponent(Solid.ComposerPrimitiveSend, {
                            children: "Send",
                          }),
                          createComponent(Solid.ComposerPrimitiveCancel, {
                            children: "Cancel",
                          }),
                          createComponent(
                            Solid.ComposerPrimitiveAddAttachment,
                            { children: "Attach" },
                          ),
                          createComponent(
                            Solid.ComposerPrimitiveAttachmentDropzone,
                            {
                              get children() {
                                return createComponent(
                                  Solid.ComposerPrimitiveAttachments,
                                  {
                                    get children() {
                                      return createComponent(Attachment, {});
                                    },
                                  },
                                );
                              },
                            },
                          ),
                        ];
                      },
                    }),
                  ];
                },
              });
            },
          }),
          createComponent(Solid.ThreadPrimitiveSuggestions, {
            get children() {
              createComponent(ObserveScope, { lifecycle });
              return createComponent(Solid.SuggestionPrimitiveTrigger, {
                get children() {
                  return [
                    createComponent(Solid.SuggestionPrimitiveTitle, {}),
                    createComponent(Solid.SuggestionPrimitiveDescription, {}),
                  ];
                },
              });
            },
          }),
          createComponent(Solid.ThreadListPrimitiveRoot, {
            get children() {
              return [
                createComponent(Solid.ThreadListPrimitiveNew, {
                  children: "New thread",
                }),
                createComponent(Solid.ThreadListPrimitiveLoadMore, {
                  children: "Load more",
                }),
                ...[false, true].map((archived) =>
                  createComponent(Solid.ThreadListPrimitiveItems, {
                    archived,
                    get children() {
                      return createComponent(ThreadListItem, {});
                    },
                  }),
                ),
              ];
            },
          }),
        ];
      },
    }),
  );
};

const expectDisposed = async (lifecycle: Lifecycle) => {
  for (const signal of lifecycle.signals) expect(signal.aborted).toBe(false);
  for (const destroy of lifecycle.destroys.values())
    expect(destroy).not.toHaveBeenCalled();
  await new Promise((resolve) => setTimeout(resolve));
  for (const signal of lifecycle.signals) expect(signal.aborted).toBe(true);
  for (const destroy of lifecycle.destroys.values())
    expect(destroy).toHaveBeenCalledOnce();
};

describe("server rendering", () => {
  it.each([false, true])(
    "renders every primitive without a DOM (empty=%s)",
    async (empty) => {
      expect(isServer).toBe(true);
      expect(typeof document).toBe("undefined");
      expect(typeof window).toBe("undefined");
      const { runtime, onNew, onSwitchToThread } = createRuntime(empty);
      if (!empty)
        await runtime.thread.composer.addAttachment({
          name: "draft.txt",
          content: [],
        });
      const lifecycle = createLifecycle();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      onTestFinished(() => error.mockRestore());
      const html = renderTree(
        AuiConfig({
          threads: RuntimeAdapter(runtime),
          suggestions: TrackedSuggestions(lifecycle),
        }),
        lifecycle,
      );
      for (const text of [
        "Send",
        "Cancel",
        "Attach",
        "Latest",
        "New thread",
        "Load more",
        "Say hello",
        "A friendly opener",
      ])
        expect(html).toContain(text);
      for (const text of [
        "Initial question &lt;script>",
        "Initial answer",
        "Initial reasoning",
        "Initial error",
        "notes.md",
        "draft.txt",
        "First thread",
        "Second thread",
        "Archived thread",
      ])
        expect(html.includes(text)).toBe(!empty);
      expect(html).not.toContain("<script>");
      expect(lifecycle.effects).toBe(0);
      expect(lifecycle.insertionEffects).toBe(0);
      expect(lifecycle.signals.size).toBe(1);
      expect(lifecycle.destroys.size).toBe(empty ? 2 : 12);
      await expectDisposed(lifecycle);
      expect(lifecycle.effects).toBe(0);
      expect(lifecycle.insertionEffects).toBe(0);
      expect(onNew).not.toHaveBeenCalled();
      expect(onSwitchToThread).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    },
  );

  it("reads initial state without mounting client effects", async () => {
    const lifecycle = createLifecycle();
    const html = renderToString(() =>
      createComponent(Solid.AuiProvider, {
        config: AuiConfig({ suggestions: TrackedSuggestions(lifecycle) }),
        get children() {
          return createComponent(InitialTitle, {});
        },
      }),
    );
    expect(html).toContain("Say hello");
    expect(lifecycle.effects).toBe(0);
    expect(lifecycle.insertionEffects).toBe(0);
    expect(lifecycle.signals.size).toBe(1);
    await expectDisposed(lifecycle);
  });

  it("does not mount the client through an event subscription", async () => {
    const lifecycle = createLifecycle();
    const callback = vi.fn();
    const Listener = () => {
      Solid.useAuiEvent({ scope: "*", event: "thread.runStart" }, callback);
      return createComponent(InitialTitle, {});
    };
    renderToString(() =>
      createComponent(Solid.AuiProvider, {
        config: AuiConfig({ suggestions: TrackedSuggestions(lifecycle) }),
        get children() {
          return createComponent(Listener, {});
        },
      }),
    );
    expect(lifecycle.effects).toBe(0);
    expect(lifecycle.insertionEffects).toBe(0);
    expect(callback).not.toHaveBeenCalled();
    await expectDisposed(lifecycle);
  });

  it("renders and destroys nested clients and by-index scopes", async () => {
    const lifecycle = createLifecycle();
    const Nested = () =>
      createComponent(Solid.AuiProvider, {
        config: AuiConfig({ suggestions: TrackedSuggestions(lifecycle) }),
        extends: Solid.useAui(),
        get children() {
          createComponent(ObserveScope, { lifecycle });
          return createComponent(Solid.SuggestionByIndexProvider, {
            index: 0,
            get children() {
              createComponent(ObserveScope, { lifecycle });
              return createComponent(Solid.SuggestionPrimitiveTitle, {});
            },
          });
        },
      });
    const html = renderToString(() =>
      createComponent(Solid.AuiProvider, {
        config: AuiConfig({ suggestions: TrackedSuggestions(lifecycle) }),
        get children() {
          createComponent(ObserveScope, { lifecycle });
          return [
            createComponent(InitialTitle, {}),
            createComponent(Nested, {}),
          ];
        },
      }),
    );
    expect(html.match(/Say hello/g)).toHaveLength(2);
    expect(lifecycle.effects).toBe(0);
    expect(lifecycle.insertionEffects).toBe(0);
    expect(lifecycle.signals.size).toBe(2);
    expect(lifecycle.destroys.size).toBe(3);
    await expectDisposed(lifecycle);
  });

  it("destroys the unmounted client after a stream flushes", async () => {
    const lifecycle = createLifecycle();
    const stream = renderToStream(() =>
      createComponent(Solid.AuiProvider, {
        config: AuiConfig({ suggestions: TrackedSuggestions(lifecycle) }),
        get children() {
          createComponent(ObserveScope, { lifecycle });
          return createComponent(InitialTitle, {});
        },
      }),
    );
    expect(lifecycle.signals.size).toBe(1);
    for (const signal of lifecycle.signals) expect(signal.aborted).toBe(false);
    const html = await new Promise<string>((resolve) => {
      let html = "";
      const writable = {
        write: (chunk: string) => {
          html += chunk;
        },
        end: () => resolve(html),
      };
      stream.pipe(writable);
    });
    expect(html).toContain("Say hello");
    expect(lifecycle.effects).toBe(0);
    expect(lifecycle.insertionEffects).toBe(0);
    for (const signal of lifecycle.signals) expect(signal.aborted).toBe(true);
    for (const destroy of lifecycle.destroys.values())
      expect(destroy).toHaveBeenCalledOnce();
  });
});
