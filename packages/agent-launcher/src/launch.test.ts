import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sync: vi.fn(),
}));

vi.mock("cross-spawn", async (importOriginal) => ({
  ...(await importOriginal()),
  default: { sync: mocks.sync },
}));

import { launch } from "./launch";

describe("launch", () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("passes the prompt to the selected skill", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    launch({
      pluginDir: "/tmp/plugin",
      skillName: "assistant-ui",
      prompt: "add a thread",
      dry: true,
    });

    expect(log).toHaveBeenCalledWith(
      'claude "/assistant-ui add a thread" --plugin-dir /tmp/plugin',
    );
  });

  it("invokes the selected skill when the prompt is empty", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    launch({
      pluginDir: "/tmp/plugin",
      skillName: "assistant-ui",
      prompt: "",
      dry: true,
    });

    expect(log).toHaveBeenCalledWith(
      "claude /assistant-ui --plugin-dir /tmp/plugin",
    );
  });

  it("falls back to a signal exit code if re-raising does not terminate", () => {
    mocks.sync.mockReturnValue({
      pid: 123,
      output: [],
      stdout: null,
      stderr: null,
      status: null,
      signal: "SIGTERM",
    });
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);
    const removeAllListeners = vi
      .spyOn(process, "removeAllListeners")
      .mockReturnValue(process);
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    expect(() => launch({ pluginDir: "/tmp/plugin", prompt: "test" })).toThrow(
      "process.exit",
    );

    expect(removeAllListeners).toHaveBeenCalledWith("SIGTERM");
    expect(kill).toHaveBeenCalledWith(process.pid, "SIGTERM");
    expect(removeAllListeners.mock.invocationCallOrder[0]).toBeLessThan(
      kill.mock.invocationCallOrder[0]!,
    );
    expect(exit).toHaveBeenCalledWith(143);
  });

  it.skipIf(process.platform === "win32")(
    "preserves signal termination when the parent has a signal handler",
    () => {
      const directory = mkdtempSync(join(tmpdir(), "aui-agent-launcher-"));
      temporaryDirectories.push(directory);

      const executable = join(directory, "claude");
      writeFileSync(
        executable,
        '#!/usr/bin/env node\nprocess.kill(process.pid, "SIGTERM");\n',
      );
      chmodSync(executable, 0o755);

      const launchUrl = new URL("./launch.ts", import.meta.url).href;
      const script = `
        process.on("SIGTERM", () => process.exit(0));
        const { launch } = await import(${JSON.stringify(launchUrl)});
        launch({ pluginDir: "/tmp/plugin", prompt: "test" });
      `;
      const result = spawnSync(
        process.execPath,
        ["--input-type=module", "--eval", script],
        {
          env: {
            ...process.env,
            NODE_NO_WARNINGS: "1",
            PATH: `${directory}${delimiter}${process.env.PATH ?? ""}`,
          },
        },
      );

      expect(result.status).toBeNull();
      expect(result.signal).toBe("SIGTERM");
    },
  );
});
