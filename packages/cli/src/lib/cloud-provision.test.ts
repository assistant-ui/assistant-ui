import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  provisionCloudHarness,
  resolveProvisionRequest,
} from "./cloud-provision";

const directories: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const directory = async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "assistant-ui-provision-"));
  directories.push(dir);
  return dir;
};

const input = {
  org_id: "org-1",
  project_id: "project-1",
  harness_name: "Team chat",
  backend_urls: ["http://localhost:3000/api/chat"],
  allow_localhost: true,
};

describe("cloud provisioning", () => {
  it("replays the same identity after a failed request without persisting an access code", async () => {
    const dir = await directory();
    const first = await resolveProvisionRequest(
      dir,
      input,
      "private-access-code",
    );
    const second = await resolveProvisionRequest(dir, input);
    expect(second.idempotency_key).toBe(first.idempotency_key);
    expect(
      await readFile(path.join(dir, ".assistant-ui", "provision.json"), "utf8"),
    ).not.toContain("private-access-code");
  });

  it("refuses to reuse a pending setup identity for another project", async () => {
    const dir = await directory();
    await resolveProvisionRequest(dir, input);
    await expect(
      resolveProvisionRequest(dir, { ...input, project_id: "different" }),
    ).rejects.toThrow("pending setup");
  });

  it("sends the OAuth token only in the authorization header", async () => {
    const request = { ...input, idempotency_key: "request-id" };
    const result = {
      project_id: input.project_id,
      workspace_id: "workspace",
      harness_id: "harness",
      harness_origin: "https://harness.example.com",
      api_origin: "https://project.example.com",
      api_key: "server-key",
    };
    const fetch = vi.fn().mockResolvedValue(Response.json(result));
    vi.stubGlobal("fetch", fetch);
    expect(
      await provisionCloudHarness(
        "https://cloud.example.com/",
        "private-token",
        request,
      ),
    ).toEqual(result);
    expect(fetch).toHaveBeenCalledWith(
      "https://cloud.example.com/api/cli/provision",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer private-token",
        }),
        body: JSON.stringify(request),
      }),
    );
    expect(fetch.mock.calls[0]![0]).not.toContain("private-token");
    expect(fetch.mock.calls[0]![1].body).not.toContain("private-token");
  });

  it("rejects provisioning data that belongs to a different project", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          project_id: "other",
          workspace_id: "workspace",
          harness_id: "harness",
          harness_origin: "https://harness.example.com",
          api_origin: "https://project.example.com",
          api_key: "server-key",
        }),
      ),
    );
    await expect(
      provisionCloudHarness("https://cloud.example.com", "token", {
        ...input,
        idempotency_key: "id",
      }),
    ).rejects.toThrow("incomplete setup response");
  });

  it("rejects malformed credentials instead of writing invalid app settings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          project_id: input.project_id,
          workspace_id: "workspace",
          harness_id: "harness",
          harness_origin: "https://harness.example.com",
          api_origin: "https://project.example.com",
          api_key: 123,
        }),
      ),
    );
    await expect(
      provisionCloudHarness("https://cloud.example.com", "token", {
        ...input,
        idempotency_key: "id",
      }),
    ).rejects.toThrow("incomplete setup response");
  });
});
