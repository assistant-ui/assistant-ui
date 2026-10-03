import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  mergeCloudEnvironment,
  readCloudProjectConfig,
  writeCloudProjectConfig,
} from "./cloud-config";

describe("cloud environment", () => {
  it("preserves custom settings and repeated configuration", () => {
    const original = "# My settings\nOPENAI_API_KEY=my-existing-key\n";
    const merged = mergeCloudEnvironment(original, {
      ASSISTANT_API_KEY: "secret",
    });
    expect(merged).toContain(original);
    expect(mergeCloudEnvironment(merged, { ASSISTANT_API_KEY: "secret" })).toBe(
      merged,
    );
  });

  it("refuses to overwrite an existing configuration", () => {
    expect(() =>
      mergeCloudEnvironment("ASSISTANT_API_KEY=existing\n", {
        ASSISTANT_API_KEY: "replacement",
      }),
    ).toThrow("already configured");
  });

  it("encodes multiline values and quotes", () => {
    expect(mergeCloudEnvironment("", { KEY: 'hello\nworld"' })).toBe(
      'KEY="hello\\nworld\\\""\n',
    );
  });

  it("keeps API keys in an ignored private server environment file", async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "assistant-ui-cloud-"),
    );
    try {
      await writeFile(
        path.join(directory, ".env.local"),
        "OPENAI_API_KEY=existing-provider-key\n",
      );
      const config = {
        organizationId: "org",
        organizationSlug: "team",
        projectId: "project",
        projectSlug: "chat",
        harnessId: "harness",
        harnessOrigin: "https://harness.example.com",
        apiOrigin: "https://project.example.com",
        workspaceId: "hackathon",
        backendUrl: "http://localhost:3000/api/chat",
      };
      await writeCloudProjectConfig(directory, config, "private-cloud-key");
      expect(await readCloudProjectConfig(directory)).toEqual(config);
      expect(
        await readFile(
          path.join(directory, ".assistant-ui", "cloud.json"),
          "utf8",
        ),
      ).not.toContain("private-cloud-key");
      expect(
        await readFile(path.join(directory, ".env.local"), "utf8"),
      ).toContain("OPENAI_API_KEY=existing-provider-key");
      expect(
        await readFile(path.join(directory, ".gitignore"), "utf8"),
      ).toContain(".env.local");
      if (process.platform !== "win32")
        expect(
          (await stat(path.join(directory, ".env.local"))).mode & 0o777,
        ).toBe(0o600);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
