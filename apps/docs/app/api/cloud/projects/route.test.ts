import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  accountsOptions: null as { issuer: string } | null,
  getAccessToken: vi.fn(),
  listCloudProjects: vi.fn(),
}));

vi.mock("@/lib/accounts-auth", () => ({
  get accountsOptions() {
    return mocks.accountsOptions;
  },
  getAccessToken: mocks.getAccessToken,
}));

vi.mock("@/lib/cloud-projects", () => ({
  listCloudProjects: mocks.listCloudProjects,
}));

import { GET } from "./route";

const request = (headers: HeadersInit = { "sec-fetch-site": "same-origin" }) =>
  new Request("https://www.assistant-ui.com/api/cloud/projects", { headers });

const options = { issuer: "https://accounts.test" };

afterEach(() => {
  vi.resetAllMocks();
  mocks.accountsOptions = null;
});

describe("GET /api/cloud/projects", () => {
  it("rejects cross-origin requests", async () => {
    const response = await GET(
      request({
        origin: "https://example.com",
        "sec-fetch-site": "cross-site",
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.getAccessToken).not.toHaveBeenCalled();
  });

  it("reports a deployment without accounts before reading the session", async () => {
    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(mocks.getAccessToken).not.toHaveBeenCalled();
  });

  it("requires a signed-in session", async () => {
    mocks.accountsOptions = options;
    mocks.getAccessToken.mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "A signed-in session is required.",
    });
  });

  it("lists the visitor's projects with a fresh accounts token, uncached", async () => {
    mocks.accountsOptions = options;
    mocks.getAccessToken.mockResolvedValue("at-1");
    const projects = [
      {
        id: "proj_a",
        name: "Support",
        organization: "Acme",
        frontendUrl: "https://proj-a.assistant-api.com",
      },
    ];
    mocks.listCloudProjects.mockResolvedValue(projects);

    const response = await GET(request());

    expect(mocks.listCloudProjects).toHaveBeenCalledWith("at-1", options);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ projects });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 502 when accounts refuses or fails", async () => {
    mocks.accountsOptions = options;
    mocks.getAccessToken.mockResolvedValue("at-1");
    mocks.listCloudProjects.mockRejectedValue(new Error("401"));

    const response = await GET(request());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Accounts could not list the projects.",
    });
  });
});
