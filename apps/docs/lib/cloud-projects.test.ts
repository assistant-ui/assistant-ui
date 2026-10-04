import { describe, expect, it, vi } from "vitest";
import { frontendApiUrl, listCloudProjects } from "./cloud-projects";

const project = (
  id: string,
  organizationId: string,
  name: string,
  updatedAt: string,
) => ({
  id,
  organizationId,
  slug: name.toLowerCase(),
  name,
  color: "#000",
  icon: null,
  plan: "free",
  createdBy: "user_1",
  updatedBy: "user_1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt,
  viewerRole: "owner",
});

const accounts = (
  routes: Record<string, () => Response>,
): AccountsFetchOptions & { fetch: ReturnType<typeof vi.fn> } => ({
  issuer: "https://accounts.test",
  fetch: vi.fn(async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const route = routes[`${url.pathname}${url.search}`];
    return route ? route() : new Response(null, { status: 404 });
  }),
});

type AccountsFetchOptions = Parameters<typeof listCloudProjects>[1];

describe("listCloudProjects", () => {
  it("gathers the projects of every organization the user is in, newest change first, with the URL each id answers on", async () => {
    const options = accounts({
      "/api/oidc/organizations": () =>
        Response.json([
          {
            id: "org_a",
            name: "Acme",
            slug: "acme",
            logo: null,
            role: "owner",
          },
          {
            id: "org_b",
            name: "Beta",
            slug: "beta",
            logo: null,
            role: "member",
          },
        ]),
      "/api/projects?org_id=org_a": () =>
        Response.json([
          project("proj_old", "org_a", "Support", "2026-02-01T00:00:00.000Z"),
          project("proj_new", "org_a", "Docs bot", "2026-04-01T00:00:00.000Z"),
        ]),
      "/api/projects?org_id=org_b": () =>
        Response.json([
          project("proj_mid", "org_b", "Sales", "2026-03-01T00:00:00.000Z"),
        ]),
    });
    expect(await listCloudProjects("token", options)).toEqual([
      {
        id: "proj_new",
        name: "Docs bot",
        organization: "Acme",
        frontendUrl: "https://proj-new.assistant-api.com",
      },
      {
        id: "proj_mid",
        name: "Sales",
        organization: "Beta",
        frontendUrl: "https://proj-mid.assistant-api.com",
      },
      {
        id: "proj_old",
        name: "Support",
        organization: "Acme",
        frontendUrl: "https://proj-old.assistant-api.com",
      },
    ]);
    for (const [input, init] of options.fetch.mock.calls as [
      string | URL | Request,
      RequestInit | undefined,
    ][]) {
      const headers = new Headers(
        input instanceof Request ? input.headers : init?.headers,
      );
      expect(headers.get("authorization")).toBe("Bearer token");
    }
  });

  it("skips an organization that refuses the listing and fails when accounts refuses the token", async () => {
    const options = accounts({
      "/api/oidc/organizations": () =>
        Response.json([
          {
            id: "org_a",
            name: "Acme",
            slug: "acme",
            logo: null,
            role: "owner",
          },
          {
            id: "org_gone",
            name: "Gone",
            slug: "gone",
            logo: null,
            role: "member",
          },
        ]),
      "/api/projects?org_id=org_a": () =>
        Response.json([
          project("proj_a", "org_a", "Support", "2026-02-01T00:00:00.000Z"),
        ]),
      "/api/projects?org_id=org_gone": () =>
        new Response(null, { status: 403 }),
    });
    expect(
      (await listCloudProjects("token", options)).map((entry) => entry.id),
    ).toEqual(["proj_a"]);

    await expect(
      listCloudProjects(
        "token",
        accounts({
          "/api/oidc/organizations": () => new Response(null, { status: 401 }),
        }),
      ),
    ).rejects.toThrow();
  });
});

describe("frontendApiUrl", () => {
  it("turns the id's underscore into the host's hyphen", () => {
    expect(frontendApiUrl("proj_0ltyjcuaxpv1")).toBe(
      "https://proj-0ltyjcuaxpv1.assistant-api.com",
    );
  });
});
