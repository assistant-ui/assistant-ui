// @vitest-environment jsdom

import { Profiler } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockTransport } from "statewire/testing";
import { CheckoutProvider } from "./checkout-provider";
import { SetupNavigationProvider } from "./setup-navigation";
import { CheckoutView } from "../pages/shop/checkout-view";
import { SetupBackdropButton } from "../pages/shop/setup-back-button";
import {
  initialCheckoutState,
  type Checkout,
} from "../../lib/checkout/protocol";

const mock = vi.hoisted(() => ({
  transport: null as unknown as ReturnType<
    typeof createMockTransport<Checkout.State | undefined>
  >,
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/shop/setup",
}));

vi.mock("statewire", async (importOriginal) => ({
  ...(await importOriginal<typeof import("statewire")>()),
  StatewireWebsocket: () => mock.transport.transport,
}));

import {
  acceptSetupLicense,
  acknowledgeSetupIntro,
  startCheckout,
} from "../../lib/checkout/session-store";

afterEach(cleanup);

const HEARTBEATS = 30;

const heading = () => screen.getByRole("heading", { level: 1 }).textContent;

describe("checkout connect sequence", () => {
  it("renders each step in work bounded by the stream events", async () => {
    mock.transport = createMockTransport<Checkout.State | undefined>(undefined);
    const session = startCheckout(["assistant-ui"])!;
    acknowledgeSetupIntro();
    acceptSetupLicense();
    let commits = 0;
    render(
      <Profiler id="setup" onRender={() => void commits++}>
        <SetupNavigationProvider>
          <CheckoutProvider>
            <SetupBackdropButton />
            <CheckoutView />
          </CheckoutProvider>
        </SetupNavigationProvider>
      </Profiler>,
    );
    const waiting: Checkout.State = {
      ...initialCheckoutState(),
      id: session.id,
      status: "waiting",
      createdAt: 1,
      products: [{ slug: "assistant-ui", name: "assistant-ui" }],
    };
    await act(() => mock.transport.setState(waiting));
    await waitFor(() => expect(heading()).toBe("Connect your coding agent"));

    const now = Date.now();
    const agent: Checkout.State["agent"] = {
      lastSeenAt: now,
      connected: true,
      cwd: "/app",
      kind: "claude",
      introducedAt: now,
    };
    await act(() => mock.transport.setState({ ...waiting, agent }));
    await waitFor(() => expect(heading()).toBe("Claude Code is connected"));
    const settled = commits;

    for (let beat = 1; beat <= HEARTBEATS; beat++) {
      await act(() =>
        mock.transport.setState({
          ...waiting,
          agent: { ...agent, lastSeenAt: now + beat * 5000 },
        }),
      );
    }
    expect(heading()).toBe("Claude Code is connected");
    expect(screen.getByRole("button", { name: /^Next/ })).toHaveProperty(
      "disabled",
      false,
    );
    expect(commits - settled).toBeLessThanOrEqual(HEARTBEATS * 3);

    const asked = commits;
    await act(() =>
      mock.transport.setState({
        ...waiting,
        status: "planning",
        agent,
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
});
