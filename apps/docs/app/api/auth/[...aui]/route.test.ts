import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  GET: vi.fn(async () => new Response(null, { status: 303 })),
}));

// accounts-auth reads aui.json and the request scope behind a server-only
// guard, so this mock replaces the module rather than spreading it.
vi.mock("@/lib/accounts-auth", () => ({
  docsAuth: () => ({ GET: mocks.GET }),
}));

import { GET, POST } from "./route";

const logout = (headers: Record<string, string>) =>
  new Request("https://www.assistant-ui.com/api/auth/logout", {
    method: "POST",
    headers,
  });

beforeEach(() => {
  mocks.GET.mockClear();
});

describe("auth route", () => {
  it.each([
    ["a cross-site form", { "sec-fetch-site": "cross-site" }],
    ["a same-site form", { "sec-fetch-site": "same-site" }],
    ["a foreign Origin", { origin: "https://example.com" }],
    ["an unparsable Origin", { origin: "null" }],
    ["a client with neither header", {}],
  ])("refuses a logout POST from %s", async (_label, headers) => {
    const response = await POST(logout(headers));
    expect(response.status).toBe(403);
    expect(mocks.GET).not.toHaveBeenCalled();
  });

  it.each([
    ["a same-origin form", { "sec-fetch-site": "same-origin" }],
    ["its own Origin", { origin: "https://www.assistant-ui.com" }],
  ])("signs out on a POST from %s", async (_label, headers) => {
    const response = await POST(logout(headers));
    expect(response.status).toBe(303);
    expect(mocks.GET).toHaveBeenCalledOnce();
  });

  it("leaves GET requests such as the sign-in callback alone", async () => {
    const response = await GET(
      new Request("https://www.assistant-ui.com/api/auth/callback?code=x", {
        headers: { "sec-fetch-site": "cross-site" },
      }),
    );
    expect(response.status).toBe(303);
    expect(mocks.GET).toHaveBeenCalledOnce();
  });
});
