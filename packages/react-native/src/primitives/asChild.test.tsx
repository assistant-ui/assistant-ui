import {
  act,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { Pressable, Text } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActionBarCopy } from "./actionBar/ActionBarCopy";
import { ActionBarEdit } from "./actionBar/ActionBarEdit";
import { ActionBarFeedbackNegative } from "./actionBar/ActionBarFeedbackNegative";
import { ActionBarFeedbackPositive } from "./actionBar/ActionBarFeedbackPositive";
import { ActionBarReload } from "./actionBar/ActionBarReload";
import { ActionBarSpeak } from "./actionBar/ActionBarSpeak";
import { ActionBarStopSpeaking } from "./actionBar/ActionBarStopSpeaking";
import { AttachmentRemove } from "./attachment/AttachmentRemove";
import { BranchPickerNext } from "./branchPicker/BranchPickerNext";
import { BranchPickerPrevious } from "./branchPicker/BranchPickerPrevious";
import { ChainOfThoughtAccordionTrigger } from "./chainOfThought/ChainOfThoughtAccordionTrigger";
import { ComposerAddAttachment } from "./composer/ComposerAddAttachment";
import { ComposerCancel } from "./composer/ComposerCancel";
import { ComposerQuoteDismiss } from "./composer/ComposerQuoteDismiss";
import { ComposerSend } from "./composer/ComposerSend";
import { QueueItemRemove } from "./queueItem/QueueItemRemove";
import { QueueItemSteer } from "./queueItem/QueueItemSteer";
import { SuggestionTrigger } from "./suggestion/SuggestionTrigger";
import { ThreadSuggestion } from "./thread/ThreadSuggestion";
import { ThreadListNew } from "./threadList/ThreadListNew";
import { ThreadListItemArchive } from "./threadListItem/ThreadListItemArchive";
import { ThreadListItemDelete } from "./threadListItem/ThreadListItemDelete";
import { ThreadListItemTrigger } from "./threadListItem/ThreadListItemTrigger";
import { ThreadListItemUnarchive } from "./threadListItem/ThreadListItemUnarchive";

