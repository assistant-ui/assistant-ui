import { beforeEach, describe, expect, it, vi } from "vitest";

const { captureImmediate, afterTasks } = vi.hoisted(() => ({
  captureImmediate: vi.fn(async () => {}),
  afterTasks: [] as (() => unknown)[],
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => {
    afterTasks.push(task);
  },
}));

vi.mock("./posthog-server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./posthog-server")>()),
  posthogServer: { captureImmediate },
}));

import {
  agentClientFamily,
  agentDocsRead,
  agentText,
  captureAgentEvent,
} from "./agent-telemetry";

beforeEach(() => {
  captureImmediate.mockClear();
});

// Waits for the work scheduled with `after`, which runs once the response is sent.
const flush = () => Promise.all(afterTasks.splice(0).map((task) => task()));

describe("agentClientFamily", () => {
  it.each([
    ["claude-code/2.1.332 (cli)", "claude-code"],
    [
      "Claude-User (claude-code/2.1.330; +https://support.anthropic.com/)",
      "claude-code",
    ],
    ["Claude-User", "claude"],
    ["codex-mcp-client/0.171.0", "codex"],
    ["Cursor/3.30.14 (linux x64)", "cursor"],
    ["GitHubCopilotRuntime-WebFetch", "copilot"],
    ["opencode/latest/2.4.1/cli", "opencode"],
    ["node", "node"],
    ["Go-http-client/2.0", "go"],
    ["python-httpx/0.28.1", "python"],
    ["curl/8.7.1", "curl"],
    ["Mozilla/5.0 (compatible; bingbot/2.0)", "crawler"],
    [
      "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
      "crawler",
    ],
    [
      "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)",
      "crawler",
    ],
    [
      "Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)",
      "chatgpt",
    ],
    ["Mozilla/5.0 (Macintosh) Chrome/150.0", "browser"],
    ["WorkBuddy/5.11.3", "other"],
    ["assistant-ui-skill-refresh/1.0", "internal"],
    [null, "unknown"],
  ])("files %s under %s", (userAgent, family) => {
    expect(agentClientFamily(userAgent)).toBe(family);
  });
});

describe("agentText", () => {
  it("bounds the text and drops identifiers pasted into it", () => {
    expect(
      agentText(
        "  thread list for jane.doe@example.com at 10.0.0.12 key demo9f8e7d6c5b4a39281706f5e4d3c  ",
      ),
    ).toBe("thread list for [email] at [ip] key [token]");
    expect(agentText("useExternalStoreRuntime")).toBe(
      "useExternalStoreRuntime",
    );
    expect(agentText("from 2001:db8::8a2e:370:7334 and fe80::1")).toBe(
      "from [ip] and [ip]",
    );
    expect(agentText("std::vector at 10:30")).toBe("std::vector at 10:30");
    expect(agentText('mail "j doe"@example.com or josé@exämple.de')).toBe(
      "mail [email] or [email]",
    );
    expect(agentText("x".repeat(500))).toHaveLength(200);
  });

  it("stays fast on a huge input with no match", () => {
    const started = performance.now();
    agentText("a".repeat(500_000));
    agentText("1".repeat(500_000));
    expect(performance.now() - started).toBeLessThan(250);
  });
});

describe("agentDocsRead", () => {
  const headers = (accept?: string) =>
    new Headers(accept ? { accept } : undefined);

  it.each([
    ["/llms.txt", undefined, { kind: "llms", negotiated: false }],
    ["/llms-full.txt", undefined, { kind: "llms-full", negotiated: false }],
    ["/skill.md", undefined, { kind: "skill", negotiated: false }],
    [
      "/.well-known/agent-skills/assistant-ui/SKILL.md",
      undefined,
      { kind: "skill", negotiated: false },
    ],
    [
      "/docs/installation.md",
      undefined,
      { kind: "markdown", negotiated: false },
    ],
    [
      "/elements/thread.mdx",
      undefined,
      { kind: "markdown", negotiated: false },
    ],
    [
      "/docs/installation",
      "text/markdown",
      { kind: "markdown", negotiated: true },
    ],
    ["/", "text/markdown, */*", { kind: "llms", negotiated: true }],
  ] as const)("counts %s", (path, accept, expected) => {
    expect(agentDocsRead(path, headers(accept))).toEqual({ path, ...expected });
  });

  it("scrubs an identifier that the url encoded", () => {
    expect(
      agentDocsRead("/docs/jane.doe%40example.com.md", headers())?.path,
    ).toBe("/docs/[email]");
  });

  it("leaves a page opened in a browser alone", () => {
    expect(
      agentDocsRead("/docs/installation", headers("text/html,*/*;q=0.8")),
    ).toBeNull();
  });
});

describe("captureAgentEvent", () => {
  const request = (headers: Record<string, string>) =>
    new Headers({ "x-vercel-ip-country": "US", ...headers });

  it("sends an anonymous event with no person profile or GeoIP lookup", async () => {
    captureAgentEvent(request({}), "agent_docs_fetched", {
      path: "/llms.txt",
      skipped: undefined,
    });
    expect(captureImmediate).not.toHaveBeenCalled();
    await flush();
    expect(captureImmediate).toHaveBeenCalledWith({
      distinctId: "docs-agent",
      event: "agent_docs_fetched",
      properties: {
        path: "/llms.txt",
        $process_person_profile: false,
        $geoip_disable: true,
      },
    });
  });

  it("resolves deferred properties when it sends", async () => {
    captureAgentEvent(request({}), "mcp_request_rejected", async () => ({
      reason: "parse-error",
    }));
    await flush();
    expect(captureImmediate).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ reason: "parse-error" }),
      }),
    );
  });

  it.each([
    ["sends GPC", { "sec-gpc": "1" }],
    ["comes from an opt-in region", { "x-vercel-ip-country": "DE" }],
    ["has no known country", { "x-vercel-ip-country": "XX" }],
  ])("sends nothing for a request that %s", async (_, headers) => {
    captureAgentEvent(request(headers), "agent_docs_fetched", {});
    await flush();
    expect(captureImmediate).not.toHaveBeenCalled();
  });

  it("never fails the read when PostHog is down", async () => {
    captureImmediate.mockRejectedValueOnce(new Error("down"));
    expect(() =>
      captureAgentEvent(request({}), "agent_docs_fetched", {}),
    ).not.toThrow();
    await flush();
  });
});
