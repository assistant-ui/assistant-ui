import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const mocks = vi.hoisted(() => ({
  downloadTemplate: vi.fn(),
}));

vi.mock("giget", () => ({
  downloadTemplate: mocks.downloadTemplate,
}));

import {
  resolveSkillsInstall,
  buildSkillsAddCommand,
  ensureSkillsPlugin,
  skillsPluginDir,
  SKILLS_COMMIT,
  SKILLS_PACKAGE,
  SKILLS_PLUGIN_SOURCE,
} from "../../src/lib/agent-skill";
import { DOWNLOAD_TIMEOUT_MS } from "../../src/lib/create-project";

describe("resolveSkillsInstall", () => {
  it("honors an explicit --skills flag", () => {
    expect(resolveSkillsInstall({ skills: true, stdinIsTTY: true })).toBe(true);
    expect(resolveSkillsInstall({ skills: true, stdinIsTTY: false })).toBe(
      true,
    );
  });

  it("honors an explicit --no-skills flag", () => {
    expect(resolveSkillsInstall({ skills: false, stdinIsTTY: true })).toBe(
      false,
    );
    expect(resolveSkillsInstall({ skills: false, stdinIsTTY: false })).toBe(
      false,
    );
  });

  it("defers to a prompt (undefined) when no flag is set and stdin is a TTY", () => {
    expect(resolveSkillsInstall({ stdinIsTTY: true })).toBeUndefined();
  });

  it("defaults to true when no flag is set and stdin is not a TTY", () => {
    expect(resolveSkillsInstall({ stdinIsTTY: false })).toBe(true);
  });
});

describe("buildSkillsAddCommand", () => {
  it("delegates to the skills CLI via the package manager's dlx runner", () => {
    expect(buildSkillsAddCommand("pnpm", { stdinIsTTY: true })).toEqual([
      "pnpm",
      ["dlx", "skills", "add", SKILLS_PACKAGE],
    ]);
    expect(buildSkillsAddCommand("yarn", { stdinIsTTY: true })).toEqual([
      "yarn",
      ["dlx", "skills", "add", SKILLS_PACKAGE],
    ]);
    expect(buildSkillsAddCommand("bun", { stdinIsTTY: true })).toEqual([
      "bunx",
      ["skills", "add", SKILLS_PACKAGE],
    ]);
    expect(buildSkillsAddCommand("npm", { stdinIsTTY: true })).toEqual([
      "npx",
      ["--yes", "skills", "add", SKILLS_PACKAGE],
    ]);
  });

  it("lets the skills CLI prompt for agent platforms when a TTY is available", () => {
    const [, args] = buildSkillsAddCommand("pnpm", { stdinIsTTY: true });
    expect(args).not.toContain("--yes");
  });

  it("appends the skills CLI's --yes for every package manager when non-TTY", () => {
    expect(buildSkillsAddCommand("pnpm", { stdinIsTTY: false })).toEqual([
      "pnpm",
      ["dlx", "skills", "add", SKILLS_PACKAGE, "--yes"],
    ]);
    expect(buildSkillsAddCommand("yarn", { stdinIsTTY: false })).toEqual([
      "yarn",
      ["dlx", "skills", "add", SKILLS_PACKAGE, "--yes"],
    ]);
    expect(buildSkillsAddCommand("bun", { stdinIsTTY: false })).toEqual([
      "bunx",
      ["skills", "add", SKILLS_PACKAGE, "--yes"],
    ]);
    // npm carries npx's own --yes (auto-confirm the package download) plus the skills CLI's --yes
    expect(buildSkillsAddCommand("npm", { stdinIsTTY: false })).toEqual([
      "npx",
      ["--yes", "skills", "add", SKILLS_PACKAGE, "--yes"],
    ]);
  });
});

describe("skillsPluginDir", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keys the cache by the pinned skills commit under XDG_CACHE_HOME", () => {
    vi.stubEnv("XDG_CACHE_HOME", "/cache");
    expect(skillsPluginDir()).toBe(
      path.join("/cache", "assistant-ui", "skills", SKILLS_COMMIT),
    );
  });

  it("falls back to ~/.cache without XDG_CACHE_HOME", () => {
    vi.stubEnv("XDG_CACHE_HOME", "");
    expect(skillsPluginDir()).toBe(
      path.join(
        os.homedir(),
        ".cache",
        "assistant-ui",
        "skills",
        SKILLS_COMMIT,
      ),
    );
  });
});