const h = vi.hoisted(() => ({
  calls: [] as string[],
  disabled: false,
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useActionBarCopy: () => ({
    copy: () => h.calls.push("copy"),
    disabled: h.disabled,
    isCopied: false,
  }),
  useActionBarEdit: () => ({
    edit: () => h.calls.push("edit"),
    disabled: h.disabled,
  }),
  useActionBarFeedbackNegative: () => ({
    submit: () => h.calls.push("feedbackNegative"),
    isSubmitted: false,
  }),
  useActionBarFeedbackPositive: () => ({
    submit: () => h.calls.push("feedbackPositive"),
    isSubmitted: false,
  }),
  useActionBarReload: () => ({
    reload: () => h.calls.push("reload"),
    disabled: h.disabled,
  }),
  useActionBarSpeak: () => ({
    speak: () => h.calls.push("speak"),
    disabled: h.disabled,
  }),
  useActionBarStopSpeaking: () => ({
    stopSpeaking: () => h.calls.push("stopSpeaking"),
    disabled: h.disabled,
  }),
  useBranchPickerNext: () => ({
    next: () => h.calls.push("next"),
    disabled: h.disabled,
  }),
  useBranchPickerPrevious: () => ({
    previous: () => h.calls.push("previous"),
    disabled: h.disabled,
  }),
  useComposerAddAttachment: () => ({ disabled: h.disabled }),
  useComposerCancel: () => ({
    cancel: () => h.calls.push("cancel"),
    disabled: h.disabled,
  }),
  useComposerSend: () => ({
    send: () => h.calls.push("send"),
    disabled: h.disabled,
  }),
  useSuggestionTrigger: () => ({
    trigger: () => h.calls.push("suggest"),
    disabled: h.disabled,
  }),
  useThreadListItemArchive: () => ({ archive: () => h.calls.push("archive") }),
  useThreadListItemDelete: () => ({ delete: () => h.calls.push("delete") }),
  useThreadListItemTrigger: () => ({
    switchTo: () => h.calls.push("switchTo"),
  }),
  useThreadListItemUnarchive: () => ({
    unarchive: () => h.calls.push("unarchive"),
  }),
  useThreadListNew: () => ({
    switchToNewThread: () => h.calls.push("newThread"),
  }),
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({
    attachment: { remove: () => h.calls.push("attachmentRemove") },
    chainOfThought: { setCollapsed: () => h.calls.push("setCollapsed") },
    composer: { setQuote: () => h.calls.push("setQuote") },
    queueItem: {
      remove: () => h.calls.push("queueRemove"),
      steer: () => h.calls.push("steer"),
    },
  }),
  useAuiState: (
    selector: (state: {
      chainOfThought: { collapsed: boolean };
      suggestion: { prompt: string };
      threadListItem: { id: string };
      threads: { mainThreadId: string; newThreadId: string };
    }) => unknown,
  ) =>
    selector({
      chainOfThought: { collapsed: false },
      suggestion: { prompt: "Try this" },
      threadListItem: { id: "thread" },
      threads: { mainThreadId: "thread", newThreadId: "new" },
    }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) => {
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

const primitives: ReadonlyArray<{
  name: string;
  action: string;
  hookDisabled: boolean;
  forwardsRef: boolean;
  render: (
    child: ReactElement,
    ref?: Ref<ComponentRef<typeof Pressable>>,
  ) => ReactNode;
}> = [
  {
    name: "ActionBarCopy",
    action: "copy",
    hookDisabled: true,
    forwardsRef: false,
    render: (child) => <ActionBarCopy asChild>{child}</ActionBarCopy>,
  },
  {
    name: "ActionBarEdit",
    action: "edit",
    hookDisabled: true,
    forwardsRef: false,
    render: (child) => <ActionBarEdit asChild>{child}</ActionBarEdit>,
  },
  {
    name: "ActionBarFeedbackNegative",
    action: "feedbackNegative",
    hookDisabled: false,
    forwardsRef: false,
    render: (child) => (
      <ActionBarFeedbackNegative asChild>{child}</ActionBarFeedbackNegative>
    ),
  },
  {
    name: "ActionBarFeedbackPositive",
    action: "feedbackPositive",
    hookDisabled: false,
    forwardsRef: false,
    render: (child) => (
      <ActionBarFeedbackPositive asChild>{child}</ActionBarFeedbackPositive>
    ),
  },
  {
    name: "ActionBarReload",
    action: "reload",
    hookDisabled: true,
    forwardsRef: false,
    render: (child) => <ActionBarReload asChild>{child}</ActionBarReload>,
  },
  {
    name: "ActionBarSpeak",
    action: "speak",
    hookDisabled: true,
    forwardsRef: false,
    render: (child) => <ActionBarSpeak asChild>{child}</ActionBarSpeak>,
  },
  {
    name: "ActionBarStopSpeaking",
    action: "stopSpeaking",
    hookDisabled: true,
    forwardsRef: false,
    render: (child) => (
      <ActionBarStopSpeaking asChild>{child}</ActionBarStopSpeaking>
    ),
  },
  {
    name: "AttachmentRemove",
    action: "attachmentRemove",
    hookDisabled: false,
    forwardsRef: false,
    render: (child) => <AttachmentRemove asChild>{child}</AttachmentRemove>,
  },
  {
    name: "BranchPickerNext",
    action: "next",
    hookDisabled: true,
    forwardsRef: false,
    render: (child) => <BranchPickerNext asChild>{child}</BranchPickerNext>,
  },
  {
    name: "BranchPickerPrevious",
    action: "previous",
    hookDisabled: true,
    forwardsRef: false,
    render: (child) => (
      <BranchPickerPrevious asChild>{child}</BranchPickerPrevious>
    ),
  },
  {
    name: "ChainOfThoughtAccordionTrigger",
    action: "setCollapsed",
    hookDisabled: false,
    forwardsRef: false,
    render: (child) => (
      <ChainOfThoughtAccordionTrigger asChild>
        {child}
      </ChainOfThoughtAccordionTrigger>
    ),
  },
  {
    name: "ComposerAddAttachment",
    action: "pick",
    hookDisabled: true,
    forwardsRef: true,
    render: (child, ref) => (
      <ComposerAddAttachment
        asChild
        ref={ref}
        onPress={() => h.calls.push("pick")}
      >
        {child}
      </ComposerAddAttachment>
    ),
  },
  {
    name: "ComposerCancel",
    action: "cancel",
    hookDisabled: true,
    forwardsRef: true,
    render: (child, ref) => (
      <ComposerCancel asChild ref={ref}>
        {child}
      </ComposerCancel>
    ),
  },
  {
    name: "ComposerQuoteDismiss",
    action: "setQuote",
    hookDisabled: false,
    forwardsRef: true,
    render: (child, ref) => (
      <ComposerQuoteDismiss asChild ref={ref}>
        {child}
      </ComposerQuoteDismiss>
    ),
  },
  {
    name: "ComposerSend",
    action: "send",
    hookDisabled: true,
    forwardsRef: true,
    render: (child, ref) => (
      <ComposerSend asChild ref={ref}>
        {child}
      </ComposerSend>
    ),
  },
  {
    name: "QueueItemRemove",
    action: "queueRemove",
    hookDisabled: false,
    forwardsRef: false,
    render: (child) => <QueueItemRemove asChild>{child}</QueueItemRemove>,
  },
  {
    name: "QueueItemSteer",
    action: "steer",
    hookDisabled: false,
    forwardsRef: false,
    render: (child) => <QueueItemSteer asChild>{child}</QueueItemSteer>,
  },
  {
    name: "SuggestionTrigger",
    action: "suggest",
    hookDisabled: true,
    forwardsRef: false,
    render: (child) => <SuggestionTrigger asChild>{child}</SuggestionTrigger>,
  },
  {
    name: "ThreadSuggestion",
    action: "suggest",
    hookDisabled: true,
    forwardsRef: false,
    render: (child) => (
      <ThreadSuggestion asChild prompt="Try this">
        {child}
      </ThreadSuggestion>
    ),
  },
  {
    name: "ThreadListNew",
    action: "newThread",
    hookDisabled: false,
    forwardsRef: false,
    render: (child) => <ThreadListNew asChild>{child}</ThreadListNew>,
  },
  {
    name: "ThreadListItemArchive",
    action: "archive",
    hookDisabled: false,
    forwardsRef: false,
    render: (child) => (
      <ThreadListItemArchive asChild>{child}</ThreadListItemArchive>
    ),
  },
  {
    name: "ThreadListItemDelete",
    action: "delete",
    hookDisabled: false,
    forwardsRef: false,
    render: (child) => (
      <ThreadListItemDelete asChild>{child}</ThreadListItemDelete>
    ),
  },
  {
    name: "ThreadListItemTrigger",
    action: "switchTo",
    hookDisabled: false,
    forwardsRef: false,
    render: (child) => (
      <ThreadListItemTrigger asChild>{child}</ThreadListItemTrigger>
    ),
  },
  {
    name: "ThreadListItemUnarchive",
    action: "unarchive",
    hookDisabled: false,
    forwardsRef: false,
    render: (child) => (
      <ThreadListItemUnarchive asChild>{child}</ThreadListItemUnarchive>
    ),
  },
];

const kitButton = (
  <Pressable testID="kit" onPress={() => h.calls.push("child")}>
    <Text>Kit</Text>
  </Pressable>
);

describe("react-native primitives with asChild", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.calls.length = 0;
    h.disabled = false;
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

  const mount = async (node: ReactNode) => {
    await act(async () => {
      root.render(node);
    });
    const buttons = container.querySelectorAll('[role="button"]');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.getAttribute("data-testid")).toBe("kit");
    return buttons[0]!;
  };

  for (const {
    name,
    action,
    hookDisabled,
    forwardsRef,
    render,
  } of primitives) {
    if (forwardsRef) {
      it(`${name} composes the wrapper and child refs`, async () => {
        const wrapperRef = vi.fn();
        const childRef = vi.fn();
        const el = await mount(
          render(
            <Pressable ref={childRef} testID="kit">
              <Text>Kit</Text>
            </Pressable>,
            wrapperRef,
          ),
        );

        expect(wrapperRef).toHaveBeenCalledWith(el);
        expect(childRef).toHaveBeenCalledWith(el);
      });
    }

    it(`${name} renders the child as its only press target`, async () => {
      await mount(render(kitButton));
    });

    it(`${name} runs the child's onPress, then its own action`, async () => {
      const el = await mount(render(kitButton));

      await act(async () => click(el));

      expect(h.calls).toEqual(["child", action]);
    });

    if (hookDisabled) {
      it(`${name} disables the child while it is disabled`, async () => {
        h.disabled = true;
        const el = await mount(render(kitButton));

        await act(async () => click(el));

        expect(el.getAttribute("aria-disabled")).toBe("true");
        expect(h.calls).toEqual([]);
      });
    }
  }
});
