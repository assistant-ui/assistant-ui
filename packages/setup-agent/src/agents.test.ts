import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import {
  CODING_AGENTS,
  detectAgentKind,
  findCommand,
  isDirectInvocation,
  runCodingAgent,
} from "./agents";

describe("CODING_AGENTS", () => {
  it("lists the twenty most used coding agents once each", () => {
    expect(CODING_AGENTS).toHaveLength(20);
    const kinds = CODING_AGENTS.map((agent) => agent.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(kinds.slice(0, 4)).toEqual(["claude", "codex", "cursor", "gemini"]);
  });

  it("starts an agent with the prompt as its first message", () => {
    const byKind = Object.fromEntries(
      CODING_AGENTS.map((agent) => [agent.kind, agent]),
    );
    expect(byKind.claude!.launch!.args("go")).toEqual(["go"]);
    expect(byKind.gemini!.launch!.args("go")).toEqual(["-i", "go"]);
    expect(byKind.opencode!.launch!.args("go")).toEqual(["--prompt", "go"]);
    expect(byKind.windsurf!.launch).toBeUndefined();
  });
});

describe("detectAgentKind", () => {
  it("reads the agent from AI_AGENT first", () => {
    expect(detectAgentKind({ AI_AGENT: "claude-code_2-1-3_agent" })).toBe(
      "claude",
    );
    expect(detectAgentKind({ AI_AGENT: "github-copilot" })).toBe("copilot");
    expect(detectAgentKind({ AI_AGENT: "some-new-agent" })).toBe("other");
    expect(detectAgentKind({ AI_AGENT: " " })).toBeUndefined();
    expect(detectAgentKind({ AI_AGENT: "claudette" })).toBe("other");
    expect(detectAgentKind({ AI_AGENT: "codex" })).toBe("codex");
    expect(
      detectAgentKind({
        AI_AGENT: "claude-code_2-1-3_agent",
        CODEX_THREAD_ID: "t",
      }),
    ).toBe("claude");
  });

  it("reads the variables each agent exports to its shell", () => {
    expect(detectAgentKind({ CODEX_THREAD_ID: "t" })).toBe("codex");
    expect(detectAgentKind({ QWEN_CODE: "1" })).toBe("qwen");
    expect(detectAgentKind({ OPENCODE_CLIENT: "cli" })).toBe("opencode");
    expect(detectAgentKind({ AUGMENT_AGENT: "1" })).toBe("augment");
  });

  it("treats a person at a terminal inside an editor, or with Goose configured, as no agent", () => {
    expect(detectAgentKind({ GOOSE_PROVIDER: "openai" })).toBeUndefined();
    expect(
      detectAgentKind({ CURSOR_TRACE_ID: "x", TERM_PROGRAM: "vscode" }),
    ).toBe(undefined);
    expect(
      isDirectInvocation(
        { CURSOR_TRACE_ID: "x" },
        { isTTY: true },
        { isTTY: true },
      ),
    ).toBe(true);
  });
});

describe("findCommand and runCodingAgent", () => {
  const binDirectory = async () => {
    const directory = await mkdtemp(join(tmpdir(), "setup-agent-bin-"));
    onTestFinished(() => rm(directory, { recursive: true, force: true }));
    const script = join(directory, "fake-agent");
    await writeFile(
      script,
      '#!/bin/sh\n[ "$1" = "-i" ] && [ "$2" = "hello" ] && exit 7\nexit 1\n',
    );
    await chmod(script, 0o755);
    const second = join(directory, "other-agent");
    await writeFile(second, "#!/bin/sh\nexit 0\n");
    await chmod(second, 0o755);
    return directory;
  };

  it.skipIf(process.platform === "win32")(
    "finds the first installed command and runs it with the prompt",
    async () => {
      const directory = await binDirectory();
      const path = process.env.PATH;
      process.env.PATH = `${directory}:${path}`;
      onTestFinished(() => {
        process.env.PATH = path;
      });
      expect(findCommand(["missing-agent", "fake-agent"])).toBe("fake-agent");
      expect(findCommand(["other-agent", "fake-agent"])).toBe("other-agent");
      expect(findCommand(["fake-agent", "other-agent"])).toBe("fake-agent");
      expect(findCommand(["fake-agent"], { PATH: "" })).toBeUndefined();
      expect(findCommand(["missing-agent"])).toBeUndefined();
      const code = await runCodingAgent(
        {
          kind: "fake",
          name: "Fake",
          launch: {
            commands: ["fake-agent"],
            args: (prompt) => ["-i", prompt],
            install: "",
          },
        },
        "hello",
      );
      expect(code).toBe(7);
    },
  );

  it("reports an agent it cannot start as not installed", async () => {
    expect(
      await runCodingAgent(
        {
          kind: "fake",
          name: "Fake",
          launch: {
            commands: ["no-such-agent-xyz"],
            args: () => [],
            install: "",
          },
        },
        "hello",
      ),
    ).toBeUndefined();
    expect(await runCodingAgent({ kind: "zed", name: "Zed" }, "hi")).toBe(
      undefined,
    );
  });
});
