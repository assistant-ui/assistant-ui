/** @vitest-environment jsdom */
import { act } from "react";
import type { MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
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

  const setupComposer = (props?: ComposerPrimitiveRoot.Props) => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot {...props}>
        <div data-testid="blank-space">
          <textarea data-testid="composer-input" />
        </div>
      </ComposerPrimitiveRoot>,
    );
    return {
      blankSpace: getByTestId("blank-space"),
      textarea: getByTestId("composer-input"),
    };
  };

  it("focuses the textarea when primary-button mousedown starts on blank form space", () => {
    const { blankSpace, textarea } = setupComposer();

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

    const notPrevented = fireEvent.mouseDown(getByTestId("interactive-child"), {
      button: 0,
    });

    expect(notPrevented).toBe(true);
    expect(document.activeElement).not.toBe(getByTestId("composer-input"));
  });

  it("does not steal focus from a role-based widget carrying a tabindex", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <div role="slider" tabIndex={0} data-testid="widget" />
        <textarea data-testid="composer-input" />
      </ComposerPrimitiveRoot>,
    );

    const notPrevented = fireEvent.mouseDown(getByTestId("widget"), {
      button: 0,
    });

    expect(notPrevented).toBe(true);
    expect(document.activeElement).not.toBe(getByTestId("composer-input"));
  });

  it("does not steal focus from a roving-tabindex child with tabindex=-1", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <span tabIndex={-1} data-testid="roving-item">
          Item
        </span>
        <textarea data-testid="composer-input" />
      </ComposerPrimitiveRoot>,
    );

    const notPrevented = fireEvent.mouseDown(getByTestId("roving-item"), {
      button: 0,
    });

    expect(notPrevented).toBe(true);
    expect(document.activeElement).not.toBe(getByTestId("composer-input"));
  });

  it("does not move focus to the textarea on non-primary mousedown", () => {
    const { blankSpace, textarea } = setupComposer();

    const notPrevented = fireEvent.mouseDown(blankSpace, { button: 2 });

    expect(notPrevented).toBe(true);
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

    fireEvent.mouseDown(getByTestId("blank-space"), { button: 0 });

    expect(document.activeElement).toBe(getByTestId("composer-input"));
  });

  it("still focuses the textarea when the form is hosted inside a tabindex=-1 wrapper", () => {
    const { getByTestId } = render(
      <div tabIndex={-1}>
        <ComposerPrimitiveRoot>
          <div data-testid="blank-space">
            <textarea data-testid="composer-input" />
          </div>
        </ComposerPrimitiveRoot>
      </div>,
    );

    fireEvent.mouseDown(getByTestId("blank-space"), { button: 0 });

    expect(document.activeElement).toBe(getByTestId("composer-input"));
  });

  it("ignores mousedown on portaled descendants rendered outside the form's DOM", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        {createPortal(<div data-testid="portal-blank" />, document.body)}
        <textarea data-testid="composer-input" />
      </ComposerPrimitiveRoot>,
    );

    const notPrevented = fireEvent.mouseDown(getByTestId("portal-blank"), {
      button: 0,
    });

    expect(notPrevented).toBe(true);
    expect(document.activeElement).not.toBe(getByTestId("composer-input"));
  });

  it("keeps the mousedown default when the only textarea is disabled", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <div data-testid="blank-space">
          <textarea disabled data-testid="composer-input" />
        </div>
      </ComposerPrimitiveRoot>,
    );

    const notPrevented = fireEvent.mouseDown(getByTestId("blank-space"), {
      button: 0,
    });

    expect(notPrevented).toBe(true);
    expect(document.activeElement).not.toBe(getByTestId("composer-input"));
  });

  it("skips a disabled textarea and focuses the next composer input", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <div data-testid="blank-space">
          <textarea disabled data-testid="disabled-input" />
          <div contentEditable data-testid="composer-input" tabIndex={0} />
        </div>
      </ComposerPrimitiveRoot>,
    );

    fireEvent.mouseDown(getByTestId("blank-space"), { button: 0 });

    expect(document.activeElement).toBe(getByTestId("composer-input"));
  });

  it("keeps the mousedown default when the form contains no composer input", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <div data-testid="blank-space" />
      </ComposerPrimitiveRoot>,
    );

    const notPrevented = fireEvent.mouseDown(getByTestId("blank-space"), {
      button: 0,
    });

    expect(notPrevented).toBe(true);
  });

  it("lets descendants keep native mousedown defaults via stopPropagation", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <div data-testid="selectable" onMouseDown={(e) => e.stopPropagation()}>
          Selectable content
        </div>
        <textarea data-testid="composer-input" />
      </ComposerPrimitiveRoot>,
    );

    const notPrevented = fireEvent.mouseDown(getByTestId("selectable"), {
      button: 0,
    });

    expect(notPrevented).toBe(true);
    expect(document.activeElement).not.toBe(getByTestId("composer-input"));
  });

  it("lets consumer onMouseDown prevent the default focus behavior", () => {
    const onMouseDown = vi.fn((event: MouseEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    const { blankSpace, textarea } = setupComposer({ onMouseDown });

    fireEvent.mouseDown(blankSpace, { button: 0 });

    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect(document.activeElement).not.toBe(textarea);
  });

  it("runs consumer onMouseDown and preserves default focus behavior when it does not prevent default", () => {
    const onMouseDown = vi.fn();
    const { blankSpace, textarea } = setupComposer({ onMouseDown });

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
