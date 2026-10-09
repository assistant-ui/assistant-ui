// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
  createEvent,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SetupWizard } from "./setup-wizard";
import {
  currentPlan,
  initialCheckoutState,
  openInputs,
  planNeedsReview,
  stepProgress,
  type Checkout,
} from "../../../lib/checkout/protocol";
import type { CheckoutContextValue } from "../../shared/checkout-provider";
import { SetupNavigationContext } from "../../shared/setup-navigation";

const { push, finishCheckout, abandonCheckout } = vi.hoisted(() => ({
  push: vi.fn(),
  finishCheckout: vi.fn(),
  abandonCheckout: vi.fn(),
}));

vi.mock("@vercel/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/analytics")>()),
  track: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
}));

vi.mock("../../../lib/checkout/flow", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/checkout/flow")>()),
  finishCheckout,
  abandonCheckout,
}));

const scrollIntoView = vi.fn();
Element.prototype.scrollIntoView = scrollIntoView;

let reducedMotion = false;
window.matchMedia = (query: string) =>
  ({
    matches: query === "(prefers-reduced-motion: reduce)" && reducedMotion,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }) as unknown as MediaQueryList;

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.unstubAllGlobals();
  reducedMotion = false;
});

const commands = {
  "checkout/message": vi.fn().mockResolvedValue(undefined),
  "checkout/answer": vi.fn().mockResolvedValue(undefined),
  "checkout/dismiss": vi.fn().mockResolvedValue(undefined),
  "checkout/plan": vi.fn().mockResolvedValue(undefined),
  "checkout/begin-plan": vi.fn().mockResolvedValue(undefined),
  "checkout/cancel": vi.fn().mockResolvedValue(undefined),
  "checkout/finish": vi.fn().mockResolvedValue(undefined),
} as unknown as CheckoutContextValue["commands"];

const context = (
  state: Checkout.State,
  agentPresent = true,
  fromCart = false,
  session: Partial<CheckoutContextValue["session"]> = {},
): CheckoutContextValue => ({
  state,
  session: {
    id: "test",
    products: ["assistant-ui"],
    startedAt: 1,
    fromCart,
    ...session,
  },
  url: "http://localhost/test",
  degraded: false,
  agentPresent,
  openInputs: openInputs(state),
  plan: currentPlan(state),
  planPending: planNeedsReview(state),
  progress: stepProgress(state),
  attentionKey: "",
  connection: { status: "connected", degraded: false, reconnect: () => {} },
  commands,
});

const connected = (overrides: Partial<Checkout.State>): Checkout.State => ({
  ...initialCheckoutState(),
  createdAt: 1,
  agent: {
    ...initialCheckoutState().agent,
    lastSeenAt: 1,
    connected: true,
    kind: "claude-code",
  },
  ...overrides,
});

const footer = () => within(screen.getByRole("contentinfo"));

const captureEvents = () => {
  const capture = vi.fn();
  window.posthog = { capture };
  return (event: string) =>
    capture.mock.calls
      .filter(([name]) => name === event)
      .map(([, properties]) => properties);
};

