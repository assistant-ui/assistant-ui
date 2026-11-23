import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyChatProvider,
  providerInstallCommands,
  snapshotProject,
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

describe("snapshotProject", () => {
  it("notes an OpenAI package and the chat routes the project already had", () => {
    expect(
      snapshotProject(
        project({
          "package.json": JSON.stringify({
            optionalDependencies: { "@ai-sdk/openai": "^3.0.0" },
          }),
          "src/app/api/chat/route.ts": "export {}",
        }),
      ),
    ).toEqual({
      hadOpenAI: true,
      routes: { "src/app/api/chat/route.ts": "export {}" },
    });
    expect(snapshotProject(project({ "package.json": "{}" }))).toEqual({
      hadOpenAI: false,
      routes: {},
    });
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
  const fresh = { hadOpenAI: false, routes: {} };

  it("installs the provider, then switches the route init scaffolded, then drops OpenAI", async () => {
    const root = project({ "app/api/chat/route.ts": ROUTE });
    const note = await applyChatProvider(root, "npm", "anthropic", fresh);
    expect(note).toBe(
      "Chat route: Anthropic (claude-opus-5-5). Set ANTHROPIC_API_KEY in .env.local.",
    );
    expect(
      fs.readFileSync(path.join(root, "app/api/chat/route.ts"), "utf8"),
    ).toContain('anthropic("claude-opus-5-5")');
    expect(runSpawn.mock.calls).toEqual([
      ["npm", ["install", "@ai-sdk/anthropic"], root],
      ["npm", ["uninstall", "@ai-sdk/openai"], root],
    ]);
  });

  it("switches the route but runs no package manager with --skip-install", async () => {
    const root = project({ "app/api/chat/route.ts": ROUTE });
    const note = await applyChatProvider(root, "npm", "anthropic", fresh, {
      skipInstall: true,
    });
    expect(note).toContain(
      "Install @ai-sdk/anthropic (--skip-install left it out).",
    );
    expect(runSpawn).not.toHaveBeenCalled();
  });

  it("leaves the working OpenAI route when the provider install fails", async () => {
    const root = project({ "app/api/chat/route.ts": ROUTE });
    runSpawn.mockRejectedValueOnce(new Error("network"));
    await expect(
      applyChatProvider(root, "npm", "anthropic", fresh),
    ).rejects.toThrow("network");
    expect(
      fs.readFileSync(path.join(root, "app/api/chat/route.ts"), "utf8"),
    ).toBe(ROUTE);
  });

  it("switches a route the scaffold replaced with --overwrite", async () => {
    const root = project({ "app/api/chat/route.ts": ROUTE });
    await applyChatProvider(root, "npm", "google", {
      hadOpenAI: true,
      routes: { "app/api/chat/route.ts": "export const POST = mine;" },
    });
    expect(
      fs.readFileSync(path.join(root, "app/api/chat/route.ts"), "utf8"),
    ).toContain('google("gemini-3.8-flash")');
    expect(runSpawn.mock.calls).toEqual([
      ["npm", ["install", "@ai-sdk/google"], root],
    ]);
  });

  it("says so when --provider cannot apply, and changes nothing", async () => {
    const root = project({ "app/api/chat/route.ts": ROUTE });
    expect(
      await applyChatProvider(root, "npm", "anthropic", {
        hadOpenAI: false,
        routes: { "app/api/chat/route.ts": ROUTE },
      }),
    ).toBe(
      "--provider anthropic did not apply: app/api/chat/route.ts is not a route init scaffolded in this run, so switch its provider yourself.",
    );
    expect(await applyChatProvider(root, "npm", undefined, fresh)).toBe(
      undefined,
    );
    expect(await applyChatProvider(root, "npm", "openai", fresh)).toBe(
      undefined,
    );
    expect(
      fs.readFileSync(path.join(root, "app/api/chat/route.ts"), "utf8"),
    ).toBe(ROUTE);
    expect(runSpawn).not.toHaveBeenCalled();
  });
});
