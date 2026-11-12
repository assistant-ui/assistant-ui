// @vitest-environment jsdom

import { Profiler } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockTransport } from "statewire/testing";
import { fireEvent } from "@testing-library/react";
import { CheckoutProvider } from "./checkout-provider";
import { CheckoutView } from "@/components/wizard/checkout-view";
import { endCheckout } from "@/lib/checkout/session-store";
import { initialCheckoutState, type Checkout } from "@/lib/checkout/protocol";

const mock = vi.hoisted(() => ({
  transport: null as unknown as ReturnType<
    typeof createMockTransport<Checkout.State | undefined>
  >,
}));

vi.mock("statewire", async (importOriginal) => ({
  ...(await importOriginal<typeof import("statewire")>()),
  StatewireWebsocket: () => mock.transport.transport,
}));

afterEach(() => {
  cleanup();
  endCheckout();
  localStorage.clear();
  sessionStorage.clear();
});

window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }) as unknown as MediaQueryList;
Element.prototype.scrollIntoView = () => {};

const HEARTBEATS = 30;

const heading = () => screen.getByRole("heading", { level: 1 }).textContent;
const named = (name: string) => screen.getByRole("heading", { level: 1, name });

describe("agent link sequence", () => {
  it("asks before joining, then lands on the agent's questions in work bounded by the stream events", async () => {
    mock.transport = createMockTransport<Checkout.State | undefined>(undefined);
    window.history.replaceState(
      null,
      "",
      "/#link=abcdEFGH1234&setup=zyxw9876ABCD",
    );
    let commits = 0;
    render(
      <Profiler id="setup" onRender={() => void commits++}>
        <CheckoutProvider>
          <CheckoutView />
        </CheckoutProvider>
      </Profiler>,
    );
    expect(heading()).toBe("Waiting for your coding agent");
    // The fragment leaves the address bar at once.
    expect(window.location.hash).toBe("");

    const now = Date.now();
    const agent: Checkout.State["agent"] = {
      lastSeenAt: now,
      connected: true,
      cwd: "/app",
      kind: "claude",
      introducedAt: now,
    };
    const planning: Checkout.State = {
      ...initialCheckoutState(),
      id: "zyxw9876ABCD",
      status: "planning",
      createdAt: 1,
      products: [{ slug: "assistant-ui", name: "assistant-ui" }],
      agent,
    };
    await act(() => mock.transport.setState(planning));
    await waitFor(() =>
      expect(heading()).toBe(
        "Connect this browser to the coding agent running in /app on Claude Code?",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    await waitFor(() => expect(named("Exploring your project")).toBeTruthy());
    expect(screen.getByTestId("agent-connection").textContent).toBe(
      "Connected to Claude Code in /app",
    );
    const settled = commits;

    for (let beat = 1; beat <= HEARTBEATS; beat++) {
      await act(() =>
        mock.transport.setState({
          ...planning,
          agent: { ...agent, lastSeenAt: now + beat * 5000 },
        }),
      );
    }
    expect(named("Exploring your project")).toBeTruthy();
    expect(commits - settled).toBeLessThanOrEqual(HEARTBEATS * 3);

    const asked = commits;
    await act(() =>
      mock.transport.setState({
        ...planning,
        inputs: [
          {
            phase: "planning",
            id: "q1",
            kind: "model",
            preset: "llm-provider",
            prompt: "Which model should the assistant use?",
            options: [
              { id: "openai", label: "OpenAI" },
              { id: "anthropic", label: "Anthropic" },
            ],
            optional: false,
            status: "open",
            createdAt: now,
          },
        ],
      }),
    );
    await waitFor(() =>
      expect(heading()).toBe("Which model should the assistant use?"),
    );
    expect(commits - asked).toBeLessThanOrEqual(10);
  });

  it("shows the prompt that starts a setup when no agent opened the page", () => {
    mock.transport = createMockTransport<Checkout.State | undefined>(undefined);
    window.history.replaceState(null, "", "/");
    render(
      <CheckoutProvider>
        <CheckoutView />
      </CheckoutProvider>,
    );
    expect(heading()).toBe("Set up assistant-ui with your coding agent");
    expect(
      screen.getByRole("button", {
        name: "Copy the setup prompt for your coding agent",
      }).textContent,
    ).toBe("install and set up assistant-ui");
    expect(
      screen
        .getByRole("link", { name: "Install manually" })
        .getAttribute("href"),
    ).toBe("https://www.assistant-ui.com/docs/manual-installation");
  });
});