describe("ensureSkillsPlugin", () => {
  let cacheHome: string;

  beforeEach(() => {
    cacheHome = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-"));
    vi.stubEnv("XDG_CACHE_HOME", cacheHome);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(cacheHome, { recursive: true, force: true });
  });

  it("pins the plugin directory of the skills repository at the commit", () => {
    expect(SKILLS_PLUGIN_SOURCE).toBe(
      `gh:${SKILLS_PACKAGE}/assistant-ui#${SKILLS_COMMIT}`,
    );
  });

  it("reuses a cached plugin without downloading", async () => {
    const dir = skillsPluginDir();
    fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), "{}");

    await expect(ensureSkillsPlugin()).resolves.toBe(dir);
    expect(mocks.downloadTemplate).not.toHaveBeenCalled();
  });

  it("downloads the pinned plugin into a staging directory and moves it into place", async () => {
    mocks.downloadTemplate.mockImplementation(
      async (_source: string, options: { dir: string }) => {
        fs.mkdirSync(path.join(options.dir, ".claude-plugin"), {
          recursive: true,
        });
        fs.writeFileSync(
          path.join(options.dir, ".claude-plugin", "plugin.json"),
          "{}",
        );
        return { dir: options.dir, source: _source };
      },
    );

    const dir = await ensureSkillsPlugin();

    expect(dir).toBe(skillsPluginDir());
    expect(mocks.downloadTemplate).toHaveBeenCalledTimes(1);
    const [source, options] = mocks.downloadTemplate.mock.calls[0]!;
    expect(source).toBe(SKILLS_PLUGIN_SOURCE);
    expect(options).toMatchObject({ preferOffline: true, silent: true });
    expect(path.dirname(options.dir)).toBe(path.dirname(dir));
    expect(options.dir).not.toBe(dir);
    expect(fs.existsSync(path.join(dir, ".claude-plugin", "plugin.json"))).toBe(
      true,
    );
    expect(fs.readdirSync(path.dirname(dir))).toEqual([SKILLS_COMMIT]);
  });

  it("removes the staging directory and explains a failed download", async () => {
    mocks.downloadTemplate.mockRejectedValue(new Error("403 rate limited"));

    await expect(ensureSkillsPlugin()).rejects.toThrow(
      /Could not fetch the assistant-ui skills/,
    );
    expect(fs.existsSync(skillsPluginDir())).toBe(false);
    expect(fs.readdirSync(path.dirname(skillsPluginDir()))).toEqual([]);
  });

  it("keeps a plugin another invocation published during the download", async () => {
    const dir = skillsPluginDir();
    mocks.downloadTemplate.mockImplementation(
      async (_source: string, options: { dir: string }) => {
        for (const root of [dir, options.dir]) {
          fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
          fs.writeFileSync(
            path.join(root, ".claude-plugin", "plugin.json"),
            root === dir ? "published" : "staged",
          );
        }
        return { dir: options.dir, source: _source };
      },
    );

    await expect(ensureSkillsPlugin()).resolves.toBe(dir);

    expect(
      fs.readFileSync(path.join(dir, ".claude-plugin", "plugin.json"), "utf8"),
    ).toBe("published");
    expect(fs.readdirSync(path.dirname(dir))).toEqual([SKILLS_COMMIT]);
  });

  it("gives up on a download that never completes", async () => {
    vi.useFakeTimers();
    try {
      let started!: () => void;
      const downloadStarted = new Promise<void>((resolve) => {
        started = resolve;
      });
      mocks.downloadTemplate.mockImplementation(() => {
        started();
        return new Promise(() => {});
      });

      const outcome = expect(ensureSkillsPlugin()).rejects.toThrow(
        /Could not fetch the assistant-ui skills/,
      );
      await downloadStarted;
      await vi.advanceTimersByTimeAsync(DOWNLOAD_TIMEOUT_MS);
      await outcome;

      expect(fs.readdirSync(path.dirname(skillsPluginDir()))).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("forwards a GitHub token to giget", async () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_test");
    mocks.downloadTemplate.mockImplementation(
      async (_source: string, options: { dir: string }) => {
        fs.mkdirSync(path.join(options.dir, ".claude-plugin"), {
          recursive: true,
        });
        fs.writeFileSync(
          path.join(options.dir, ".claude-plugin", "plugin.json"),
          "{}",
        );
        return { dir: options.dir, source: _source };
      },
    );

    await ensureSkillsPlugin();

    expect(mocks.downloadTemplate.mock.calls[0]![1]).toMatchObject({
      auth: "ghp_test",
    });
  });
});
