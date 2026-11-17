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

  it("refuses a response that is not a list", async () => {
    const fetchMock = vi.fn(async () => Response.json({ error: "nope" }));
    await expect(
      fetchOrganizations(
        { issuer: "https://accounts.example.com", fetch: fetchMock },
        "access-token",
      ),
    ).rejects.toThrow("Accounts returned no organizations");
  });
});