const observeRow = () => {
  let callback: IntersectionObserverCallback | undefined;
  let options: IntersectionObserverInit | undefined;
  let target: Element | undefined;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        observe: IntersectionObserverCallback,
        init?: IntersectionObserverInit,
      ) {
        callback = observe;
        options = init;
      }
      observe(element: Element) {
        target = element;
      }
      disconnect() {
        target = undefined;
      }
    },
  );
  return {
    observed: () => target,
    options: () => options,
    intersect: (
      isIntersecting: boolean,
      intersectionRatio = isIntersecting ? 1 : 0,
    ) =>
      callback?.(
        [
          {
            target,
            isIntersecting,
            intersectionRatio,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      ),
  };
};

describe("SetupWizard", () => {
  it("offers a Back control that keeps the setup running in the mobile header", () => {
    render(<SetupWizard checkout={context(initialCheckoutState())} />);
    const back = screen.getByRole("button", {
      name: "Back, setup keeps running",
    });
    expect(back.closest("header")?.className).toContain("sm:hidden");
  });

  it("starts with the introduction, with Back disabled and Next continuing", () => {
    render(<SetupWizard checkout={context(initialCheckoutState(), false)} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Welcome to the setup wizard for assistant-ui",
    );
    expect(footer().getByRole("button", { name: "Back" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(footer().getByRole("button", { name: "Next" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(footer().getByRole("button", { name: "Cancel" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("keeps the introduction's title to one line and lists a longer set of products under it", () => {
    render(
      <SetupWizard
        checkout={context(initialCheckoutState(), false, false, {
          products: ["assistant-ui", "cloud", "agent-tools"],
        })}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Welcome to the setup wizard",
    );
    expect(
      screen.getByText(
        "Setting up assistant-ui, Assistant Cloud, and Agent Tool.",
      ).className,
    ).toContain("text-muted-foreground");
  });

  it("names the products in the title only while that fits on one line, and lists them under it otherwise", () => {
    const lines = vi.spyOn(Element.prototype, "getClientRects");
    const intro = (lineCount: number) => {
      lines.mockReturnValue(
        Array.from(
          { length: lineCount },
          () => new DOMRect(),
        ) as unknown as DOMRectList,
      );
      render(
        <SetupWizard
          checkout={context(initialCheckoutState(), false, false, {
            products: ["assistant-ui", "cloud"],
          })}
        />,
      );
      return screen.getByRole("heading", { level: 1 }).textContent;
    };
    try {
      expect(intro(1)).toBe(
        "Welcome to the setup wizard for assistant-ui and Assistant Cloud",
      );
      expect(screen.queryByText(/^Setting up/)).toBeNull();
      cleanup();
      expect(intro(2)).toBe("Welcome to the setup wizard");
      expect(
        screen.getByText("Setting up assistant-ui and Assistant Cloud.")
          .className,
      ).toContain("text-muted-foreground");
    } finally {
      lines.mockRestore();
    }
  });

  it("shortens the title already on screen when the heading resizes and the products wrap to a second line", () => {
    const lines = vi.spyOn(Element.prototype, "getClientRects");
    const rects = (lineCount: number) =>
      Array.from(
        { length: lineCount },
        () => new DOMRect(),
      ) as unknown as DOMRectList;
    const observed = new Map<Element, () => void>();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        readonly callback: ResizeObserverCallback;
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
        }
        observe(target: Element) {
          observed.set(target, () => this.callback([], this));
        }
        unobserve() {}
        disconnect() {}
      },
    );
    try {
      lines.mockReturnValue(rects(1));
      render(
        <SetupWizard
          checkout={context(initialCheckoutState(), false, false, {
            products: ["assistant-ui", "cloud"],
          })}
        />,
      );
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading.textContent).toBe(
        "Welcome to the setup wizard for assistant-ui and Assistant Cloud",
      );
      const resized = observed.get(heading);
      expect(resized).toBeDefined();
      lines.mockReturnValue(rects(2));
      act(() => resized!());
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        "Welcome to the setup wizard",
      );
      expect(
        screen.getByText("Setting up assistant-ui and Assistant Cloud.")
          .className,
      ).toContain("text-muted-foreground");
    } finally {
      lines.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("keeps the frame at one fixed size on every page", () => {
    const frame = () =>
      document.querySelector('section[aria-labelledby="setup-wizard-title"]')!
        .className;
    render(<SetupWizard checkout={context(initialCheckoutState(), false)} />);
    const intro = frame();
    expect(intro).toContain("max-w-[52rem]");
    expect(intro).toContain("max-h-full");
    expect(intro).toContain("sm:aspect-[16/10]");
    expect(intro).toContain("sm:min-h-[min(38rem,100%)]");
    cleanup();
    render(
      <SetupWizard
        checkout={context(
          connected({
            status: "installing",
            steps: [
              {
                id: "s1",
                title: "Add the route",
                status: "active",
                createdAt: 4,
              },
            ],
          }),
        )}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Installing",
    );
    expect(frame()).toBe(intro);
  });

  it("pins the title and progress bar above the scrolling step list and keeps the step in progress in view", () => {
    const steps = (activeId: string): Checkout.Step[] =>
      ["s1", "s2", "s3"].map((id, index) => ({
        id,
        title: `Step ${index + 1}`,
        status: id < activeId ? "done" : id === activeId ? "active" : "pending",
        createdAt: index,
      }));
    const installing = (activeId: string) =>
      context(connected({ status: "installing", steps: steps(activeId) }));
    const scrolled = () =>
      scrollIntoView.mock.contexts.map(
        (element) =>
          within(element as HTMLElement).getByText(/^Step \d$/).textContent,
      );
    const { rerender } = render(<SetupWizard checkout={installing("s1")} />);
    const list = screen.getByRole("list", { name: "Installation steps" });
    const scroller = list.closest(".overflow-y-auto")!;
    expect(scroller.contains(screen.getByRole("heading", { level: 1 }))).toBe(
      false,
    );
    expect(scroller.contains(screen.getByRole("progressbar"))).toBe(false);
    expect(scroller.className).toContain(
      "[mask-image:linear-gradient(to_bottom,transparent,black_1.5rem,black_calc(100%_-_4rem),transparent)]",
    );
    expect(list.className).toContain("pb-6");
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "center" });
    expect(scrolled()).toEqual(["Step 1"]);
    expect(
      within(list).getByRole("listitem", { current: "step" }).textContent,
    ).toContain("Step 1");

    rerender(<SetupWizard checkout={installing("s1")} />);
    expect(scrolled()).toEqual(["Step 1"]);

    rerender(<SetupWizard checkout={installing("s3")} />);
    expect(scrolled()).toEqual(["Step 1", "Step 3"]);
    expect(
      within(list).getByRole("listitem", { current: "step" }).textContent,
    ).toContain("Step 3");
  });

  it("shows the list being planned and written until a step starts, then the progress", () => {
    const step = (id: string, status: Checkout.StepStatus): Checkout.Step => ({
      id,
      title: `Step ${id.slice(1)}`,
      status,
      createdAt: 0,
    });
    const installing = (steps: Checkout.Step[]) =>
      context(connected({ status: "installing", steps }));
    const titles = () =>
      within(screen.getByRole("list", { name: "Installation steps" }))
        .getAllByRole("listitem")
        .map((item) => item.querySelector("p")!.textContent);
    const { rerender } = render(<SetupWizard checkout={installing([])} />);
    expect(titles()).toEqual(["Planning the steps…"]);
    expect(
      screen.getByRole("progressbar", { name: "Planning the steps" }),
    ).toBeTruthy();
    expect(screen.queryByText(/steps done/)).toBeNull();

    rerender(
      <SetupWizard
        checkout={installing([step("s1", "pending"), step("s2", "pending")])}
      />,
    );
    expect(titles()).toEqual(["Step 1", "Step 2", "Writing the next step…"]);
    expect(
      screen.getByRole("progressbar", { name: "Planning the steps" }),
    ).toBeTruthy();
    expect(screen.queryByText(/steps done/)).toBeNull();

    rerender(
      <SetupWizard
        checkout={installing([step("s1", "active"), step("s2", "pending")])}
      />,
    );
    expect(titles()).toEqual(["Step 1", "Step 2"]);
    expect(
      screen
        .getByRole("progressbar", { name: "Step 1" })
        .getAttribute("aria-valuenow"),
    ).toBe("0");
    expect(screen.getByText("0 of 2 steps done")).toBeTruthy();
  });

  it("animates the steps in as they are written and fades the drafting row out once the first one starts", () => {
    const step = (id: string, status: Checkout.StepStatus): Checkout.Step => ({
      id,
      title: `Step ${id.slice(1)}`,
      status,
      createdAt: 0,
    });
    const installing = (steps: Checkout.Step[]) =>
      context(connected({ status: "installing", steps }));
    const row = (title: string) => screen.getByText(title).closest("li")!;
    const fade = (title: string) => row(title).firstElementChild!.className;
    vi.useFakeTimers();
    const { rerender } = render(<SetupWizard checkout={installing([])} />);
    const planning = row("Planning the steps…");
    expect(planning.className).toContain("motion-safe:animate-unfold");
    expect(fade("Planning the steps…")).toContain("motion-safe:fade-in");
    expect(planning.querySelector("svg")!.getAttribute("class")).toContain(
      "motion-safe:animate-[spin_3s_linear_infinite]",
    );
    expect(within(planning).getByText("being written")).toBeTruthy();

    rerender(
      <SetupWizard
        checkout={installing([step("s1", "pending"), step("s2", "pending")])}
      />,
    );
    expect(row("Step 1").className).toContain("motion-safe:animate-unfold");
    expect(fade("Step 1")).toContain("motion-safe:slide-in-from-bottom-2");
    expect(fade("Writing the next step…")).toContain("motion-safe:fade-in");

    rerender(
      <SetupWizard
        checkout={installing([step("s1", "active"), step("s2", "pending")])}
      />,
    );
    const drafting = row("Writing the next step…");
    expect(drafting.getAttribute("aria-hidden")).toBe("true");
    expect(drafting.className).toContain("motion-safe:animate-fold");
    expect(drafting.className).not.toContain("motion-safe:animate-unfold");
    expect(fade("Writing the next step…")).toContain("motion-safe:fade-out");
    expect(fade("Writing the next step…")).not.toContain("motion-safe:fade-in");
    expect(screen.getByText("0 of 2 steps done").className).toContain(
      "motion-safe:fade-in",
    );
    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByText("Writing the next step…")).toBeNull();
    vi.useRealTimers();
  });

  it("streams the agent's lines under their step, keeping it centered as they arrive, open while it runs and folded once it is done", () => {
    const step = (
      id: string,
      title: string,
      status: Checkout.StepStatus,
    ): Checkout.Step => ({ id, title, status, createdAt: 0 });
    const line = (
      id: string,
      stepId: string,
      text: string,
    ): Checkout.LogEntry => ({
      id,
      role: "agent",
      phase: "installing",
      at: Number(id.slice(1)),
      text,
      stepId,
    });
    const installing = (
      second: Checkout.StepStatus,
      third: Checkout.StepStatus,
      ...later: Checkout.LogEntry[]
    ) =>
      context(
        connected({
          status: "installing",
          steps: [
            step("s1", "Add the route", "done"),
            step("s2", "Wire the runtime", second),
            step("s3", "Mount the thread", third),
          ],
          log: [
            line("l1", "s1", "Created app/api/chat/route.ts"),
            line("l2", "s1", "Completed: Add the route"),
            line("l3", "s2", "Installing @assistant-ui/react"),
            line("l4", "s2", "Writing app/assistant.tsx"),
            ...later,
          ],
        }),
      );
    const rows = () =>
      Array.from(
        screen
          .getByRole("list", { name: "Installation steps" })
          .querySelectorAll(":scope > li"),
      ) as HTMLElement[];
    const centered = () =>
      scrollIntoView.mock.contexts.map(
        (element) => (element as HTMLElement).querySelector("p")!.textContent,
      );
    scrollIntoView.mockClear();
    const { rerender } = render(
      <SetupWizard checkout={installing("active", "pending")} />,
    );
    const [first, second, third] = rows();
    const doneToggle = within(first!).getByRole("button", {
      name: "1 line from Claude Code for Add the route",
    });
    expect(doneToggle.getAttribute("aria-expanded")).toBe("false");
    expect(within(first!).queryByRole("log")).toBeNull();
    const liveToggle = within(second!).getByRole("button", {
      name: "2 lines from Claude Code for Wire the runtime",
    });
    expect(liveToggle.getAttribute("aria-expanded")).toBe("true");
    const live = within(second!).getByRole("log");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(
      within(live)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Installing @assistant-ui/react", "Writing app/assistant.tsx"]);
    expect(within(third!).queryByRole("button")).toBeNull();
    expect(centered()).toEqual(["Wire the runtime"]);

    fireEvent.click(doneToggle);
    expect(
      within(within(first!).getByRole("log"))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Created app/api/chat/route.ts"]);
    expect(within(first!).getByRole("log").getAttribute("aria-live")).toBe(
      "off",
    );

    const wrapped = line("l5", "s2", "Wrapped the app in the runtime provider");
    rerender(
      <SetupWizard checkout={installing("active", "pending", wrapped)} />,
    );
    expect(centered()).toEqual(["Wire the runtime", "Wire the runtime"]);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "center" });
    rerender(
      <SetupWizard
        checkout={installing(
          "active",
          "pending",
          wrapped,
          line("l6", "s1", "Re-exported the route handler"),
        )}
      />,
    );
    expect(centered()).toEqual(["Wire the runtime", "Wire the runtime"]);

    rerender(<SetupWizard checkout={installing("done", "active")} />);
    expect(
      within(rows()[1]!)
        .getByRole("button", { name: /^2 lines from Claude Code/ })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      within(rows()[0]!)
        .getByRole("button", { name: /^1 line from Claude Code/ })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("mounts the running step's log before its first line, so a screen reader announces that line too", () => {
    const step = (
      id: string,
      title: string,
      status: Checkout.StepStatus,
    ): Checkout.Step => ({ id, title, status, createdAt: 0 });
    const installing = (...log: Checkout.LogEntry[]) =>
      context(
        connected({
          status: "installing",
          steps: [
            step("s1", "Add the route", "done"),
            step("s2", "Wire the runtime", "active"),
          ],
          log,
        }),
      );
    const rows = () =>
      Array.from(
        screen
          .getByRole("list", { name: "Installation steps" })
          .querySelectorAll(":scope > li"),
      ) as HTMLElement[];
    const { rerender } = render(<SetupWizard checkout={installing()} />);
    const [done, running] = rows();
    expect(within(done!).queryByRole("log")).toBeNull();
    expect(within(done!).queryByRole("button")).toBeNull();
    const log = within(running!).getByRole("log");
    expect(log.getAttribute("aria-live")).toBe("polite");
    expect(log.textContent).toBe("");
    expect(log.className).toBe("sr-only");
    expect(within(running!).queryByRole("button")).toBeNull();

    rerender(
      <SetupWizard
        checkout={installing({
          id: "l1",
          role: "agent",
          phase: "installing",
          at: 1,
          text: "Installing @assistant-ui/react",
          stepId: "s2",
        })}
      />,
    );
    const row = rows()[1]!;
    expect(within(row).getByRole("log")).toBe(log);
    expect(log.className).not.toContain("sr-only");
    expect(log.className).toContain("bg-muted");
    expect(
      within(log)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Installing @assistant-ui/react"]);
    expect(
      within(row)
        .getByRole("button", {
          name: "1 line from Claude Code for Wire the runtime",
        })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  describe("following the step in progress", () => {
    const step = (id: string, status: Checkout.StepStatus): Checkout.Step => ({
      id,
      title: `Step ${id.slice(1)}`,
      status,
      createdAt: 0,
    });
    const installing = (activeId: "s1" | "s2", lines: string[]) =>
      context(
        connected({
          status: "installing",
          steps: [
            step("s1", activeId === "s1" ? "active" : "done"),
            step("s2", activeId === "s2" ? "active" : "pending"),
          ],
          log: lines.map((stepId, index): Checkout.LogEntry => ({
            id: `l${index + 1}`,
            role: "agent",
            phase: "installing",
            at: index + 1,
            text: `Line ${index + 1}`,
            stepId,
          })),
        }),
      );
    const stream = (count: number) =>
      installing(
        "s1",
        Array.from({ length: count }, () => "s1"),
      );
    const centered = () =>
      scrollIntoView.mock.contexts.map(
        (element) =>
          within(element as HTMLElement).getByText(/^Step \d$/).textContent,
      );
    const row = () => screen.getByRole("listitem", { current: "step" });

    it("re-centers the row once its unfold animation ends, even when the unfolding pushed it out of view, unless the reader has paused following", () => {
      const observer = observeRow();
      scrollIntoView.mockClear();
      const { rerender } = render(<SetupWizard checkout={stream(1)} />);
      expect(centered()).toEqual(["Step 1"]);
      const list = screen.getByRole("list", { name: "Installation steps" });
      // jsdom has no AnimationEvent, so the name is pinned onto a plain event.
      const animationEnd = (animationName: string) => {
        const event = createEvent.animationEnd(row());
        Object.defineProperty(event, "animationName", { value: animationName });
        fireEvent(row(), event);
      };

      animationEnd("fade-in");
      expect(centered()).toEqual(["Step 1"]);

      animationEnd("unfold");
      expect(centered()).toEqual(["Step 1", "Step 1"]);

      observer.intersect(false);
      animationEnd("unfold");
      expect(centered()).toEqual(["Step 1", "Step 1", "Step 1"]);
      rerender(<SetupWizard checkout={stream(2)} />);
      expect(centered()).toEqual(["Step 1", "Step 1", "Step 1", "Step 1"]);

      fireEvent.wheel(list);
      animationEnd("unfold");
      expect(centered()).toEqual(["Step 1", "Step 1", "Step 1", "Step 1"]);
    });

    it("ignores the unfold of a step the agent adds later, so it does not pull a reader back", () => {
      const observer = observeRow();
      scrollIntoView.mockClear();
      const { rerender } = render(<SetupWizard checkout={stream(1)} />);
      expect(centered()).toEqual(["Step 1"]);
      observer.intersect(false);

      rerender(
        <SetupWizard
          checkout={context(
            connected({
              status: "installing",
              steps: [
                step("s1", "active"),
                step("s2", "pending"),
                step("s3", "pending"),
              ],
              log: [
                {
                  id: "l1",
                  role: "agent",
                  phase: "installing",
                  at: 1,
                  text: "Line 1",
                  stepId: "s1",
                },
              ],
            }),
          )}
        />,
      );
      const added = screen.getByText("Step 3").closest("li")!;
      const event = createEvent.animationEnd(added);
      Object.defineProperty(event, "animationName", { value: "unfold" });
      fireEvent(added, event);
      expect(centered()).toEqual(["Step 1"]);
    });

    it("re-centers the row on every line of a sustained stream while it stays in view", () => {
      const observer = observeRow();
      scrollIntoView.mockClear();
      const { rerender } = render(<SetupWizard checkout={stream(1)} />);
      expect(observer.observed()).toBe(row());
      observer.intersect(true);
      for (let count = 2; count <= 10; count += 1) {
        rerender(<SetupWizard checkout={stream(count)} />);
        observer.intersect(true);
      }
      expect(centered()).toEqual(Array.from({ length: 10 }, () => "Step 1"));
    });

    it("stays put once the row has scrolled out of view and follows again when the step changes", () => {
      const observer = observeRow();
      scrollIntoView.mockClear();
      const { rerender } = render(<SetupWizard checkout={stream(1)} />);
      expect(centered()).toEqual(["Step 1"]);
      observer.intersect(false);
      rerender(<SetupWizard checkout={stream(2)} />);
      expect(centered()).toEqual(["Step 1"]);

      rerender(<SetupWizard checkout={installing("s2", ["s1", "s1", "s2"])} />);
      expect(centered()).toEqual(["Step 1", "Step 2"]);
      expect(observer.observed()).toBe(row());
      rerender(
        <SetupWizard checkout={installing("s2", ["s1", "s1", "s2", "s2"])} />,
      );
      expect(centered()).toEqual(["Step 1", "Step 2", "Step 2"]);
    });

    it("pauses once the reader moves the list and resumes when the row is fully back in view", () => {
      const observer = observeRow();
      scrollIntoView.mockClear();
      const { rerender } = render(<SetupWizard checkout={stream(1)} />);
      expect(centered()).toEqual(["Step 1"]);
      expect(observer.options()).toEqual({ threshold: [0, 1] });
      const list = screen.getByRole("list", { name: "Installation steps" });

      fireEvent.wheel(list);
      rerender(<SetupWizard checkout={stream(2)} />);
      expect(centered()).toEqual(["Step 1"]);
      observer.intersect(true, 0.5);
      rerender(<SetupWizard checkout={stream(3)} />);
      expect(centered()).toEqual(["Step 1"]);

      observer.intersect(true);
      rerender(<SetupWizard checkout={stream(4)} />);
      expect(centered()).toEqual(["Step 1", "Step 1"]);

      fireEvent.wheel(list);
      rerender(
        <SetupWizard
          checkout={installing("s2", ["s1", "s1", "s1", "s1", "s2"])}
        />,
      );
      expect(centered()).toEqual(["Step 1", "Step 1", "Step 2"]);
    });

    it("pauses when the reader scrolls the list with the keyboard", () => {
      const observer = observeRow();
      scrollIntoView.mockClear();
      const { rerender } = render(<SetupWizard checkout={stream(1)} />);
      expect(centered()).toEqual(["Step 1"]);
      const list = screen.getByRole("list", { name: "Installation steps" });

      fireEvent.keyDown(list, { key: "a" });
      rerender(<SetupWizard checkout={stream(2)} />);
      expect(centered()).toEqual(["Step 1", "Step 1"]);

      fireEvent.keyDown(
        within(row()).getByRole("button", {
          name: "2 lines from Claude Code for Step 1",
        }),
        { key: " " },
      );
      rerender(<SetupWizard checkout={stream(3)} />);
      expect(centered()).toEqual(["Step 1", "Step 1", "Step 1"]);

      fireEvent.keyDown(list, { key: "PageUp" });
      rerender(<SetupWizard checkout={stream(4)} />);
      expect(centered()).toEqual(["Step 1", "Step 1", "Step 1"]);

      observer.intersect(true);
      rerender(<SetupWizard checkout={stream(5)} />);
      expect(centered()).toEqual(["Step 1", "Step 1", "Step 1", "Step 1"]);
    });

    it("pauses on a press on the list itself but not on a step's disclosure", () => {
      observeRow();
      scrollIntoView.mockClear();
      const { rerender } = render(<SetupWizard checkout={stream(1)} />);
      expect(centered()).toEqual(["Step 1"]);
      const list = screen.getByRole("list", { name: "Installation steps" });

      fireEvent.pointerDown(
        within(row()).getByRole("button", {
          name: "1 line from Claude Code for Step 1",
        }),
      );
      rerender(<SetupWizard checkout={stream(2)} />);
      expect(centered()).toEqual(["Step 1", "Step 1"]);

      fireEvent.pointerDown(list);
      rerender(<SetupWizard checkout={stream(3)} />);
      expect(centered()).toEqual(["Step 1", "Step 1"]);
    });

    it("keeps following when the reader scrolls inside the running step's panel, as long as the panel itself can scroll", () => {
      observeRow();
      scrollIntoView.mockClear();
      const { rerender } = render(<SetupWizard checkout={stream(1)} />);
      expect(centered()).toEqual(["Step 1"]);
      const log = within(row()).getByRole("log");
      Object.defineProperty(log, "scrollHeight", { value: 400 });
      Object.defineProperty(log, "clientHeight", { value: 160 });

      fireEvent.wheel(log);
      rerender(<SetupWizard checkout={stream(2)} />);
      expect(centered()).toEqual(["Step 1", "Step 1"]);
    });

    it("pauses when the reader wheels over a panel that does not scroll, since the list takes that scroll", () => {
      observeRow();
      scrollIntoView.mockClear();
      const { rerender } = render(<SetupWizard checkout={stream(1)} />);
      expect(centered()).toEqual(["Step 1"]);

      fireEvent.wheel(within(row()).getByRole("log"));
      rerender(<SetupWizard checkout={stream(2)} />);
      expect(centered()).toEqual(["Step 1"]);
    });
  });

  it("fills the install bar with time within the current step and snaps to the step count when one completes", () => {
    const step = (id: string, status: Checkout.StepStatus): Checkout.Step => ({
      id,
      title: `Step ${id.slice(1)}`,
      status,
      createdAt: 0,
    });
    const installing = (steps: Checkout.Step[]) =>
      context(connected({ status: "installing", steps }));
    const value = () =>
      Number(screen.getByRole("progressbar").getAttribute("aria-valuenow"));
    vi.useFakeTimers();
    const { rerender } = render(<SetupWizard checkout={installing([])} />);
    expect(value()).toBe(0);
    act(() => vi.advanceTimersByTime(10_000));
    const planned = value();
    expect(planned).toBeGreaterThan(0);
    act(() => vi.advanceTimersByTime(10_000));
    expect(value()).toBeGreaterThan(planned);
    expect(value()).toBeLessThan(100);

    const running = (first: Checkout.StepStatus, second: Checkout.StepStatus) =>
      installing([step("s1", "done"), step("s2", first), step("s3", second)]);
    rerender(<SetupWizard checkout={running("active", "pending")} />);
    expect(value()).toBe(33);
    act(() => vi.advanceTimersByTime(10_000));
    const partial = value();
    expect(partial).toBeGreaterThan(33);
    expect(partial).toBeLessThan(67);
    act(() => vi.advanceTimersByTime(60_000));
    expect(value()).toBeGreaterThan(partial);
    expect(value()).toBeLessThan(67);

    rerender(<SetupWizard checkout={running("done", "active")} />);
    expect(value()).toBe(67);
    act(() => vi.advanceTimersByTime(5_000));
    expect(value()).toBeGreaterThan(67);
    vi.useRealTimers();
  });

  it("tells what the agent is doing in the footer's corner once it has connected", () => {
    const indicator = () => screen.getByTestId("agent-indicator").title;
    const { rerender } = render(
      <SetupWizard checkout={context(initialCheckoutState(), false)} />,
    );
    expect(screen.queryByTestId("agent-indicator")).toBeNull();
    rerender(
      <SetupWizard
        checkout={context({
          ...initialCheckoutState(),
          status: "installing",
          agent: {
            ...initialCheckoutState().agent,
            kind: "claude-code",
            lastSeenAt: 1,
          },
        })}
      />,
    );
    expect(indicator()).toBe("Claude Code is working");
    rerender(
      <SetupWizard
        checkout={context({
          ...initialCheckoutState(),
          status: "planning",
          agent: {
            ...initialCheckoutState().agent,
            kind: "claude-code",
            lastSeenAt: 1,
          },
          inputs: [
            {
              id: "q1",
              prompt: "Which framework?",
              kind: "text",
              phase: "planning",
              optional: false,
              status: "open",
              createdAt: 1,
            },
          ],
        })}
      />,
    );
    expect(indicator()).toBe("Claude Code needs you");
  });

  it("covers the wizard with an undismissable dialog until the agent reconnects", async () => {
    const { rerender } = render(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), false)}
      />,
    );
    const dialog = screen.getByRole("dialog", {
      name: "Claude Code disconnected",
    });
    expect(dialog.textContent).toContain("picks up where it left off");
    expect(dialog.textContent).toContain("npx setup-agent");
    expect(
      within(dialog)
        .getAllByRole("button")
        .map(
          (button) => button.getAttribute("aria-label") ?? button.textContent,
        ),
    ).toEqual(["Copy prompt", "More options"]);
    expect(within(dialog).queryByRole("button", { name: "Close" })).toBeNull();
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.pointerDown(document.body);
    fireEvent.click(document.body);
    expect(screen.getByRole("dialog")).toBe(dialog);
    rerender(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), true)}
      />,
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("leaves the setup running from the disconnected dialog", async () => {
    const leaveSetup = vi.fn();
    render(
      <SetupNavigationContext.Provider
        value={{
          enterSetup: () => {},
          leaveSetup,
          resumeHint: false,
          dismissResumeHint: () => {},
        }}
      >
        <SetupWizard
          checkout={context(connected({ status: "planning" }), false)}
        />
      </SetupNavigationContext.Provider>,
    );
    const dialog = screen.getByRole("dialog", {
      name: "Claude Code disconnected",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "More options" }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "Leave, setup keeps running",
      }),
    );
    expect(leaveSetup).toHaveBeenCalledOnce();
    expect(commands["checkout/cancel"]).not.toHaveBeenCalled();
    expect(abandonCheckout).not.toHaveBeenCalled();
  });

  it("ends the setup from the disconnected dialog once confirmed", async () => {
    render(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), false)}
      />,
    );
    const dialog = screen.getByRole("dialog", {
      name: "Claude Code disconnected",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "More options" }),
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "End setup" }));
    const confirm = await screen.findByRole("dialog", {
      name: "End this setup?",
    });
    expect(commands["checkout/cancel"]).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole("button", { name: "End setup" }));
    await waitFor(() => expect(commands["checkout/cancel"]).toHaveBeenCalled());
    await waitFor(() => expect(abandonCheckout).toHaveBeenCalled());
  });

  it("drops the end confirmation when the agent reconnects", async () => {
    const { rerender } = render(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), false)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "End setup" }));
    await screen.findByRole("dialog", { name: "End this setup?" });
    rerender(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), true)}
      />,
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    rerender(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), false)}
      />,
    );
    await screen.findByRole("dialog", { name: "Claude Code disconnected" });
    expect(
      screen.queryByRole("dialog", { name: "End this setup?" }),
    ).toBeNull();
    expect(commands["checkout/cancel"]).not.toHaveBeenCalled();
  });

  it("puts a question's answer on the Next button and sends it from the footer", async () => {
    const state = connected({
      status: "planning",
      inputs: [
        {
          id: "q1",
          prompt: "Which route?",
          kind: "text",
          phase: "planning",
          optional: true,
          status: "open",
          createdAt: 2,
        },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Which route?",
    );
    const next = footer().getByRole("button", { name: "Next" });
    expect(next).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByRole("textbox", { name: "Which route?" }), {
      target: { value: "/api/chat" },
    });
    expect(next).toHaveProperty("disabled", false);
    fireEvent.click(next);
    await waitFor(() =>
      expect(commands["checkout/answer"]).toHaveBeenCalledWith({
        inputId: "q1",
        answer: "/api/chat",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Skip this question" }));
    await waitFor(() =>
      expect(commands["checkout/dismiss"]).toHaveBeenCalledWith({
        inputId: "q1",
      }),
    );
  });

  it("walks a model question's steps with the footer's Back and Next", async () => {
    const state = connected({
      status: "planning",
      inputs: [
        {
          id: "model",
          prompt: "Which model?",
          kind: "model",
          phase: "planning",
          options: [{ id: "openai", label: "OpenAI" }],
          default: "openai",
          optional: false,
          status: "open",
          createdAt: 2,
        },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    expect(footer().getByRole("button", { name: "Next" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Test key" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Which model?",
    );
    expect(screen.queryByRole("button", { name: "Test key" })).toBeNull();
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Skip, I’ll add it myself" }),
    );
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "gpt-5" },
    });
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(commands["checkout/answer"]).toHaveBeenCalledWith({
        inputId: "model",
        answer: JSON.stringify({ provider: "openai", model: "gpt-5" }),
      }),
    );
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  });

  it("cancels from the footer after confirming and returns the products to the cart", async () => {
    render(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), true, true)}
      />,
    );
    fireEvent.click(footer().getByRole("button", { name: "Cancel" }));
    fireEvent.click(await screen.findByRole("button", { name: "End setup" }));
    await waitFor(() => expect(commands["checkout/cancel"]).toHaveBeenCalled());
    await waitFor(() => expect(abandonCheckout).toHaveBeenCalled());
    expect(finishCheckout).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/components/cart");
  });

  it("ends the setup without waiting on the session while the page has lost the connection to it", async () => {
    const cancel = vi.mocked(commands["checkout/cancel"]);
    cancel.mockClear();
    abandonCheckout.mockClear();
    push.mockClear();
    cancel.mockReturnValueOnce(new Promise<never>(() => {}));
    const onExit = vi.fn();
    render(
      <SetupWizard
        checkout={{
          ...context(connected({ status: "planning" }), true, true),
          degraded: true,
          connection: {
            status: "retrying",
            degraded: true,
            attempt: 3,
            reconnect: () => {},
          },
        }}
        onExit={onExit}
      />,
    );
    fireEvent.click(footer().getByRole("button", { name: "Cancel" }));
    fireEvent.click(await screen.findByRole("button", { name: "End setup" }));
    await waitFor(() => expect(abandonCheckout).toHaveBeenCalled());
    expect(cancel).toHaveBeenCalled();
    expect(onExit).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/components/cart");
  });

  it("waits for the cancel through a brief reconnect that has not outlasted the grace", async () => {
    const cancel = vi.mocked(commands["checkout/cancel"]);
    let deliver = () => {};
    cancel.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        deliver = resolve;
      }),
    );
    render(
      <SetupWizard
        checkout={{
          ...context(connected({ status: "planning" }), true, true),
          connection: {
            status: "retrying",
            degraded: false,
            attempt: 1,
            reconnect: () => {},
          },
        }}
      />,
    );
    fireEvent.click(footer().getByRole("button", { name: "Cancel" }));
    fireEvent.click(await screen.findByRole("button", { name: "End setup" }));
    await waitFor(() => expect(cancel).toHaveBeenCalled());
    expect(abandonCheckout).not.toHaveBeenCalled();
    deliver();
    await waitFor(() => expect(abandonCheckout).toHaveBeenCalled());
  });

  it("ends the setup locally when the connection drops while the cancel is pending", async () => {
    const cancel = vi.mocked(commands["checkout/cancel"]);
    cancel.mockReturnValueOnce(new Promise<never>(() => {}));
    const checkout = context(connected({ status: "planning" }), true, true);
    const { rerender } = render(<SetupWizard checkout={checkout} />);
    fireEvent.click(footer().getByRole("button", { name: "Cancel" }));
    fireEvent.click(await screen.findByRole("button", { name: "End setup" }));
    await waitFor(() => expect(cancel).toHaveBeenCalled());
    expect(abandonCheckout).not.toHaveBeenCalled();
    rerender(<SetupWizard checkout={{ ...checkout, degraded: true }} />);
    await waitFor(() => expect(abandonCheckout).toHaveBeenCalled());
  });

  it("asks before ending the setup on Escape, unless the key was pressed inside a dialog", async () => {
    render(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), true, true)}
      />,
    );
    const cancel = vi.mocked(commands["checkout/cancel"]);
    cancel.mockClear();
    push.mockClear();
    fireEvent.keyDown(document.body, { key: "Escape" });
    const dialog = await screen.findByRole("dialog", {
      name: "End this setup?",
    });
    expect(cancel).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep going" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "End this setup?" }),
      ).toBeNull(),
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    const again = await screen.findByRole("dialog", {
      name: "End this setup?",
    });
    fireEvent.click(within(again).getByRole("button", { name: "End setup" }));
    await waitFor(() => expect(cancel).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith("/components/cart");
  });

  it("keeps Cancel disabled while looking back at a finished setup", () => {
    const state = connected({
      status: "done",
      steps: [{ id: "s1", title: "Install", status: "done", createdAt: 4 }],
    });
    render(<SetupWizard checkout={context(state, false)} />);
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(footer().getByRole("button", { name: "Cancel" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("keeps Finish on the footer while the agent works on a follow-up", () => {
    const state = connected({
      status: "installing",
      completion: { proposedAt: 5 },
      log: [
        { id: "l1", role: "user", phase: "installing", at: 6, text: "More" },
      ],
      steps: [
        { id: "s1", title: "Add the route", status: "active", createdAt: 7 },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Installing",
    );
    expect(footer().getByRole("button", { name: "Finish" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("finishes from the footer once the agent proposes it and leaves the products installed", async () => {
    const state = connected({
      status: "installing",
      completion: { proposedAt: 5 },
    });
    render(<SetupWizard checkout={context(state, true, true)} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Claude Code finished",
    );
    fireEvent.click(footer().getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(commands["checkout/finish"]).toHaveBeenCalled());
    await waitFor(() => expect(finishCheckout).toHaveBeenCalled());
    expect(abandonCheckout).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/components");
  });

  it("installs the plan from the footer and moves change requests into the body", async () => {
    const state = connected({
      status: "planning",
      plans: [
        {
          revision: 1,
          markdown:
            "## What I found\n\n- **App:** Next.js\n\n## Steps\n\n1. Install chat",
          status: "proposed",
          submittedAt: 2,
        },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Review the plan",
    );
    expect(
      screen
        .getByRole("button", { name: /^Steps/ })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByText("Install chat")).toBeDefined();
    expect(screen.queryByText("Next.js")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /What I found/ }));
    expect(screen.getByText("Next.js")).toBeDefined();
    expect(screen.queryByText("Install chat")).toBeNull();
    const note = screen.getByPlaceholderText(
      "Add a note, or leave it empty to install as proposed.",
    );
    fireEvent.change(note, { target: { value: "Use Anthropic." } });
    expect(footer().getByRole("button", { name: "Send" })).toBeDefined();
    fireEvent.change(note, { target: { value: "" } });
    fireEvent.click(footer().getByRole("button", { name: "Install" }));
    await waitFor(() =>
      expect(commands["checkout/plan"]).toHaveBeenCalledWith({
        decision: "approve",
      }),
    );
  });

  it("steps back through earlier pages and forward again to the live one", () => {
    const state = connected({
      status: "installing",
      plans: [
        {
          revision: 1,
          markdown: "Install chat",
          status: "approved",
          submittedAt: 2,
          decidedAt: 3,
        },
      ],
      steps: [
        { id: "s1", title: "Add the route", status: "active", createdAt: 4 },
      ],
    });
    const { rerender } = render(<SetupWizard checkout={context(state)} />);
    const heading = () => screen.getByRole("heading", { level: 1 }).textContent;
    expect(heading()).toBe("Installing");
    expect(footer().getByRole("button", { name: "Next" })).toHaveProperty(
      "disabled",
      true,
    );

    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("The plan");
    expect(screen.getByText("Install chat")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Approve and install" }),
    ).toBeNull();

    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("Claude Code is connected");
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("Welcome to the setup wizard for assistant-ui");
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    expect(heading()).toBe("Installing");

    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("The plan");
    rerender(
      <SetupWizard
        checkout={context({
          ...state,
          inputs: [
            {
              id: "q2",
              prompt: "Which port?",
              kind: "text",
              phase: "installing",
              optional: false,
              status: "open",
              createdAt: 5,
            },
          ],
        })}
      />,
    );
    expect(heading()).toBe("Which port?");
  });

  it("steps back from a question to the answers already given", () => {
    const state = connected({
      status: "planning",
      inputs: [
        {
          id: "q1",
          prompt: "Which project?",
          kind: "text",
          phase: "planning",
          optional: false,
          status: "answered",
          answer: "/srv/app",
          note: "the monorepo root",
          createdAt: 2,
          answeredAt: 3,
        },
        {
          id: "q2",
          prompt: "Which framework?",
          kind: "choice",
          phase: "planning",
          options: [
            {
              id: "ai-sdk",
              label: "Vercel AI SDK",
              variants: [{ id: "typescript", label: "TypeScript" }],
            },
          ],
          optional: false,
          status: "answered",
          answer: "ai-sdk:typescript",
          createdAt: 4,
          answeredAt: 5,
        },
        {
          id: "q3",
          prompt: "Which port?",
          kind: "text",
          phase: "planning",
          optional: true,
          status: "open",
          createdAt: 6,
        },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    const heading = () => screen.getByRole("heading", { level: 1 }).textContent;
    expect(heading()).toBe("Which port?");
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("Your answer");
    expect(screen.getByText("Which framework?")).toBeDefined();
    expect(screen.getByText("Vercel AI SDK · TypeScript")).toBeDefined();
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(screen.getByText("/srv/app")).toBeDefined();
    expect(screen.getByText("Note: the monorepo root")).toBeDefined();
    fireEvent.click(footer().getByRole("button", { name: "Back" }));
    expect(heading()).toBe("Claude Code is connected");
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    fireEvent.click(footer().getByRole("button", { name: "Next" }));
    expect(heading()).toBe("Which port?");
  });

  it("ends with a Finish button once the setup is done", () => {
    render(
      <SetupWizard checkout={context(connected({ status: "done" }), false)} />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Setup complete",
    );
    expect(footer().getByRole("button", { name: "Finish" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(footer().getByRole("button", { name: "Cancel" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});

describe("SetupWizard messages", () => {
  const openMessages = () =>
    fireEvent.click(screen.getByRole("button", { name: /^Messages\./ }));

  it("opens the exchange from the footer avatar, without the lines the session writes for closed steps", async () => {
    const state = connected({
      status: "installing",
      steps: [
        { id: "s1", title: "Add the route", status: "done", createdAt: 4 },
        { id: "s2", title: "Add the thread", status: "active", createdAt: 5 },
      ],
      log: [
        {
          id: "l1",
          role: "agent",
          phase: "installing",
          stepId: "s1",
          at: 6,
          text: "Completed: Add the route\n\nRoute added",
        },
        {
          id: "l2",
          role: "user",
          phase: "installing",
          at: 7,
          text: "Use pnpm",
        },
        {
          id: "l3",
          role: "agent",
          phase: "installing",
          stepId: "s2",
          at: 8,
          text: "Switching to pnpm.",
        },
      ],
    });
    render(<SetupWizard checkout={context(state)} />);
    expect(screen.queryByRole("log", { name: "Messages" })).toBeNull();
    expect(
      screen.queryByRole("textbox", { name: "Message your agent" }),
    ).toBeNull();
    openMessages();
    const log = await screen.findByRole("log", { name: "Messages" });
    expect(log.textContent).toContain("You: Use pnpm");
    expect(log.textContent).toContain("Claude Code: Switching to pnpm.");
    expect(log.textContent).not.toContain("Completed: Add the route");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("textbox", { name: "Message your agent" }),
      ),
    );
  });

  it("counts the agent's replies that arrived while the messages were closed", async () => {
    const entry = (id: string, at: number, text: string) =>
      ({ id, role: "agent", phase: "installing", at, text }) as const;
    const { rerender } = render(
      <SetupWizard
        checkout={context(
          connected({ status: "installing", log: [entry("l1", 5, "Hi")] }),
        )}
      />,
    );
    const name = () => screen.getByTestId("agent-indicator").textContent;
    expect(name()).toBe("Messages. Claude Code is working.");
    rerender(
      <SetupWizard
        checkout={context(
          connected({
            status: "installing",
            log: [entry("l1", 5, "Hi"), entry("l2", 6, "Switching to pnpm.")],
          }),
        )}
      />,
    );
    expect(name()).toBe("1Messages. Claude Code is working. 1 unread.");
    openMessages();
    await screen.findByRole("log");
    expect(name()).toBe("Messages. Claude Code is working.");
  });

  it("badges a reply to the user, and a line posted while nothing else waits, but not chatter beside an open input", async () => {
    const entry = (
      id: string,
      role: "agent" | "user",
      at: number,
      text: string,
    ) => ({ id, role, phase: "installing", at, text }) as const;
    const input: Checkout.Input = {
      id: "i1",
      phase: "installing",
      kind: "text",
      prompt: "Which port?",
      optional: false,
      status: "open",
      createdAt: 6,
    };
    const first = entry("l1", "agent", 5, "Hi");
    const view = (log: Checkout.LogEntry[], inputs: Checkout.Input[] = []) => (
      <SetupWizard
        checkout={context(connected({ status: "installing", log, inputs }))}
      />
    );
    const { rerender } = render(view([first]));
    const name = () => screen.getByTestId("agent-indicator").textContent;
    rerender(
      view([first, entry("l2", "agent", 7, "Checking ports.")], [input]),
    );
    expect(name()).toBe("Messages. Claude Code needs you.");
    rerender(
      view(
        [
          first,
          entry("l2", "agent", 7, "Checking ports."),
          entry("l3", "user", 8, "Use 4000"),
          entry("l4", "agent", 9, "Switching to 4000."),
        ],
        [input],
      ),
    );
    expect(name()).toBe("1Messages. Claude Code needs you. 1 unread.");
    openMessages();
    await screen.findByRole("log");
    expect(name()).toBe("Messages. Claude Code needs you.");
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    rerender(
      view(
        [
          first,
          entry("l2", "agent", 7, "Checking ports."),
          entry("l3", "user", 8, "Use 4000"),
          entry("l4", "agent", 9, "Switching to 4000."),
          entry("l5", "agent", 11, "Done with the port."),
        ],
        [{ ...input, status: "answered", answer: "4000", answeredAt: 10 }],
      ),
    );
    await waitFor(() =>
      expect(name()).toBe("1Messages. Claude Code is working. 1 unread."),
    );
  });

  it("swaps the exploring title's verb while the agent works, holds it while the agent is away, and keeps the accessible name", () => {
    const heading = () =>
      screen.getByRole("heading", { level: 1, hidden: true });
    const verb = () => heading().querySelector("[aria-hidden]")!.textContent;
    vi.useFakeTimers();
    const { rerender } = render(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), true, false, {
          id: "exploring-title",
        })}
      />,
    );
    expect(verb()).toBe("Exploring");
    expect(heading().querySelector(".sr-only")!.textContent).toBe("Exploring");
    expect(heading().textContent).toContain(" your project");
    act(() => vi.advanceTimersByTime(2400));
    expect(verb()).toBe("Reading");
    act(() => vi.advanceTimersByTime(2400));
    expect(verb()).toBe("Mapping");
    expect(heading().querySelector(".sr-only")!.textContent).toBe("Exploring");
    rerender(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), false, false, {
          id: "exploring-title",
        })}
      />,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(verb()).toBe("Mapping");
    vi.useRealTimers();
  });

  it("cycles the exploring verbs back to the first", () => {
    vi.useFakeTimers();
    render(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), true, false, {
          id: "exploring-cycle",
        })}
      />,
    );
    const verb = () =>
      screen.getByRole("heading", { level: 1 }).querySelector("[aria-hidden]")!
        .textContent;
    const seen = new Set<string>();
    for (let swap = 0; swap < 7; swap++) {
      seen.add(verb()!);
      act(() => vi.advanceTimersByTime(2400));
    }
    expect(seen.size).toBe(7);
    expect(verb()).toBe("Exploring");
    vi.useRealTimers();
  });

  it("keeps the exploring title still under reduced motion", () => {
    reducedMotion = true;
    vi.useFakeTimers();
    render(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), true, false, {
          id: "exploring-title",
        })}
      />,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(
      screen.getByRole("heading", { level: 1 }).querySelector("[aria-hidden]")!
        .textContent,
    ).toBe("Exploring");
    vi.useRealTimers();
  });

  it("fills the exploring bar with time and holds it while the agent is away", () => {
    const bar = () =>
      screen.getByRole("progressbar", { name: "Exploring", hidden: true });
    vi.useFakeTimers();
    const { rerender } = render(
      <SetupWizard checkout={context(connected({ status: "planning" }))} />,
    );
    const start = Number(bar().getAttribute("aria-valuenow"));
    act(() => vi.advanceTimersByTime(5_000));
    const filled = Number(bar().getAttribute("aria-valuenow"));
    expect(filled).toBeGreaterThan(start);
    expect(filled).toBeLessThan(90);
    rerender(
      <SetupWizard
        checkout={context(connected({ status: "planning" }), false)}
      />,
    );
    act(() => vi.advanceTimersByTime(5_000));
    expect(Number(bar().getAttribute("aria-valuenow"))).toBe(filled);
    expect(bar().getAttribute("aria-valuetext")).toBe("Waiting for the agent");
    vi.useRealTimers();
  });
});

describe("SetupWizard analytics", () => {
  it("tracks each step once as the live page moves on", () => {
    const events = captureEvents();
    const { rerender } = render(
      <SetupWizard checkout={context(initialCheckoutState(), false)} />,
    );
    expect(events("setup_step_viewed")).toEqual([{ step: "welcome" }]);
    rerender(<SetupWizard checkout={context(initialCheckoutState(), false)} />);
    expect(events("setup_step_viewed")).toEqual([{ step: "welcome" }]);
    rerender(
      <SetupWizard
        checkout={context(
          { ...initialCheckoutState(), status: "planning" },
          true,
          false,
          { introSeen: true },
        )}
      />,
    );
    expect(events("setup_step_viewed")).toEqual([
      { step: "welcome" },
      { step: "connect" },
    ]);
  });

  it("tracks the agent connecting once, not every render while it stays connected", () => {
    const events = captureEvents();
    const { rerender } = render(
      <SetupWizard checkout={context(initialCheckoutState(), false)} />,
    );
    expect(events("setup_agent_connected")).toEqual([]);
    rerender(
      <SetupWizard checkout={context(connected({ status: "planning" }))} />,
    );
    rerender(
      <SetupWizard checkout={context(connected({ status: "planning" }))} />,
    );
    expect(events("setup_agent_connected")).toEqual([undefined]);
  });

  it("tracks the install finishing once the session is done", () => {
    const events = captureEvents();
    const { rerender } = render(
      <SetupWizard checkout={context(connected({ status: "installing" }))} />,
    );
    expect(events("setup_install_finished")).toEqual([]);
    rerender(
      <SetupWizard checkout={context(connected({ status: "done" }), false)} />,
    );
    rerender(
      <SetupWizard checkout={context(connected({ status: "done" }), false)} />,
    );
    expect(events("setup_install_finished")).toEqual([undefined]);
  });

  it("tracks a cancellation only once End setup is confirmed", async () => {
    const events = captureEvents();
    render(
      <SetupWizard checkout={context(connected({ status: "planning" }))} />,
    );
    fireEvent.click(footer().getByRole("button", { name: "Cancel" }));
    expect(events("setup_cancelled")).toEqual([]);
    fireEvent.click(await screen.findByRole("button", { name: "End setup" }));
    await waitFor(() => expect(abandonCheckout).toHaveBeenCalled());
    expect(events("setup_cancelled")).toEqual([undefined]);
  });
});
