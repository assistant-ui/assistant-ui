import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyChatProvider,
  chooseChatProvider,
  describeProvider,
  providerInstallCommands,
  snapshotProjectProviders,
  switchRouteProvider,
} from "./init-provider";

const { runSpawn } = vi.hoisted(() => ({
  runSpawn: vi.fn(async () => {}),
}));
vi.mock("./run-spawn", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./run-spawn")>()),
  runSpawn,
}));

const ROUTE = `import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/ai-sdk";

export async function POST(req: Request) {
  const result = streamText({
    model: openai("gpt-6-luna"),
  });
}
`;

const roots: string[] = [];
const project = (files: Record<string, string>) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aui-provider-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

describe("snapshotProjectProviders", () => {
  it("finds the providers a project's packages and env files already use", () => {
    const root = project({
      "package.json": JSON.stringify({
        dependencies: { "@ai-sdk/google": "^3.0.0" },
      }),
      ".env.local":
        "# keys\nexport ANTHROPIC_API_KEY=sk-ant-x\nOPENAI_API_KEY=\n",
    });
    expect(snapshotProjectProviders(root)).toEqual({
      used: ["anthropic", "google"],
      hadOpenAI: false,
      hadRoute: false,
    });
  });

  it("notes an OpenAI package and a chat route the project already had", () => {
    const root = project({
      "package.json": JSON.stringify({
        devDependencies: { "@ai-sdk/openai": "^3.0.0" },
      }),
      "src/app/api/chat/route.ts": "export {}",
    });
    expect(snapshotProjectProviders(root)).toEqual({
      used: ["openai"],
      hadOpenAI: true,
      hadRoute: true,
    });
  });
});

describe("chooseChatProvider", () => {
  it("takes --provider, else the one provider the project uses, else OpenAI", () => {
    expect(chooseChatProvider("google", ["anthropic"])).toEqual({
      provider: "google",
      source: "flag",
    });
    expect(chooseChatProvider(undefined, ["anthropic"])).toEqual({
      provider: "anthropic",
      source: "project",
    });
    expect(chooseChatProvider(undefined, [])).toEqual({
      provider: "openai",
      source: "default",
    });
    expect(chooseChatProvider(undefined, ["openai", "anthropic"])).toEqual({
      provider: "openai",
      source: "default",
    });
  });

  it("says why, and names --provider when it fell back to the default", () => {
    expect(describeProvider("anthropic", "project", ["anthropic"])).toBe(
      "Chat route: Anthropic (claude-opus-5-5), the provider this project already uses. Set ANTHROPIC_API_KEY in .env.local.",
    );
    expect(describeProvider("openai", "default", [])).toContain(
      "pass --provider anthropic or google for another",
    );
    expect(
      describeProvider("openai", "default", ["openai", "anthropic"]),
    ).toContain("this project uses OpenAI and Anthropic, so pass --provider");
  });
});

describe("switchRouteProvider", () => {
  it("moves the scaffolded route's import and model to the provider", () => {
    const switched = switchRouteProvider(ROUTE, "anthropic");
    expect(switched).toContain(
      'import { anthropic } from "@ai-sdk/anthropic";',
    );
    expect(switched).toContain('model: anthropic("claude-opus-5-5"),');
    expect(switched).not.toContain("openai");
  });

  it("leaves a route that is not the scaffold alone", () => {
    expect(switchRouteProvider("export const POST = () => {};", "google")).toBe(
      undefined,
    );
  });
});

describe("providerInstallCommands", () => {
  it("adds the provider package and drops the OpenAI one init added", () => {
    expect(providerInstallCommands("pnpm", "anthropic", false)).toEqual([
      ["pnpm", ["add", "@ai-sdk/anthropic"]],
      ["pnpm", ["remove", "@ai-sdk/openai"]],
    ]);
    expect(providerInstallCommands("npm", "google", true)).toEqual([
      ["npm", ["install", "@ai-sdk/google"]],
    ]);
  });
});

describe("applyChatProvider", () => {
  it("switches the route init scaffolded to the provider the project uses", async () => {
    const root = project({ "app/api/chat/route.ts": ROUTE });
    const note = await applyChatProvider(root, "npm", undefined, {
      used: ["anthropic"],
      hadOpenAI: false,
      hadRoute: false,
    });
    expect(note).toContain("Chat route: Anthropic");
    expect(
      fs.readFileSync(path.join(root, "app/api/chat/route.ts"), "utf8"),
    ).toContain('anthropic("claude-opus-5-5")');
    expect(runSpawn.mock.calls).toEqual([
      ["npm", ["install", "@ai-sdk/anthropic"], root],
      ["npm", ["uninstall", "@ai-sdk/openai"], root],
    ]);
  });

  it("never touches a chat route the project already had", async () => {
    const root = project({ "app/api/chat/route.ts": ROUTE });
    expect(
      await applyChatProvider(root, "npm", "anthropic", {
        used: [],
        hadOpenAI: false,
        hadRoute: true,
      }),
    ).toBeUndefined();
    expect(
      fs.readFileSync(path.join(root, "app/api/chat/route.ts"), "utf8"),
    ).toBe(ROUTE);
    expect(runSpawn).not.toHaveBeenCalled();
  });

  it("keeps OpenAI with no other signal, and says how to pick another", async () => {
    const root = project({ "app/api/chat/route.ts": ROUTE });
    const note = await applyChatProvider(root, "npm", undefined, {
      used: [],
      hadOpenAI: false,
      hadRoute: false,
    });
    expect(note).toContain("--provider anthropic or google");
    expect(runSpawn).not.toHaveBeenCalled();
  });
});
