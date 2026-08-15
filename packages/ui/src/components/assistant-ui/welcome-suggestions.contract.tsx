import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState, type ComponentType, type FC, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  useAui,
  useExternalStoreRuntime,
  type ThreadMessage,
} from "@assistant-ui/react";
import type { SuggestionEntry } from "./welcome-suggestions";

type Flavor = typeof import("./welcome-suggestions");

const FLAT = [
  { label: "Tell me a joke" },
  { label: "Summarize", prompt: "Summarize this page" },
  { label: "Draft an email" },
] as const;

const GROUPED = [
  { label: "Ideas", suggestions: [{ label: "One" }, { label: "Two" }] },
  { label: "Plain item" },
] as const;

const PLACEHOLDER = "Ask anything";

// react-textarea-autosize appends a hidden measuring textarea to the body,
// so composer queries must scope to the composer shell.
const textareaEl = () =>
  document.querySelector<HTMLTextAreaElement>(
    '[data-slot="aui_composer-shell"] textarea',
  )!;
const listboxEl = () =>
  document.querySelector<HTMLElement>('[role="listbox"]')!;
const optionEls = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
const highlightedEl = () =>
  document.querySelector<HTMLElement>("[data-highlighted]");
const composerKey = (key: string) => fireEvent.keyDown(textareaEl(), { key });
const sentText = (onNew: ReturnType<typeof vi.fn>) =>
  JSON.stringify(onNew.mock.calls);

// Radix's DismissableLayer attaches its outside-press listener a macrotask
// after mount, so outside presses flush a timer first.
const pressOutside = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  fireEvent.pointerDown(document.body, { pointerType: "mouse", button: 0 });
};

let aui!: ReturnType<typeof useAui>;
const Probe: FC = () => {
  aui = useAui();
  return null;
};

const TestComposer: FC = () => (
  <div data-slot="aui_composer-shell">
    <ComposerPrimitive.Root>
      <ComposerPrimitive.Input
        placeholder={PLACEHOLDER}
        aria-label="Message input"
      />
    </ComposerPrimitive.Root>
  </div>
);

const Passthrough: FC<{ children: ReactNode }> = ({ children }) => children;

type SetupOptions = {
  ui: ReactNode;
  flipped?: boolean;
  wrap?: ComponentType<{ children: ReactNode }>;
  runtimeSuggestions?: { prompt: string }[];
};

