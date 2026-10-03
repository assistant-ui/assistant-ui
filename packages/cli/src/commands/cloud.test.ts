import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setupCloud, cloud } from "./cloud";

const {
  fetchOrganizations,
  fetchProjects,
  createProject,
  cloudAccessToken,
  provisionCloudHarness,
  scaffold,
  select,
  password,
} = vi.hoisted(() => ({
  fetchOrganizations: vi.fn(),
  fetchProjects: vi.fn(),
  createProject: vi.fn(),
  cloudAccessToken: vi.fn(),
  provisionCloudHarness: vi.fn(),
  scaffold: vi.fn(),
  select: vi.fn(),
  password: vi.fn(),
}));

vi.mock("aui-auth/accounts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("aui-auth/accounts")>()),
  fetchOrganizations,
  fetchProjects,
  createProject,
}));
vi.mock("../lib/cloud-auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/cloud-auth")>()),
  cloudAccessToken,
}));
vi.mock("../lib/cloud-provision", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/cloud-provision")>()),
  provisionCloudHarness,
}));
vi.mock("./create", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./create")>()),
  create: { parseAsync: scaffold },
}));
vi.mock("@clack/prompts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@clack/prompts")>()),
  select,
  password,
}));

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const fixture = async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "assistant-ui-cloud-command-"),
  );
  directories.push(directory);
  cloudAccessToken.mockResolvedValue("oauth-access");
  fetchOrganizations.mockResolvedValue([
    { id: "org-1", slug: "team", name: "Team" },
  ]);
  fetchProjects.mockResolvedValue([
    { id: "project-1", slug: "chat", name: "Team chat" },
  ]);
  provisionCloudHarness.mockResolvedValue({
    project_id: "project-1",
    workspace_id: "shared-workspace",
    harness_id: "harness-1",
    harness_origin: "https://harness.example.com",
    api_origin: "https://project.example.com",
    api_key: "cloud-server-key",
  });
  scaffold.mockResolvedValue(undefined);
  return directory;
};

const options = {
  backendUrl: "http://localhost:3000/api/chat",
  apiUrl: "https://cloud.example.com",
  yes: true,
  skipInstall: true,
  accessCode: "hackathon-code",
};

describe("cloud setup", () => {
  it("selects an existing project and scaffolds a shared harness with server-only credentials", async () => {
    const directory = await fixture();
    await setupCloud(directory, { ...options, org: "team", project: "chat" });
    expect(createProject).not.toHaveBeenCalled();
    expect(scaffold).toHaveBeenCalledWith(
      expect.arrayContaining([
        "cloud-harness",
        "--skip-install",
        "--no-skills",
      ]),
      { from: "user" },
    );
    expect(provisionCloudHarness).toHaveBeenCalledWith(
      options.apiUrl,
      "oauth-access",
      expect.objectContaining({
        org_id: "org-1",
        project_id: "project-1",
        access_code: "hackathon-code",
        backend_urls: [],
        allow_localhost: true,
      }),
    );
    const env = await readFile(path.join(directory, ".env.local"), "utf8");
    expect(env).toContain('ASSISTANT_API_KEY="cloud-server-key"');
    expect(env).not.toContain("NEXT_PUBLIC_ASSISTANT_API_KEY");
    expect(
      await readFile(
        path.join(directory, ".assistant-ui", "cloud.json"),
        "utf8",
      ),
    ).not.toContain("cloud-server-key");
  });

  it("does not provision again or overwrite customizations when setup is repeated", async () => {
    const directory = await fixture();
    await setupCloud(directory, options);
    const envFile = path.join(directory, ".env.local");
    const custom = `${(await readFile(envFile, "utf8")).replace(/^ASSISTANT_API_KEY=/m, "export ASSISTANT_API_KEY=")}OPENAI_API_KEY=custom-key\nCUSTOM_SETTING=keep-me\n`;
    await writeFile(envFile, custom);
    const before = provisionCloudHarness.mock.calls.length;
    await setupCloud(directory, options);
    expect(provisionCloudHarness.mock.calls.length).toBe(before);
    expect(await readFile(envFile, "utf8")).toBe(custom);
  });

  it("requires an explicit project when noninteractive users have several choices", async () => {
    const directory = await fixture();
    fetchProjects.mockResolvedValue([
      { id: "one", slug: "one", name: "One" },
      { id: "two", slug: "two", name: "Two" },
    ]);
    await expect(setupCloud(directory, options)).rejects.toThrow("--project");
  });

  it("reuses an organization created by an interrupted setup", async () => {
    const directory = await fixture();
    await setupCloud(directory, {
      ...options,
      newOrg: "team",
      project: "chat",
    });
    expect(fetchProjects).toHaveBeenCalledWith(
      expect.anything(),
      "oauth-access",
      {
        id: "org-1",
      },
    );
    expect(provisionCloudHarness).toHaveBeenCalledWith(
      options.apiUrl,
      "oauth-access",
      expect.objectContaining({ org_id: "org-1" }),
    );
  });

  it("rejects a changed backend before silently reusing configured resources", async () => {
    const directory = await fixture();
    await setupCloud(directory, options);
    const before = provisionCloudHarness.mock.calls.length;
    await expect(
      setupCloud(directory, {
        ...options,
        backendUrl: "https://app.example.com/api/chat",
      }),
    ).rejects.toThrow("backend allowlist in the Cloud dashboard");
    expect(provisionCloudHarness.mock.calls.length).toBe(before);
  });

  it("rejects conflicting selection flags before logging in", async () => {
    const directory = await fixture();
    const before = cloudAccessToken.mock.calls.length;
    await expect(
      setupCloud(directory, { ...options, org: "team", newOrg: "other" }),
    ).rejects.toThrow("Choose --org or --new-org");
    expect(cloudAccessToken.mock.calls.length).toBe(before);
  });

  it("rejects URL credentials and invalid organization slugs before logging in", async () => {
    const directory = await fixture();
    const before = cloudAccessToken.mock.calls.length;
    await expect(
      setupCloud(directory, {
        ...options,
        backendUrl: "https://user:secret@app.example.com/api/chat",
      }),
    ).rejects.toThrow("credentials");
    await expect(
      setupCloud(directory, { ...options, newOrg: "Bad Org!" }),
    ).rejects.toThrow("Organization slugs");
    expect(cloudAccessToken.mock.calls.length).toBe(before);
  });

  it("stops before provisioning when organization selection is cancelled", async () => {
    const directory = await fixture();
    fetchOrganizations.mockResolvedValue([
      { id: "one", slug: "one", name: "One" },
      { id: "two", slug: "two", name: "Two" },
    ]);
    const prompts =
      await vi.importActual<typeof import("@clack/prompts")>("@clack/prompts");
    const cancelled = await prompts.select({
      message: "Cancel test",
      options: [{ value: "one", label: "One" }],
      signal: AbortSignal.abort(),
    });
    select.mockResolvedValue(cancelled);
    const before = provisionCloudHarness.mock.calls.length;
    await expect(
      setupCloud(directory, { ...options, yes: false }),
    ).rejects.toThrow();
    expect(provisionCloudHarness.mock.calls.length).toBe(before);
  });

  it("exposes login, logout, and setup as cloud commands", () => {
    expect(cloud.commands.map((command) => command.name())).toEqual([
      "login",
      "logout",
      "setup",
    ]);
  });
});
