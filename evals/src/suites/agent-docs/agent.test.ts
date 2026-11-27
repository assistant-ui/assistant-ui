import assert from "node:assert/strict";
import { test } from "node:test";
import { agentAuth, toolchainReads } from "./agent.ts";

test("agentAuth passes on a plan token over an API key, and nothing for the stored login", () => {
  assert.deepEqual(
    agentAuth({ CLAUDE_CODE_OAUTH_TOKEN: "token", ANTHROPIC_API_KEY: "key" }),
    {
      auth: "CLAUDE_CODE_OAUTH_TOKEN",
      env: { CLAUDE_CODE_OAUTH_TOKEN: "token" },
    },
  );
  assert.deepEqual(agentAuth({ ANTHROPIC_API_KEY: "key" }), {
    auth: "ANTHROPIC_API_KEY",
    env: { ANTHROPIC_API_KEY: "key" },
  });
  assert.deepEqual(
    agentAuth({ CLAUDE_CODE_OAUTH_TOKEN: "", ANTHROPIC_API_KEY: "" }),
    { auth: "stored login", env: {} },
  );
});

test("toolchainReads grants node's folder and npm's package, never an install root or the home directory", () => {
  const nvm = "/home/me/.nvm/versions/node/v24.1.0";
  assert.deepEqual(
    toolchainReads(
      [
        `${nvm}/bin/node`,
        `${nvm}/lib/node_modules/npm/bin/npm-cli.js`,
        `${nvm}/lib/node_modules/npm/bin/npx-cli.js`,
        `${nvm}/lib/node_modules/corepack/dist/corepack.js`,
      ],
      "/home/me",
    ),
    [
      `${nvm}/bin`,
      `${nvm}/lib/node_modules/npm`,
      `${nvm}/lib/node_modules/corepack`,
    ],
  );
  assert.deepEqual(toolchainReads(["/home/me/.local/bin/node"], "/home/me"), [
    "/home/me/.local/bin",
  ]);
  assert.deepEqual(
    toolchainReads(["/home/me/node", "/home/node", "/node"], "/home/me"),
    [],
  );
});
