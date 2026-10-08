import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");

const readRoute = (file) => readFileSync(path.join(repoRoot, file), "utf8");

const streamOptions = (file) => {
  const match = readRoute(file).match(/streamText\(\{([\s\S]*?)\n  \}\);/);
  assert.ok(match, `${file} should call streamText`);
  return match[1];
};

test("template chat routes pass the request signal to streamText", () => {
  for (const [file, signal] of [
    ["templates/default/app/api/chat/route.ts", "req.signal"],
    ["templates/minimal/app/api/chat/route.ts", "req.signal"],
    ["templates/cloud/app/api/chat/route.ts", "req.signal"],
    ["templates/cloud-clerk/app/api/chat/route.ts", "req.signal"],
    ["templates/cloud-harness/app/api/chat/route.ts", "request.signal"],
    ["templates/mcp/app/api/chat/route.ts", "req.signal"],
  ]) {
    assert.ok(
      streamOptions(file).includes(`abortSignal: ${signal}`),
      `${file} should forward ${signal}`,
    );
  }
});

test("frontend tool routes share one tool set with conversion and streaming", () => {
  for (const file of [
    "templates/default/app/api/chat/route.ts",
    "templates/minimal/app/api/chat/route.ts",
    "templates/cloud/app/api/chat/route.ts",
    "templates/cloud-clerk/app/api/chat/route.ts",
    "templates/mcp/app/api/chat/route.ts",
  ]) {
    const source = readRoute(file);
    const options = streamOptions(file);
    assert.match(source, /const aiSDKTools = \{/);
    assert.equal((source.match(/frontendTools\(/g) ?? []).length, 1);
    assert.match(
      options,
      /messages:\s*await convertToModelMessages\(messages,\s*\{\s*tools:\s*aiSDKTools\s*\}\)/,
      `${file} should convert messages with aiSDKTools`,
    );
    assert.match(
      options,
      /tools:\s*aiSDKTools/,
      `${file} should stream with the same aiSDKTools`,
    );
  }

  assert.match(
    readRoute("templates/mcp/app/api/chat/route.ts"),
    /const aiSDKTools = \{\s*\.\.\.mcpTools,\s*\.\.\.frontendTools\(tools \?\? \{\}\),\s*\};/,
  );
});

test("cloud harness remains a tool-free chat route", () => {
  const options = streamOptions(
    "templates/cloud-harness/app/api/chat/route.ts",
  );
  assert.doesNotMatch(options, /\btools\s*:/);
});
