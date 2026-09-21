import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionBarCopy } from "./ActionBarCopy";
import { ActionBarEdit } from "./ActionBarEdit";
import { ActionBarFeedbackNegative } from "./ActionBarFeedbackNegative";
import { ActionBarFeedbackPositive } from "./ActionBarFeedbackPositive";
import { ActionBarReload } from "./ActionBarReload";
import { ActionBarSpeak } from "./ActionBarSpeak";
import { ActionBarStopSpeaking } from "./ActionBarStopSpeaking";

const h = vi.hoisted(() => ({
  copy: vi.fn<() => void>(),
  edit: vi.fn<() => void>(),
  feedbackNegative: vi.fn<() => void>(),
  feedbackPositive: vi.fn<() => void>(),
  reload: vi.fn<() => void>(),
  speak: vi.fn<() => Promise<void>>(),
  stopSpeaking: vi.fn<() => void>(),
  state: {
    copy: { disabled: false, isCopied: false },
    edit: { disabled: false },
    feedbackNegative: { isSubmitted: false },
    feedbackPositive: { isSubmitted: false },
    reload: { disabled: false },
    speak: { disabled: false },
    stopSpeaking: { disabled: false },
  },
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    useActionBarCopy: () => ({
      copy: h.copy,
      disabled: h.state.copy.disabled,
      isCopied: h.state.copy.isCopied,
    }),
    useActionBarEdit: () => ({ edit: h.edit, disabled: h.state.edit.disabled }),
    useActionBarFeedbackNegative: () => ({
      submit: h.feedbackNegative,
      isSubmitted: h.state.feedbackNegative.isSubmitted,
    }),
    useActionBarFeedbackPositive: () => ({
      submit: h.feedbackPositive,
      isSubmitted: h.state.feedbackPositive.isSubmitted,
    }),
    useActionBarReload: () => ({
      reload: h.reload,
      disabled: h.state.reload.disabled,
    }),
    useActionBarSpeak: () => ({
      speak: h.speak,
      disabled: h.state.speak.disabled,
    }),
    useActionBarStopSpeaking: () => ({
      stopSpeaking: h.stopSpeaking,
      disabled: h.state.stopSpeaking.disabled,
    }),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) =>
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );

type DisabledChildren = (state: { disabled: boolean }) => ReactNode;

type ActionBarTestCase = {
  name: string;
  disabledState?: { disabled: boolean };
  render: (
    children: ReactNode | DisabledChildren,
    disabled?: boolean,
  ) => ReactNode;
};

const actionBars: ActionBarTestCase[] = [
  {
    name: "ActionBarCopy",
    disabledState: h.state.copy,
    render: (children, disabled) => (
      <ActionBarCopy
        testID="t"
        {...(disabled === undefined ? {} : { disabled })}
      >
        {children}
      </ActionBarCopy>
    ),
  },
  {
    name: "ActionBarEdit",
    disabledState: h.state.edit,
    render: (children, disabled) => (
      <ActionBarEdit
        testID="t"
        {...(disabled === undefined ? {} : { disabled })}
      >
        {children}
      </ActionBarEdit>
    ),
  },
  {
    name: "ActionBarFeedbackNegative",
    render: (children, disabled) => (
      <ActionBarFeedbackNegative
        testID="t"
        {...(disabled === undefined ? {} : { disabled })}
      >
        {children}
      </ActionBarFeedbackNegative>
    ),
  },
  {
    name: "ActionBarFeedbackPositive",
    render: (children, disabled) => (
      <ActionBarFeedbackPositive
        testID="t"
        {...(disabled === undefined ? {} : { disabled })}
      >
        {children}
      </ActionBarFeedbackPositive>
    ),
  },
  {
    name: "ActionBarReload",
    disabledState: h.state.reload,
    render: (children, disabled) => (
      <ActionBarReload
        testID="t"
        {...(disabled === undefined ? {} : { disabled })}
      >
        {children}
      </ActionBarReload>
    ),
  },
  {
    name: "ActionBarSpeak",
    disabledState: h.state.speak,
    render: (children, disabled) => (
      <ActionBarSpeak
        testID="t"
        {...(disabled === undefined ? {} : { disabled })}
      >
        {children}
      </ActionBarSpeak>
    ),
  },
  {
    name: "ActionBarStopSpeaking",
    disabledState: h.state.stopSpeaking,
    render: (children, disabled) => (
      <ActionBarStopSpeaking
        testID="t"
        {...(disabled === undefined ? {} : { disabled })}
      >
        {children}
      </ActionBarStopSpeaking>
    ),
  },
];

describe("ActionBar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.copy.mockReset();
    h.edit.mockReset();
    h.feedbackNegative.mockReset();
    h.feedbackPositive.mockReset();
    h.reload.mockReset();
    h.speak.mockReset();
    h.stopSpeaking.mockReset();
    h.state.copy.disabled = false;
    h.state.copy.isCopied = false;
    h.state.edit.disabled = false;
    h.state.feedbackNegative.isSubmitted = false;
    h.state.feedbackPositive.isSubmitted = false;
    h.state.reload.disabled = false;
    h.state.speak.disabled = false;
    h.state.stopSpeaking.disabled = false;

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
    return container.querySelector('[data-testid="t"]') as HTMLElement;
  };

  for (const actionBar of actionBars) {
    describe(actionBar.name, () => {
      it("passes the effective disabled state to render children", async () => {
        if (actionBar.disabledState) {
          actionBar.disabledState.disabled = true;
        }

        let initialState: { disabled: boolean } | null = null;
        const initialEl = await mount(
          actionBar.render((state) => {
            initialState = state;
            return state.disabled ? "disabled" : "enabled";
          }),
        );

        expect(initialEl.textContent).toBe(
          actionBar.disabledState ? "disabled" : "enabled",
        );
        expect(initialState).toMatchObject({
          disabled: actionBar.disabledState ? true : false,
        });

        let propState: { disabled: boolean } | null = null;
        const propEl = await mount(
          actionBar.render((state) => {
            propState = state;
            return state.disabled ? "disabled" : "enabled";
          }, !actionBar.disabledState),
        );

        expect(propEl.textContent).toBe(
          actionBar.disabledState ? "enabled" : "disabled",
        );
        expect(propState).toMatchObject({
          disabled: !actionBar.disabledState,
        });
      });

      it("renders plain children", async () => {
        const el = await mount(actionBar.render("label"));

        expect(el.textContent).toBe("label");
      });
    });
  }

  const feedbackActionBars = [
    {
      name: "ActionBarFeedbackNegative",
      state: h.state.feedbackNegative,
      render: (extra: { "aria-selected"?: boolean }) => (
        <ActionBarFeedbackNegative testID="t" {...extra}>
          x
        </ActionBarFeedbackNegative>
      ),
    },
    {
      name: "ActionBarFeedbackPositive",
      state: h.state.feedbackPositive,
      render: (extra: { "aria-selected"?: boolean }) => (
        <ActionBarFeedbackPositive testID="t" {...extra}>
          x
        </ActionBarFeedbackPositive>
      ),
    },
  ];

  for (const { name, state, render } of feedbackActionBars) {
    describe(name, () => {
      it("marks submitted feedback selected", async () => {
        state.isSubmitted = true;

        const el = await mount(render({}));

        expect(el.getAttribute("aria-selected")).toBe("true");
      });

      it("does not mark unsubmitted feedback selected", async () => {
        const el = await mount(render({}));

        expect(el.getAttribute("aria-selected")).toBe("false");
      });

      it("keeps a caller selected override", async () => {
        state.isSubmitted = true;

        const el = await mount(render({ "aria-selected": false }));

        expect(el.getAttribute("aria-selected")).toBe("false");
      });
    });
  }

  it("calls speak on press", async () => {
    const el = await mount(<ActionBarSpeak testID="t">speak</ActionBarSpeak>);

    await act(async () => {
      click(el);
    });

    expect(h.speak).toHaveBeenCalledTimes(1);
  });

  it("does not call speak while the hook disables it", async () => {
    h.state.speak.disabled = true;
    const el = await mount(<ActionBarSpeak testID="t">speak</ActionBarSpeak>);

    await act(async () => {
      click(el);
    });

    expect(h.speak).not.toHaveBeenCalled();
  });

  it("calls stopSpeaking on press", async () => {
    const el = await mount(
      <ActionBarStopSpeaking testID="t">stop</ActionBarStopSpeaking>,
    );

    await act(async () => {
      click(el);
    });

    expect(h.stopSpeaking).toHaveBeenCalledTimes(1);
  });

  it("does not call stopSpeaking while the hook disables it", async () => {
    h.state.stopSpeaking.disabled = true;
    const el = await mount(
      <ActionBarStopSpeaking testID="t">stop</ActionBarStopSpeaking>,
    );

    await act(async () => {
      click(el);
    });

    expect(h.stopSpeaking).not.toHaveBeenCalled();
  });
});
