/** @vitest-environment jsdom */
import { act } from "react";
import type { MouseEvent, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type * as AssistantStore from "@assistant-ui/store";
import type * as ComposerSendModule from "./ComposerSend";
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useComposerCompactContextOptional } from "./ComposerCompactContext";
import type { ComposerCompactContextValue } from "./ComposerCompactContext";
import { ComposerPrimitiveRoot } from "./ComposerRoot";

type StoreState = {
  composer: {
    attachments: object[];
    quote: object | undefined;
    queue: object[];
    dictation: object | undefined;
    text: string;
  };
};

const { storeState } = vi.hoisted((): { storeState: StoreState } => ({
  storeState: {
    composer: {
      attachments: [],
      quote: undefined,
      queue: [],
      dictation: undefined,
      text: "",
    },
  },
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof AssistantStore>();
  return {
    ...actual,
    useAuiState: <T,>(selector: (state: StoreState) => T) =>
      selector(storeState),
  };
});

vi.mock("./ComposerSend", async (importOriginal) => ({
  ...(await importOriginal<typeof ComposerSendModule>()),
  useComposerSend: () => vi.fn(),
}));

const resetStoreState = () => {
  storeState.composer.attachments = [];
  storeState.composer.quote = undefined;
  storeState.composer.queue = [];
  storeState.composer.dictation = undefined;
  storeState.composer.text = "";
};

describe("ComposerPrimitiveRoot click-to-focus", () => {
  beforeEach(() => {
    resetStoreState();
  });

  it("focuses the textarea when primary-button mousedown starts on blank form space", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <div data-testid="blank-space">
          <textarea data-testid="composer-input" />
        </div>
      </ComposerPrimitiveRoot>,
    );
    const blankSpace = getByTestId("blank-space");
    const textarea = getByTestId("composer-input");

    fireEvent.mouseDown(blankSpace, { button: 0 });

    expect(document.activeElement).toBe(textarea);
  });

  it("does not move focus to the textarea when mousedown starts on an interactive child", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <button data-testid="interactive-child" type="button">
          Action
        </button>
        <textarea data-testid="composer-input" />
      </ComposerPrimitiveRoot>,
    );
    const button = getByTestId("interactive-child");
    const textarea = getByTestId("composer-input");

    fireEvent.mouseDown(button, { button: 0 });

    expect(document.activeElement).not.toBe(textarea);
  });

  it("does not move focus to the textarea on non-primary mousedown", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <div data-testid="blank-space">
          <textarea data-testid="composer-input" />
        </div>
      </ComposerPrimitiveRoot>,
    );
    const blankSpace = getByTestId("blank-space");
    const textarea = getByTestId("composer-input");

    fireEvent.mouseDown(blankSpace, { button: 2 });

    expect(document.activeElement).not.toBe(textarea);
  });

  it("focuses a contenteditable composer target when primary-button mousedown starts on blank form space", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <div data-testid="blank-space">
          <div contentEditable data-testid="composer-input" tabIndex={0} />
        </div>
      </ComposerPrimitiveRoot>,
    );
    const blankSpace = getByTestId("blank-space");
    const composerInput = getByTestId("composer-input");

    fireEvent.mouseDown(blankSpace, { button: 0 });

    expect(document.activeElement).toBe(composerInput);
  });

  it("lets consumer onMouseDown prevent the default focus behavior", () => {
    const onMouseDown = vi.fn((event: MouseEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    const { getByTestId } = render(
      <ComposerPrimitiveRoot onMouseDown={onMouseDown}>
        <div data-testid="blank-space">
          <textarea data-testid="composer-input" />
        </div>
      </ComposerPrimitiveRoot>,
    );
    const blankSpace = getByTestId("blank-space");
    const textarea = getByTestId("composer-input");

    fireEvent.mouseDown(blankSpace, { button: 0 });

    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect(document.activeElement).not.toBe(textarea);
  });

  it("runs consumer onMouseDown and preserves default focus behavior when it does not prevent default", () => {
    const onMouseDown = vi.fn();
    const { getByTestId } = render(
      <ComposerPrimitiveRoot onMouseDown={onMouseDown}>
        <div data-testid="blank-space">
          <textarea data-testid="composer-input" />
        </div>
      </ComposerPrimitiveRoot>,
    );
    const blankSpace = getByTestId("blank-space");
    const textarea = getByTestId("composer-input");

    fireEvent.mouseDown(blankSpace, { button: 0 });

    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(textarea);
  });
});

describe("ComposerPrimitiveRoot compact mode", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetStoreState();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  const mount = async (props: {
    compact?: boolean | undefined;
    children?: ReactNode;
  }) => {
    await act(async () => {
      root.render(
        <ComposerPrimitiveRoot data-testid="composer-root" {...props} />,
      );
    });
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    return form as HTMLFormElement;
  };

  it("does not mark the form compact when compact is not enabled", async () => {
    const form = await mount({});

    expect(form.hasAttribute("data-compact")).toBe(false);
  });

  it("provides no compact context when compact is not enabled", async () => {
    let compactContext: ComposerCompactContextValue | null = null;
    const Probe = () => {
      compactContext = useComposerCompactContextOptional();
      return null;
    };

    await mount({ children: <Probe /> });

    expect(compactContext).toBeNull();
  });

  it("starts compact on the first render when compact is enabled and composer state is pristine", async () => {
    const form = await mount({ compact: true });

    expect(form.hasAttribute("data-compact")).toBe(true);
  });

  it.each([
    ["attachments are present", { attachments: [{}] }],
    ["a quote is present", { quote: {} }],
    ["queued messages are present", { queue: [{}] }],
    ["dictation is active", { dictation: {} }],
    ["text contains an explicit newline", { text: "a\nb" }],
  ] as const)(
    "does not mark the form compact when %s",
    async (_name, composerPatch) => {
      Object.assign(storeState.composer, composerPatch);

      const form = await mount({ compact: true });

      expect(form.hasAttribute("data-compact")).toBe(false);
    },
  );

  it("updates compact mode when the compact context multiline latch changes", async () => {
    let compactContext: ComposerCompactContextValue | null = null;
    const Probe = () => {
      compactContext = useComposerCompactContextOptional();
      return null;
    };

    const form = await mount({
      compact: true,
      children: <Probe />,
    });
    const context = compactContext;
    expect(context).not.toBeNull();
    if (!context) throw new Error("Composer compact context was not provided");
    expect(form.hasAttribute("data-compact")).toBe(true);

    await act(async () => {
      context.setMultiline(true);
    });
    expect(form.hasAttribute("data-compact")).toBe(false);

    await act(async () => {
      context.setMultiline(false);
    });
    expect(form.hasAttribute("data-compact")).toBe(true);
  });
});