const setup = ({
  ui,
  flipped = false,
  wrap: Wrap = Passthrough,
  runtimeSuggestions,
}: SetupOptions) => {
  const onNew = vi.fn(async () => {});
  const App = () => {
    const runtime = useExternalStoreRuntime({
      messages: [] as ThreadMessage[],
      onNew,
      suggestions: runtimeSuggestions ?? [],
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Probe />
        <Wrap>
          <div>
            {flipped ? (
              <>
                {ui}
                <TestComposer />
              </>
            ) : (
              <>
                <TestComposer />
                {ui}
              </>
            )}
          </div>
        </Wrap>
      </AssistantRuntimeProvider>
    );
  };
  render(<App />);
  act(() => textareaEl().focus());
  return { onNew };
};

export const describeWelcomeSuggestionsContract = ({
  name,
  flavor,
  Rtl,
}: {
  name: string;
  flavor: Flavor;
  Rtl: ComponentType<{ children: ReactNode }>;
}) => {
  const {
    ThreadWelcomeSuggestions,
    WelcomeSuggestionsRoot,
    WelcomeSuggestionsStack,
  } = flavor;

  const flatStack = (options?: Partial<SetupOptions>) =>
    setup({ ui: <ThreadWelcomeSuggestions suggestions={FLAT} />, ...options });

  const groupedStack = (options?: Partial<SetupOptions>) =>
    setup({
      ui: (
        <WelcomeSuggestionsRoot suggestions={GROUPED}>
          <WelcomeSuggestionsStack />
        </WelcomeSuggestionsRoot>
      ),
      ...options,
    });

  describe(`${name}: stack composer navigation`, () => {
    it("enters on arrow from an empty composer: highlight, ghost, aria, focus kept", () => {
      flatStack();
      composerKey("ArrowDown");

      expect(highlightedEl()).toBe(optionEls()[0]);
      expect(textareaEl().placeholder).toBe("Tell me a joke");
      expect(textareaEl().getAttribute("aria-activedescendant")).toBe(
        optionEls()[0]!.id,
      );
      expect(textareaEl().getAttribute("aria-controls")).toBe(listboxEl().id);
      expect(document.activeElement).toBe(textareaEl());
    });

    it("clamps at the far edge and exits at the composer edge", () => {
      flatStack();
      composerKey("ArrowDown");
      composerKey("ArrowDown");
      composerKey("ArrowDown");
      composerKey("ArrowDown");
      expect(highlightedEl()).toBe(optionEls()[2]);

      composerKey("ArrowUp");
      composerKey("ArrowUp");
      expect(highlightedEl()).toBe(optionEls()[0]);
      composerKey("ArrowUp");
      expect(highlightedEl()).toBeNull();
      expect(textareaEl().placeholder).toBe(PLACEHOLDER);
      expect(textareaEl().getAttribute("aria-activedescendant")).toBeNull();
    });

    it("does not enter while the caret is not at the composer's edge", () => {
      flatStack();
      act(() => aui.composer().setText("hello"));
      composerKey("ArrowDown");
      expect(highlightedEl()).toBeNull();
    });

    it("flipped layout enters with ArrowUp on the row nearest the composer", () => {
      flatStack({ flipped: true });
      composerKey("ArrowUp");
      expect(highlightedEl()).toBe(optionEls()[2]);

      composerKey("ArrowUp");
      composerKey("ArrowUp");
      composerKey("ArrowUp");
      expect(highlightedEl()).toBe(optionEls()[0]);

      composerKey("ArrowDown");
      composerKey("ArrowDown");
      composerKey("ArrowDown");
      expect(highlightedEl()).toBeNull();
    });

    it("Enter sends the highlighted suggestion", async () => {
      const { onNew } = flatStack();
      composerKey("ArrowDown");
      composerKey("Enter");
      await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
      expect(sentText(onNew)).toContain("Tell me a joke");
      expect(highlightedEl()).toBeNull();
    });

    it("forward arrow accepts the prompt into the empty composer and hands control back", async () => {
      flatStack();
      composerKey("ArrowDown");
      composerKey("ArrowDown");
      expect(textareaEl().placeholder).toBe("Summarize this page");

      composerKey("ArrowRight");
      await waitFor(() =>
        expect(textareaEl().value).toBe("Summarize this page"),
      );
      expect(highlightedEl()).toBeNull();
      expect(textareaEl().placeholder).toBe(PLACEHOLDER);
    });

    it("Escape exits navigation and restores the placeholder", () => {
      flatStack();
      composerKey("ArrowDown");
      composerKey("Escape");
      expect(highlightedEl()).toBeNull();
      expect(textareaEl().placeholder).toBe(PLACEHOLDER);
    });

    it("a composer edit exits navigation", async () => {
      flatStack();
      composerKey("ArrowDown");
      act(() => aui.composer().setText("typing"));
      await waitFor(() => expect(highlightedEl()).toBeNull());
      expect(textareaEl().placeholder).toBe(PLACEHOLDER);
    });

    it("an outside press exits navigation", async () => {
      flatStack();
      composerKey("ArrowDown");
      await pressOutside();
      await waitFor(() => expect(highlightedEl()).toBeNull());
      expect(textareaEl().placeholder).toBe(PLACEHOLDER);
    });

    it("hover highlights without a ghost preview and clears on leave", () => {
      flatStack();
      fireEvent.mouseMove(optionEls()[2]!);
      expect(highlightedEl()).toBe(optionEls()[2]);
      expect(textareaEl().placeholder).toBe(PLACEHOLDER);

      fireEvent.mouseLeave(listboxEl());
      expect(highlightedEl()).toBeNull();
    });

    it("hover on the highlighted row keeps the keyboard ghost", () => {
      flatStack();
      composerKey("ArrowDown");
      expect(textareaEl().placeholder).toBe("Tell me a joke");

      fireEvent.mouseMove(optionEls()[0]!);
      expect(textareaEl().placeholder).toBe("Tell me a joke");

      fireEvent.mouseMove(optionEls()[1]!);
      expect(highlightedEl()).toBe(optionEls()[1]);
      expect(textareaEl().placeholder).toBe(PLACEHOLDER);
    });
  });

  describe(`${name}: stack listbox focus`, () => {
    it("focusing the listbox highlights the row nearest the composer and previews it", () => {
      flatStack();
      act(() => listboxEl().focus());
      expect(highlightedEl()).toBe(optionEls()[0]);
      expect(textareaEl().placeholder).toBe("Tell me a joke");
      expect(listboxEl().getAttribute("aria-activedescendant")).toBe(
        optionEls()[0]!.id,
      );

      fireEvent.keyDown(listboxEl(), { key: "ArrowDown" });
      expect(highlightedEl()).toBe(optionEls()[1]);
    });

    it("arrowing past the composer edge returns focus to the composer", async () => {
      flatStack();
      act(() => listboxEl().focus());
      fireEvent.keyDown(listboxEl(), { key: "ArrowUp" });
      expect(document.activeElement).toBe(textareaEl());
      await waitFor(() => expect(highlightedEl()).toBeNull());
      expect(textareaEl().placeholder).toBe(PLACEHOLDER);
    });

    it("Enter on the focused listbox sends the highlighted row", async () => {
      const { onNew } = flatStack();
      act(() => listboxEl().focus());
      fireEvent.keyDown(listboxEl(), { key: "Enter" });
      await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
      expect(sentText(onNew)).toContain("Tell me a joke");
    });
  });

  describe(`${name}: stack groups`, () => {
    const openIdeas = () => {
      composerKey("ArrowDown");
      expect(highlightedEl()?.textContent).toContain("Ideas");
      composerKey("ArrowRight");
      expect(listboxEl().getAttribute("aria-label")).toBe("Ideas");
    };

    it("forward arrow opens the highlighted group in place", () => {
      groupedStack();
      openIdeas();
      expect(optionEls().map((el) => el.textContent)).toEqual(["One", "Two"]);
      expect(document.activeElement).toBe(textareaEl());
    });

    it("arrows highlight group items with ghost and aria, Enter sends", async () => {
      const { onNew } = groupedStack();
      openIdeas();
      composerKey("ArrowDown");
      expect(highlightedEl()?.textContent).toBe("One");
      expect(textareaEl().placeholder).toBe("One");
      expect(textareaEl().getAttribute("aria-activedescendant")).toBe(
        highlightedEl()!.id,
      );

      composerKey("Enter");
      await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
      expect(sentText(onNew)).toContain("One");
      expect(listboxEl().getAttribute("aria-label")).toBe("Suggestions");
    });

    it("Escape climbs the ladder: group, then top row, then idle", () => {
      groupedStack();
      openIdeas();
      composerKey("ArrowDown");

      composerKey("Escape");
      expect(listboxEl().getAttribute("aria-label")).toBe("Suggestions");
      expect(highlightedEl()?.textContent).toContain("Ideas");
      expect(document.activeElement).toBe(textareaEl());

      composerKey("Escape");
      expect(highlightedEl()).toBeNull();
    });

    it("a composer edit closes the open group", async () => {
      groupedStack();
      openIdeas();
      act(() => aui.composer().setText("typing"));
      await waitFor(() =>
        expect(listboxEl().getAttribute("aria-label")).toBe("Suggestions"),
      );
    });

    it("an outside press closes the open group", async () => {
      groupedStack();
      openIdeas();
      await pressOutside();
      await waitFor(() =>
        expect(listboxEl().getAttribute("aria-label")).toBe("Suggestions"),
      );
      expect(highlightedEl()).toBeNull();
    });

    it("flipped layout: group entry and arrows track the composer", () => {
      groupedStack({ flipped: true });
      composerKey("ArrowUp");
      expect(highlightedEl()?.textContent).toContain("Plain item");
      composerKey("ArrowUp");
      expect(highlightedEl()?.textContent).toContain("Ideas");

      composerKey("ArrowRight");
      expect(listboxEl().getAttribute("aria-label")).toBe("Ideas");

      composerKey("ArrowUp");
      expect(highlightedEl()?.textContent).toBe("Two");
      expect(textareaEl().placeholder).toBe("Two");
      composerKey("ArrowUp");
      expect(highlightedEl()?.textContent).toBe("One");
      composerKey("ArrowDown");
      expect(highlightedEl()?.textContent).toBe("Two");
    });

    it("a suggestions update that drops the open group returns to the top level", async () => {
      let setEntries!: (entries: readonly SuggestionEntry[]) => void;
      const Dynamic: FC = () => {
        const [entries, set] = useState<readonly SuggestionEntry[]>(GROUPED);
        setEntries = set;
        return (
          <WelcomeSuggestionsRoot suggestions={entries}>
            <WelcomeSuggestionsStack />
          </WelcomeSuggestionsRoot>
        );
      };
      setup({ ui: <Dynamic /> });
      openIdeas();

      act(() => setEntries(FLAT));
      await waitFor(() =>
        expect(listboxEl().getAttribute("aria-label")).toBe("Suggestions"),
      );
      composerKey("ArrowDown");
      expect(highlightedEl()?.textContent).toContain("Tell me a joke");
    });
  });

  describe(`${name}: pills and picker`, () => {
    const renderPills = () =>
      setup({ ui: <ThreadWelcomeSuggestions suggestions={GROUPED} /> });

    it("clicking a group pill opens the picker and focuses the composer", () => {
      renderPills();
      fireEvent.click(screen.getByRole("button", { name: "Ideas" }));
      expect(listboxEl().getAttribute("aria-label")).toBe("Ideas");
      expect(optionEls().map((el) => el.textContent)).toEqual(["One", "Two"]);
      expect(document.activeElement).toBe(textareaEl());
    });

    it("arrows walk picker items, wrapping at the far edge", () => {
      renderPills();
      fireEvent.click(screen.getByRole("button", { name: "Ideas" }));
      composerKey("ArrowDown");
      expect(highlightedEl()?.textContent).toBe("One");
      composerKey("ArrowDown");
      expect(highlightedEl()?.textContent).toBe("Two");
      composerKey("ArrowDown");
      expect(highlightedEl()?.textContent).toBe("One");
    });

    it("arrowing toward the composer at the near edge returns focus to the pill", async () => {
      renderPills();
      const pill = screen.getByRole("button", { name: "Ideas" });
      fireEvent.click(pill);
      composerKey("ArrowDown");
      composerKey("ArrowUp");
      await waitFor(() => expect(document.activeElement).toBe(pill));
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });

    it("Escape closes the picker and keeps the composer focused", () => {
      renderPills();
      fireEvent.click(screen.getByRole("button", { name: "Ideas" }));
      composerKey("Escape");
      expect(document.querySelector('[role="listbox"]')).toBeNull();
      expect(document.activeElement).toBe(textareaEl());
      expect(screen.getByRole("button", { name: "Ideas" })).toBeTruthy();
    });

    it("selecting a picker item sends it and closes the picker", async () => {
      const { onNew } = renderPills();
      fireEvent.click(screen.getByRole("button", { name: "Ideas" }));
      composerKey("ArrowDown");
      composerKey("Enter");
      await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
      expect(sentText(onNew)).toContain("One");
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });

    it("keyboard reaches pills from the composer, arrows rove, Escape returns", () => {
      renderPills();
      composerKey("ArrowDown");
      const ideas = screen.getByRole("button", { name: "Ideas" });
      expect(document.activeElement).toBe(ideas);

      fireEvent.keyDown(ideas, { key: "ArrowRight" });
      expect(document.activeElement?.textContent).toBe("Plain item");

      fireEvent.keyDown(document.activeElement!, { key: "Escape" });
      expect(document.activeElement).toBe(textareaEl());

      composerKey("ArrowDown");
      fireEvent.keyDown(ideas, { key: "ArrowDown" });
      expect(listboxEl().getAttribute("aria-label")).toBe("Ideas");
    });

    it("flipped layout: picker enters nearest the composer and exits past it", async () => {
      setup({
        ui: <ThreadWelcomeSuggestions suggestions={GROUPED} />,
        flipped: true,
      });
      const pill = screen.getByRole("button", { name: "Ideas" });
      fireEvent.click(pill);
      composerKey("ArrowUp");
      expect(highlightedEl()?.textContent).toBe("Two");

      composerKey("ArrowDown");
      await waitFor(() => expect(document.activeElement).toBe(pill));
    });
  });

  describe(`${name}: suggestion sources and props`, () => {
    it("renders runtime suggestions when no prop is given", async () => {
      const { onNew } = setup({
        ui: <ThreadWelcomeSuggestions />,
        runtimeSuggestions: [{ prompt: "Runtime says hi" }],
      });
      expect(optionEls().map((el) => el.textContent)).toEqual([
        "Runtime says hi",
      ]);

      composerKey("ArrowDown");
      composerKey("Enter");
      await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
      expect(sentText(onNew)).toContain("Runtime says hi");
    });

    it("send=false drafts into the composer instead of sending", async () => {
      const { onNew } = setup({
        ui: <ThreadWelcomeSuggestions suggestions={FLAT} send={false} />,
      });
      composerKey("ArrowDown");
      composerKey("Enter");
      await waitFor(() => expect(textareaEl().value).toBe("Tell me a joke"));
      expect(onNew).not.toHaveBeenCalled();
    });
  });

  describe(`${name}: right-to-left`, () => {
    it("ArrowLeft accepts the highlighted prompt", async () => {
      setup({
        ui: <ThreadWelcomeSuggestions suggestions={FLAT} />,
        wrap: Rtl,
      });
      composerKey("ArrowDown");
      composerKey("ArrowLeft");
      await waitFor(() => expect(textareaEl().value).toBe("Tell me a joke"));
    });
  });
};
