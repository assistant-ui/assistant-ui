// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCloudProjects } from "./cloud-projects-client";

const projects = [
  {
    id: "proj_a",
    name: "Support",
    organization: "Acme",
    frontendUrl: "https://proj-a.assistant-api.com",
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCloudProjects", () => {
  it("asks for nothing and reports unavailable while disabled", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useCloudProjects(false));
    expect(result.current).toEqual({ status: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads the listing uncached and reports it once it arrives", async () => {
    const fetchMock = vi.fn(async () => Response.json({ projects }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useCloudProjects(true));
    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() =>
      expect(result.current).toEqual({ status: "ready", projects }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cloud/projects",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("reports unavailable when the route refuses or cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 502 })),
    );
    const refused = renderHook(() => useCloudProjects(true));
    await waitFor(() =>
      expect(refused.result.current).toEqual({ status: "unavailable" }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    const offline = renderHook(() => useCloudProjects(true));
    await waitFor(() =>
      expect(offline.result.current).toEqual({ status: "unavailable" }),
    );
  });
});
