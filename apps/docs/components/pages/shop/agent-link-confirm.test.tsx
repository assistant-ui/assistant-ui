// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  initialCheckoutState,
  type Checkout,
} from "../../../lib/checkout/protocol";
import { AgentLinkConfirm, presentAgent } from "./agent-link-confirm";

const wire = vi.hoisted(() => ({
  state: undefined as unknown,
  url: "",
}));

vi.mock("statewire", async (importOriginal) => ({
  ...(await importOriginal<typeof import("statewire")>()),
  StatewireWebsocket: ({ url }: { url: string }) => {
    wire.url = url;
    return {};
  },
  useStatewire: () => ({ state: wire.state, commands: {} }),
}));

afterEach(cleanup);

const withAgent = (
  agent: Partial<Checkout.State["agent"]>,
): Checkout.State => ({
  ...initialCheckoutState(),
  id: "s1",
  status: "planning",
  createdAt: 1,
  agent: { ...initialCheckoutState().agent, ...agent },
});

describe("presentAgent", () => {
  it("names an agent only once it is running and has said where", () => {
    expect(presentAgent(undefined)).toBeUndefined();
    expect(
      presentAgent(withAgent({ introducedAt: 1, kind: "claude" })),
    ).toBeUndefined();
    expect(
      presentAgent(
        withAgent({
          lastSeenAt: Date.now() - 60_000,
          cwd: "/app",
          connected: true,
        }),
      ),
    ).toBeUndefined();
    expect(
      presentAgent(
        withAgent({
          lastSeenAt: Date.now(),
          connected: true,
          cwd: "/app",
          kind: "codex",
        }),
      ),
    ).toEqual({ cwd: "/app", name: "Codex" });
  });
});

describe("AgentLinkConfirm", () => {
  it("waits for the agent before offering to connect", () => {
    wire.state = withAgent({ introducedAt: 1 });
    const onCancel = vi.fn();
    render(
      <AgentLinkConfirm
        link="abcdEFGH1234"
        onConnect={vi.fn()}
        onCancel={onCancel}
      />,
    );
    expect(wire.url).toMatch(/\/abcdEFGH1234$/);
    expect(
      screen.getByRole("heading", { name: "Waiting for your coding agent" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Connect" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("asks to connect to the running agent by its directory and kind", () => {
    wire.state = withAgent({
      lastSeenAt: Date.now(),
      connected: true,
      cwd: "/Users/me/app",
      kind: "claude",
    });
    const onConnect = vi.fn();
    render(
      <AgentLinkConfirm
        link="abcdEFGH1234"
        onConnect={onConnect}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading").textContent).toBe(
      "Connect this browser to the coding agent running in /Users/me/app on Claude Code?",
    );
    expect(screen.getByText(/including API keys/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(onConnect).toHaveBeenCalled();
  });
});
