import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  mergeCloudEnvironment,
  readCloudProjectConfig,
  writeCloudFile,
  writeCloudProjectConfig,
  type CloudProjectConfig,
} from "./cloud-config";

describe("cloud environment", () => {
  const tempDir = async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "assistant-ui-cloud-"),
    );
    return directory;
  };

  it("refuses a symbolic link and preserves its target", async () => {
    const directory = await tempDir();
    try {
      const target = path.join(directory, "target");
      const file = path.join(directory, ".env.local");
      await writeFile(target, "original\n");
      await chmod(target, 0o644);
      await symlink(target, file);
      await expect(
        writeCloudFile(file, "replacement\n", { projectRoot: directory }),
      ).rejects.toThrow(`${file} is a symbolic link`);
      expect(await readFile(target, "utf8")).toBe("original\n");
      expect((await stat(target)).mode & 0o777).toBe(0o644);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuses a parent directory linked outside the project", async () => {
    const directory = await tempDir();
    const outside = await tempDir();
    try {
      await symlink(outside, path.join(directory, ".assistant-ui"), "dir");
      await expect(
        writeCloudFile(
          path.join(directory, ".assistant-ui", "cloud.json"),
          "secret",
          { projectRoot: directory },
        ),
      ).rejects.toThrow("outside the project");
      await expect(
        readFile(path.join(outside, "cloud.json"), "utf8"),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(directory, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("writes regular and missing files", async () => {
    const directory = await tempDir();
    try {
      const file = path.join(directory, ".assistant-ui", "cloud.json");
      await mkdir(path.dirname(file));
      await writeCloudFile(file, "first\n", { projectRoot: directory });
      await writeCloudFile(file, "second\n", { projectRoot: directory });
      expect(await readFile(file, "utf8")).toBe("second\n");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuses a linked environment file before reading cloud configuration", async () => {
    const directory = await tempDir();
    try {
      const target = path.join(directory, "target");
      const file = path.join(directory, ".env.local");
      await writeFile(target, "ORIGINAL=1\n");
      await chmod(target, 0o644);
      await symlink(target, file);
      const config: CloudProjectConfig = {
        organizationId: "org",
        organizationSlug: "team",
        projectId: "project",
        projectSlug: "chat",
        harnessId: "harness",
        harnessOrigin: "https://harness.example.com",
        apiOrigin: "https://project.example.com",
        workspaceId: "workspace",
        backendUrl: "http://localhost:3000/api/chat",
      };
      await expect(
        writeCloudProjectConfig(directory, config, "private-key"),
      ).rejects.toThrow(`${file} is a symbolic link`);
      expect(await readFile(target, "utf8")).toBe("ORIGINAL=1\n");
      expect((await stat(target)).mode & 0o777).toBe(0o644);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

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
        await readFile(path.join(directory, ".env.local"), "utf8"),
      ).toContain('ASSISTANT_API_KEY="private-cloud-key"');
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
