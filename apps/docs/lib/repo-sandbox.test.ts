import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createRepoSandbox, TimeBudgetedBash } from "./repo-sandbox";

const mocks = vi.hoisted(() => ({ sourceRoot: "" }));

vi.mock("./repo-source", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./repo-source")>()),
  repoSourceRoot: () => mocks.sourceRoot,
}));

const SOURCE_FILES = {
  "AGENTS.md": "# assistant-ui\n",
  "packages/core/src/index.ts": "export const useLocalRuntime = 1;\n",
};

beforeAll(async () => {
  mocks.sourceRoot = await mkdtemp(path.join(tmpdir(), "repo-sandbox-"));

  for (const [filePath, contents] of Object.entries(SOURCE_FILES)) {
    const target = path.join(mocks.sourceRoot, filePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
});

afterAll(async () => {
  await rm(mocks.sourceRoot, { recursive: true, force: true });
});

const run = async (
  getToolkit: ReturnType<typeof createRepoSandbox>,
  command: string,
) => {
  const { sandbox } = await getToolkit();
  const { stdout, stderr } = await sandbox.executeCommand(command);
  return `${stdout}${stderr}`.trim();
};

describe("createRepoSandbox", () => {
  it("serves reads from the generated source tree", async () => {
    const getToolkit = createRepoSandbox({ toolPrompt: "" });

    expect(await run(getToolkit, "cat /repo/AGENTS.md")).toBe("# assistant-ui");
    expect(await run(getToolkit, "grep -rl useLocalRuntime /repo")).toBe(
      "/repo/packages/core/src/index.ts",
    );
  });

  it("keeps one sandbox per factory so a request sees its own writes", async () => {
    const getToolkit = createRepoSandbox({ toolPrompt: "" });

    await run(getToolkit, "echo tampered > /repo/AGENTS.md");

    expect(await run(getToolkit, "cat /repo/AGENTS.md")).toBe("tampered");
  });

  it("isolates writes, overwrites, and deletes between factories", async () => {
    const writer = createRepoSandbox({ toolPrompt: "" });
    const reader = createRepoSandbox({ toolPrompt: "" });

    await run(writer, "echo leaked > /repo/pwned.txt");
    await run(writer, "echo tampered > /repo/AGENTS.md");
    await run(writer, "rm /repo/packages/core/src/index.ts");

    expect(await run(reader, "cat /repo/pwned.txt")).toContain(
      "No such file or directory",
    );
    expect(await run(reader, "cat /repo/AGENTS.md")).toBe("# assistant-ui");
    expect(await run(reader, "cat /repo/packages/core/src/index.ts")).toBe(
      "export const useLocalRuntime = 1;",
    );
  });

  it("keeps the shell usable outside the mount", async () => {
    const getToolkit = createRepoSandbox({ toolPrompt: "" });

    expect(await run(getToolkit, "cat /repo/absent 2>/dev/null; echo $?")).toBe(
      "1",
    );
    expect(
      await run(getToolkit, "echo hi > /tmp/out.txt && cat /tmp/out.txt"),
    ).toBe("hi");
  });

  it("cannot reach the host filesystem outside the mounted root", async () => {
    const getToolkit = createRepoSandbox({ toolPrompt: "" });

    for (const command of [
      "cat /etc/passwd",
      "cat /repo/../../../../etc/passwd",
      `ls ${mocks.sourceRoot}`,
    ]) {
      expect(await run(getToolkit, `${command} 2>&1 | head -1`)).toContain(
        "No such file or directory",
      );
    }
  });

  it("falls back to an empty mount before the tree is generated", async () => {
    const generated = mocks.sourceRoot;
    mocks.sourceRoot = path.join(tmpdir(), "repo-sandbox-absent");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const getToolkit = createRepoSandbox({ toolPrompt: "" });

      expect(await run(getToolkit, "ls /repo")).toBe("");
      expect(await run(getToolkit, "cat /repo/AGENTS.md")).toContain(
        "No such file or directory",
      );
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
      mocks.sourceRoot = generated;
    }
  });

  it("stops a command at its deadline", async () => {
    const getToolkit = createRepoSandbox({
      toolPrompt: "",
      commandTimeoutMs: 200,
    });

    const startedAt = Date.now();
    const output = await run(getToolkit, "sleep 30; echo finished");

    expect(Date.now() - startedAt).toBeLessThan(5_000);
    expect(output).not.toContain("finished");
    expect(await run(getToolkit, "echo next")).toBe("next");
  });

  it("stops every command once the sandbox spends its time budget", async () => {
    const getToolkit = createRepoSandbox({
      toolPrompt: "",
      commandTimeoutMs: 10_000,
      timeBudgetMs: 300,
    });

    const startedAt = Date.now();
    expect(await run(getToolkit, "sleep 30; echo finished")).not.toContain(
      "finished",
    );
    expect(await run(getToolkit, "sleep 30; echo finished")).not.toContain(
      "finished",
    );
    expect(await run(getToolkit, "echo after")).not.toContain("after");
    expect(Date.now() - startedAt).toBeLessThan(5_000);
  });

  it("shares one budget between overlapping commands", async () => {
    const bash = new TimeBudgetedBash({}, 300);

    const startedAt = Date.now();
    const results = await Promise.all([
      bash.exec("sleep 30; echo finished"),
      new Promise((resolve) => setTimeout(resolve, 150)).then(() =>
        bash.exec("sleep 30; echo finished"),
      ),
    ]);

    expect(Date.now() - startedAt).toBeLessThan(1_000);
    for (const result of results)
      expect(result.stdout).not.toContain("finished");
    expect((await bash.exec("echo after")).stdout).not.toContain("after");
  });

  it("does not count the time between commands", async () => {
    const bash = new TimeBudgetedBash({}, 300);

    expect((await bash.exec("sleep 0.1; echo one")).stdout).toBe("one\n");
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect((await bash.exec("echo two")).stdout).toBe("two\n");
  });

  it("stops a command when the caller aborts it", async () => {
    const bash = new TimeBudgetedBash({}, 60_000);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);

    const startedAt = Date.now();
    const result = await bash.exec("sleep 30; echo finished", {
      signal: controller.signal,
    });

    expect(Date.now() - startedAt).toBeLessThan(5_000);
    expect(result.stdout).not.toContain("finished");
    expect((await bash.exec("echo next")).stdout).toBe("next\n");
  });

  it("keeps quick commands unaffected by the deadline", async () => {
    const getToolkit = createRepoSandbox({ toolPrompt: "" });

    for (let index = 0; index < 5; index += 1) {
      expect(await run(getToolkit, "sleep 0.01; echo ok")).toBe("ok");
    }
  });

  it("never writes through to the source tree on disk", async () => {
    const getToolkit = createRepoSandbox({ toolPrompt: "" });

    await run(getToolkit, "echo leaked > /repo/pwned.txt");
    await run(getToolkit, "rm /repo/AGENTS.md");

    expect(existsSync(path.join(mocks.sourceRoot, "pwned.txt"))).toBe(false);
    expect(
      readFileSync(path.join(mocks.sourceRoot, "AGENTS.md"), "utf-8"),
    ).toBe("# assistant-ui\n");
  });
});
