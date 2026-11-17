import { AccountsRequestError } from "aui-auth";
import { describe, expect, it, vi } from "vitest";
import { fetchOrganizations } from "./cloud-organizations";

describe("fetchOrganizations", () => {
  it("reads the viewer's organizations from accounts with the bearer token", async () => {
    const organizations = [
      { id: "org_1", name: "Acme", slug: "acme", logo: null, role: "owner" },
    ];
    const fetchMock = vi.fn(async () => Response.json(organizations));
    await expect(
      fetchOrganizations(
        { issuer: "https://accounts.example.com", fetch: fetchMock },
        "access-token",
      ),
    ).resolves.toEqual(organizations);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://accounts.example.com/api/oidc/organizations",
      expect.objectContaining({
        headers: { Authorization: "Bearer access-token" },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("throws an accounts error with the status when accounts refuses", async () => {
    const fetchMock = vi.fn(
      async () => new Response("unauthorized", { status: 401 }),
    );
    const failure = await fetchOrganizations(
      { issuer: "https://accounts.example.com", fetch: fetchMock },
      "access-token",
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(AccountsRequestError);
    expect((failure as AccountsRequestError).status).toBe(401);
  });

  it.each([
    ["a body that is not a list", () => Response.json({ error: "nope" })],
    ["a null row", () => Response.json([null])],
    [
      "a row without a slug",
      () => Response.json([{ id: "org_1", name: "Acme", role: "owner" }]),
    ],
    ["a body that is not JSON", () => new Response("<html>")],
  ])("refuses %s", async (_case, respond) => {
    const fetchMock = vi.fn(async () => respond());
    const failure = await fetchOrganizations(
      { issuer: "https://accounts.example.com", fetch: fetchMock },
      "access-token",
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(AccountsRequestError);
    expect((failure as Error).message).toBe(
      "Accounts returned no organizations",
    );
  });

  it("passes the timeout to the request and lets a network failure through", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(
      fetchOrganizations(
        {
          issuer: "https://accounts.example.com",
          fetch: fetchMock,
          timeoutMs: 1234,
        },
        "access-token",
      ),
    ).rejects.toThrow("fetch failed");
    expect(timeout).toHaveBeenCalledWith(1234);
    timeout.mockRestore();
  });
});
