import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answerNeed } from "./needs";
import { initialCheckoutState } from "./protocol";
import type { Checkout } from "./protocol";
import { followSetup } from "./stream";
import type { StreamEvent } from "./stream";

const PAGE = "https://setup.test/#link=abc&setup=s1";
const ANSWER = "npx assistant-ui@latest setup https://checkout.test/abc answer";

/** A client whose state the test changes, notifying like a statewire client. */
const fakeClient = () => {
  let state: Checkout.State = {
    ...initialCheckoutState(),
    id: "s1",
    createdAt: 1,
    status: "planning",
  };
  const listeners = new Set<() => void>();
  const calls: string[] = [];
  const change = (mutate: (draft: Checkout.State) => void) => {
    const draft = structuredClone(state);
    mutate(draft);
    state = draft;
    for (const listener of listeners) listener();
  };
  const commands = new Proxy(
    {},
    {
      get:
        (_, name: string) =>
        async (params: { inputId: string; answer: string }) => {
          calls.push(name);
          if (name === "checkout/answer")
            change((draft) => {
              const input = draft.inputs.find(
                (entry) => entry.id === params.inputId,
              )!;
              input.status = "answered";
              input.answer = params.answer;
            });
        },
    },
  );
  return {
    client: {
      get state() {
        return state;
      },
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      commands,
    } as unknown as Parameters<typeof followSetup>[0],
    calls,
    change,
    ask: (prompt: string) =>
      change((draft) => {
        draft.inputs.push({
          id: `q${draft.inputs.length + 1}`,
          phase: "planning",
          kind: "choice",
          prompt,
          options: [
            { id: "pnpm", label: "pnpm" },
            { id: "npm", label: "npm" },
          ],
          optional: false,
          status: "open",
          createdAt: Date.now(),
        });
      }),
    heartbeat: () =>
      change((draft) => {
        draft.browser = { lastSeenAt: Date.now(), connected: true };
      }),
  };
};

describe("followSetup", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 1_000_000 });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const start = async () => {
    const fake = fakeClient();
    const lines: StreamEvent[][] = [];
    const open = vi.fn();
    const stream = await followSetup(fake.client, {
      print: (events) => lines.push(events),
      agent: { cwd: "/app", kind: "claude" },
      browser: {
        setupAppUrl: "https://setup.test",
        linkId: "abc",
        answerCommand: ANSWER,
        open,
      },
    });
    const events = () => lines.flat();
    return { ...fake, stream, open, events };
  };

  it("says hello, keeps a heartbeat, and opens no browser before a question", async () => {
    const t = await start();
    expect(t.calls).toEqual(["agent/hello"]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(t.open).not.toHaveBeenCalled();
    expect(t.calls.filter((name) => name === "agent/heartbeat")).toHaveLength(
      12,
    );
    expect(t.events()).toEqual([]);
    await t.stream.stop();
    expect(t.calls.at(-1)).toBe("agent/bye");
  });

  it("opens the page for the first question, reopens after a close, guards within 30s, and finishes from the agent", async () => {
    const t = await start();

    t.ask("Which package manager?");
    await vi.advanceTimersByTimeAsync(300);
    expect(t.open).toHaveBeenCalledTimes(1);
    expect(t.open).toHaveBeenCalledWith(PAGE);
    expect(t.events()).toEqual([
      {
        event: "browser.opened",
        id: "q1",
        url: PAGE,
        message:
          'Opened the setup in the user\'s browser for "Which package manager?". Tell the user once that it is waiting there. The answer arrives on this stream.',
      },
    ]);

    // The page joins, the user answers there and closes the tab.
    await vi.advanceTimersByTimeAsync(2_000);
    t.heartbeat();
    t.change((draft) => {
      draft.inputs[0]!.status = "answered";
      draft.inputs[0]!.answer = "pnpm";
    });
    await vi.advanceTimersByTimeAsync(40_000);
    expect(t.events().at(-1)).toMatchObject({
      event: "input.answered",
      inputId: "q1",
    });

    t.ask("Which lockfile?");
    await vi.advanceTimersByTimeAsync(300);
    expect(t.open).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(9_700);
    t.ask("Which registry?");
    await vi.advanceTimersByTimeAsync(300);
    expect(t.open).toHaveBeenCalledTimes(2);
    const needed = t.events().at(-1);
    expect(needed).toEqual({
      event: "input.needed",
      id: "q3",
      reason: "recently-opened",
      message:
        "A browser tab for setup was opened 10s ago. Wait for the user there, or ask the user directly in the terminal: Which registry? Options: pnpm (pnpm), npm (npm).",
      question: "Which registry?",
      options: [
        { id: "pnpm", label: "pnpm" },
        { id: "npm", label: "npm" },
      ],
      answerFormat: "one option id, or the user's own text",
      answer: `${ANSWER} q3 <one option id, or the user's own text>`,
    });

    // The agent asked in its own conversation and answers for the user.
    await answerNeed(t.client, "q3", "npm");
    await vi.advanceTimersByTimeAsync(300);
    expect(t.events().at(-1)).toMatchObject({
      event: "input.answered",
      inputId: "q3",
      answer: "npm",
    });
    await t.stream.stop();
  });

  it("tells the agent when the tab closed with a question waiting", async () => {
    const t = await start();
    t.ask("Which package manager?");
    await vi.advanceTimersByTimeAsync(1_000);
    t.heartbeat();
    t.change((draft) => {
      draft.browser!.connected = false;
    });
    await vi.advanceTimersByTimeAsync(8_000);
    expect(t.events().at(-1)).toMatchObject({
      event: "input.needed",
      id: "q1",
      reason: "browser-closed",
      message:
        "The user closed the setup tab. Ask the user directly in the terminal: Which package manager? Options: pnpm (pnpm), npm (npm).",
    });
    // A question right after: inside the 30s window, and the tab is known to be gone.
    t.ask("Which registry?");
    await vi.advanceTimersByTimeAsync(300);
    expect(t.events().at(-1)).toMatchObject({
      id: "q2",
      reason: "browser-closed",
    });
    await t.stream.stop();
  });

  it("without browser options, streams the way setup-agent always has", async () => {
    const fake = fakeClient();
    const lines: StreamEvent[][] = [];
    const stream = await followSetup(fake.client, {
      print: (events) => lines.push(events),
      agent: { cwd: "/app" },
    });
    fake.ask("Which package manager?");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(lines).toEqual([]);
    await stream.stop();
  });
});
