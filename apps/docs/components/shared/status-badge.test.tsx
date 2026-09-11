// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StatusBadge } from "./status-badge";

const respondWith = (body: unknown, ok = true) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve(body) })),
  );
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("StatusBadge", () => {
  it("renders the plain link while the request is still in flight", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    render(<StatusBadge />);
    await settle();

    const link = screen.getByRole("link");
    expect(link.textContent).toBe("Status");
    expect(link.querySelector("span")).toBeNull();
  });

  it.each([
    ["operational", "All systems operational", "bg-emerald-500"],
    ["degraded", "Degraded performance", "bg-amber-500"],
    ["downtime", "Service disruption", "bg-red-500"],
    ["maintenance", "Under maintenance", "bg-blue-500"],
  ])("labels %s with its own dot", async (state, label, dot) => {
    respondWith({ state });
    render(<StatusBadge />);

    const link = await screen.findByRole("link", { name: label });
    expect(link.querySelector("span")?.className).toContain(dot);
  });

  it("keeps the plain link when the route reports the state unavailable", async () => {
    respondWith({ error: "status unavailable" }, false);
    render(<StatusBadge />);
    await settle();

    const link = screen.getByRole("link");
    expect(link.textContent).toBe("Status");
    expect(link.querySelector("span")).toBeNull();
  });

  it("keeps the plain link for a state it has no presentation for", async () => {
    respondWith({ state: "unknown_state" });
    render(<StatusBadge />);
    await settle();

    const link = screen.getByRole("link");
    expect(link.textContent).toBe("Status");
    expect(link.querySelector("span")).toBeNull();
  });
});
