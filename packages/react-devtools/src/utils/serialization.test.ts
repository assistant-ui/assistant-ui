import { describe, expect, it } from "vitest";
import {
  REDACTED,
  redactSensitive,
  sanitizeForMessage,
  serializeModelContext,
} from "./serialization";

describe("sanitizeForMessage", () => {
  it("preserves shared (non-cyclic) sibling references instead of marking them circular", () => {
    const shared = { value: 1 };

    expect(sanitizeForMessage({ a: shared, b: shared })).toEqual({
      a: { value: 1 },
      b: { value: 1 },
    });

    const sharedArray = [1, 2];
    expect(sanitizeForMessage({ a: sharedArray, b: sharedArray })).toEqual({
      a: [1, 2],
      b: [1, 2],
    });
  });

  it("still detects genuine circular references", () => {
    const cyclic: Record<string, unknown> = { name: "root" };
    cyclic.self = cyclic;
    expect(sanitizeForMessage(cyclic)).toEqual({
      name: "root",
      self: "[Circular]",
    });

    const cyclicArray: unknown[] = [];
    cyclicArray.push(cyclicArray);
    expect(sanitizeForMessage(cyclicArray)).toEqual(["[Circular]"]);
  });
});

describe("redactSensitive", () => {
  it("masks credential-named keys but leaves lookalikes alone", () => {
    const out = redactSensitive({
      apiKey: "sk-123",
      authorization: "Bearer abc",
      maxTokens: 100,
      tokenCount: 42,
      nested: { client_secret: "shh", model: "gpt" },
    }) as Record<string, unknown>;

    expect(out.apiKey).toBe(REDACTED);
    expect(out.authorization).toBe(REDACTED);
    expect(out.maxTokens).toBe(100);
    expect(out.tokenCount).toBe(42);
    expect(out.nested).toEqual({ client_secret: REDACTED, model: "gpt" });
  });

  it("recurses through arrays", () => {
    const out = redactSensitive([{ token: "a" }, { ok: 1 }]) as unknown[];
    expect(out).toEqual([{ token: REDACTED }, { ok: 1 }]);
  });

  it("masks every value inside env/headers, including arbitrary names", () => {
    const out = redactSensitive({
      env: { OPENAI_API_KEY: "sk-1", GITHUB_TOKEN: "ghp", PATH: "/bin" },
      headers: { "X-Custom-Auth": "abc", "Content-Type": "application/json" },
      url: "https://mcp.example.com",
    }) as Record<string, Record<string, unknown>>;

    expect(out.env).toEqual({
      OPENAI_API_KEY: REDACTED,
      GITHUB_TOKEN: REDACTED,
      PATH: REDACTED,
    });
    expect(out.headers).toEqual({
      "X-Custom-Auth": REDACTED,
      "Content-Type": REDACTED,
    });
    expect(out.url).toBe("https://mcp.example.com");
  });
});

describe("serializeModelContext", () => {
  it("redacts secrets in config and call settings, keeps the rest", () => {
    const result = serializeModelContext({
      config: { apiKey: "sk-123", baseUrl: "https://api.example.com" },
      callSettings: {
        maxTokens: 256,
        headers: { Authorization: "Bearer xyz" },
      },
    } as never);

    expect(result?.config).toEqual({
      apiKey: REDACTED,
      baseUrl: "https://api.example.com",
    });
    expect(result?.callSettings).toEqual({
      maxTokens: 256,
      headers: { Authorization: REDACTED },
    });
  });

  it("redacts tool providerOptions/server but never the parameters schema", () => {
    const result = serializeModelContext({
      tools: {
        search: {
          type: "frontend",
          parameters: {
            type: "object",
            properties: { token: { type: "string" } },
          },
          providerOptions: { openai: { apiKey: "sk-xyz" } },
        },
        mcp_tool: {
          type: "mcp",
          server: { type: "http", url: "https://x", headers: { token: "t" } },
        },
      },
    } as never);

    const search = result?.tools?.find((t) => t.name === "search");
    const mcpTool = result?.tools?.find((t) => t.name === "mcp_tool");

    expect(search?.providerOptions).toEqual({ openai: { apiKey: REDACTED } });
    expect(search?.parameters).toEqual({
      type: "object",
      properties: { token: { type: "string" } },
    });
    expect(mcpTool?.server).toEqual({
      type: "http",
      url: "https://x",
      headers: { token: REDACTED },
    });
  });

  it("masks arbitrary env names on an MCP stdio server tool", () => {
    const result = serializeModelContext({
      tools: {
        gh: {
          type: "mcp",
          server: {
            type: "stdio",
            command: "mcp-github",
            env: { GITHUB_TOKEN: "ghp_secret", OPENAI_API_KEY: "sk" },
          },
        },
      },
    } as never);

    const gh = result?.tools?.find((t) => t.name === "gh");
    expect(gh?.server).toEqual({
      type: "stdio",
      command: "mcp-github",
      env: { GITHUB_TOKEN: REDACTED, OPENAI_API_KEY: REDACTED },
    });
  });

  it("returns undefined when there is no context", () => {
    expect(serializeModelContext(undefined)).toBeUndefined();
  });
});
