import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActionBarCopy } from "./actionBar/ActionBarCopy";
import { ActionBarEdit } from "./actionBar/ActionBarEdit";
import { ActionBarFeedbackNegative } from "./actionBar/ActionBarFeedbackNegative";
import { ActionBarFeedbackPositive } from "./actionBar/ActionBarFeedbackPositive";
import { ActionBarReload } from "./actionBar/ActionBarReload";
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

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({
    attachment: { remove: vi.fn() },
    chainOfThought: { setCollapsed: vi.fn() },
    composer: { setQuote: vi.fn() },
    queueItem: { remove: vi.fn(), steer: vi.fn() },
  }),
  useAuiState: <T,>(
    selector: (s: {
      suggestion: { prompt: string };
      chainOfThought: { collapsed: boolean };
      threads: { newThreadId: string | null; mainThreadId: string };
      threadListItem: { id: string };
    }) => T,
  ) =>
    selector({
      suggestion: { prompt: "p" },
      chainOfThought: { collapsed: false },
      threads: { newThreadId: null, mainThreadId: "main" },
      threadListItem: { id: "thread" },
    }),
}));

vi.mock("@assistant-ui/core/react", () => ({
  useActionBarCopy: () => ({
    copy: vi.fn(),
    disabled: false,
    isCopied: false,
  }),
  useActionBarEdit: () => ({ edit: vi.fn(), disabled: false }),
  useActionBarFeedbackNegative: () => ({
    submit: vi.fn(),
    isSubmitted: false,
  }),
  useActionBarFeedbackPositive: () => ({
    submit: vi.fn(),
    isSubmitted: false,
  }),
  useActionBarReload: () => ({ reload: vi.fn(), disabled: false }),
  useBranchPickerNext: () => ({ next: vi.fn(), disabled: false }),
  useBranchPickerPrevious: () => ({ previous: vi.fn(), disabled: false }),
  useComposerAddAttachment: () => ({ disabled: false }),
  useComposerCancel: () => ({ cancel: vi.fn(), disabled: false }),
  useComposerSend: () => ({ send: vi.fn(), disabled: false }),
  useSuggestionTrigger: () => ({ trigger: vi.fn(), disabled: false }),
  useThreadListNew: () => ({ switchToNewThread: vi.fn() }),
  useThreadListItemArchive: () => ({ archive: vi.fn() }),
  useThreadListItemDelete: () => ({ delete: vi.fn() }),
  useThreadListItemTrigger: () => ({ switchTo: vi.fn() }),
  useThreadListItemUnarchive: () => ({ unarchive: vi.fn() }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

declare global {
  interface ImportMeta {
    glob(
      pattern: string,
      options: { query: "?raw"; eager: true; import: "default" },
    ): Record<string, string>;
  }
}

type Extra = { accessibilityRole?: "link" | undefined };

const actionable: ReadonlyArray<{
  name: string;
  render: (extra: Extra) => ReactNode;
}> = [
  {
    name: "ActionBarCopy",
    render: (e) => (
      <ActionBarCopy testID="t" {...e}>
        x
      </ActionBarCopy>
    ),
  },
  {
    name: "ActionBarEdit",
    render: (e) => (
      <ActionBarEdit testID="t" {...e}>
        x
      </ActionBarEdit>
    ),
  },
  {
    name: "ActionBarFeedbackNegative",
    render: (e) => (
      <ActionBarFeedbackNegative testID="t" {...e}>
        x
      </ActionBarFeedbackNegative>
    ),
  },
  {
    name: "ActionBarFeedbackPositive",
    render: (e) => (
      <ActionBarFeedbackPositive testID="t" {...e}>
        x
      </ActionBarFeedbackPositive>
    ),
  },
  {
    name: "ActionBarReload",
    render: (e) => (
      <ActionBarReload testID="t" {...e}>
        x
      </ActionBarReload>
    ),
  },
  {
    name: "AttachmentRemove",
    render: (e) => (
      <AttachmentRemove testID="t" {...e}>
        x
      </AttachmentRemove>
    ),
  },
  {
    name: "BranchPickerNext",
    render: (e) => (
      <BranchPickerNext testID="t" {...e}>
        x
      </BranchPickerNext>
    ),
  },
  {
    name: "BranchPickerPrevious",
    render: (e) => (
      <BranchPickerPrevious testID="t" {...e}>
        x
      </BranchPickerPrevious>
    ),
  },
  {
    name: "ChainOfThoughtAccordionTrigger",
    render: (e) => (
      <ChainOfThoughtAccordionTrigger testID="t" {...e}>
        x
      </ChainOfThoughtAccordionTrigger>
    ),
  },
  {
    name: "ComposerAddAttachment",
    render: (e) => (
      <ComposerAddAttachment testID="t" {...e}>
        x
      </ComposerAddAttachment>
    ),
  },
  {
    name: "ComposerCancel",
    render: (e) => (
      <ComposerCancel testID="t" {...e}>
        x
      </ComposerCancel>
    ),
  },
  {
    name: "ComposerSend",
    render: (e) => (
      <ComposerSend testID="t" {...e}>
        x
      </ComposerSend>
    ),
  },
  {
    name: "ComposerQuoteDismiss",
    render: (e) => (
      <ComposerQuoteDismiss testID="t" {...e}>
        x
      </ComposerQuoteDismiss>
    ),
  },
  {
    name: "QueueItemRemove",
    render: (e) => (
      <QueueItemRemove testID="t" {...e}>
        x
      </QueueItemRemove>
    ),
  },
  {
    name: "QueueItemSteer",
    render: (e) => (
      <QueueItemSteer testID="t" {...e}>
        x
      </QueueItemSteer>
    ),
  },
  {
    name: "SuggestionTrigger",
    render: (e) => (
      <SuggestionTrigger testID="t" {...e}>
        x
      </SuggestionTrigger>
    ),
  },
  {
    name: "ThreadSuggestion",
    render: (e) => (
      <ThreadSuggestion testID="t" prompt="p" {...e}>
        x
      </ThreadSuggestion>
    ),
  },
  {
    name: "ThreadListNew",
    render: (e) => (
      <ThreadListNew testID="t" {...e}>
        x
      </ThreadListNew>
    ),
  },
  {
    name: "ThreadListItemArchive",
    render: (e) => (
      <ThreadListItemArchive testID="t" {...e}>
        x
      </ThreadListItemArchive>
    ),
  },
  {
    name: "ThreadListItemDelete",
    render: (e) => (
      <ThreadListItemDelete testID="t" {...e}>
        x
      </ThreadListItemDelete>
    ),
  },
  {
    name: "ThreadListItemTrigger",
    render: (e) => (
      <ThreadListItemTrigger testID="t" {...e}>
        x
      </ThreadListItemTrigger>
    ),
  },
  {
    name: "ThreadListItemUnarchive",
    render: (e) => (
      <ThreadListItemUnarchive testID="t" {...e}>
        x
      </ThreadListItemUnarchive>
    ),
  },
];

describe("react-native primitive accessibility roles", () => {
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

  const mount = async (node: ReactNode) => {
    await act(async () => {
      root.render(node);
    });
    const el = container.querySelector('[data-testid="t"]');
    expect(el).not.toBeNull();
    return el as HTMLElement;
  };

  it("gives every Pressable primitive in the package a button role", () => {
    const wrappers = Object.entries(
      import.meta.glob("./**/*.tsx", {
        query: "?raw",
        eager: true,
        import: "default",
      }),
    ).filter(
      ([file, source]) =>
        !file.endsWith(".test.tsx") && source.includes("<Pressable"),
    );

    expect(
      wrappers
        .filter(([, source]) => !source.includes('accessibilityRole="button"'))
        .map(([file]) => file),
    ).toEqual([]);

    expect(
      wrappers.map(([file]) => file.replace(/^.*\/|\.tsx$/g, "")).sort(),
    ).toEqual(actionable.map(({ name }) => name).sort());
  });

  for (const { name, render } of actionable) {
    it(`${name} defaults its accessibilityRole to button`, async () => {
      const el = await mount(render({}));
      expect(el.getAttribute("role")).toBe("button");
    });

    it(`${name} lets the caller override the role`, async () => {
      const el = await mount(render({ accessibilityRole: "link" }));
      expect(el.getAttribute("role")).toBe("link");
    });
  }
});
