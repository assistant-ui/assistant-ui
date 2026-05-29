import type {
  ChatModelAdapter,
  ThreadAssistantMessagePart,
} from "@assistant-ui/react-ink";

export const MODEL_NAME = "demo-agent";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RETRY_PATCH = `--- a/src/retry.ts
+++ b/src/retry.ts
@@ -1,6 +1,18 @@
 export async function fetchUser(id: string) {
-  const res = await fetch(\`/api/users/\${id}\`);
-  return res.json();
+  return retry(() => fetch(\`/api/users/\${id}\`).then((r) => r.json()));
+}
+
+export async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
+  let lastError: unknown;
+  for (let i = 0; i < attempts; i++) {
+    try {
+      return await fn();
+    } catch (err) {
+      lastError = err;
+      await new Promise((r) => setTimeout(r, 2 ** i * 100));
+    }
+  }
+  throw lastError;
 }
`;

const RETRY_PATCH_FIX = `--- a/src/retry.ts
+++ b/src/retry.ts
@@ -6,7 +6,7 @@ export async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
   let lastError: unknown;
-  for (let i = 0; i < attempts; i++) {
+  for (let i = 0; i <= attempts; i++) {
     try {
       return await fn();
     } catch (err) {
`;

const isTaskRequest = (text: string) =>
  /fetch|retry|resilient|flaky|backoff|fail|robust|network|\byes\b|sure|ok\b|go ahead|do it|please/i.test(
    text,
  );

const lastUserText = (
  messages: { role: string; content: readonly { type: string }[] }[],
) => {
  const last = messages.filter((m) => m.role === "user").at(-1);
  return (
    last?.content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
};

async function* runAgentScript(): AsyncGenerator<{
  content: ThreadAssistantMessagePart[];
}> {
  const parts: ThreadAssistantMessagePart[] = [];
  const emit = () => ({ content: [...parts] });

  const reasoning =
    "Let me look at how fetchUser is implemented, wrap it in retry-with-backoff, and run the tests to make sure it holds up.";
  parts.push({ type: "reasoning", text: "" });
  for (const word of reasoning.split(" ")) {
    const p = parts[0] as Extract<
      ThreadAssistantMessagePart,
      { type: "reasoning" }
    >;
    parts[0] = { ...p, text: (p.text ? p.text + " " : "") + word };
    yield emit();
    await sleep(20);
  }

  const readArgs = { path: "src/retry.ts" };
  parts.push({
    type: "tool-call",
    toolCallId: "read-1",
    toolName: "read_file",
    args: readArgs,
    argsText: JSON.stringify(readArgs),
  });
  yield emit();
  await sleep(500);
  parts[parts.length - 1] = {
    ...parts[parts.length - 1],
    result: "12 lines read",
  } as ThreadAssistantMessagePart;
  yield emit();
  await sleep(300);

  const patchArgs = { path: "src/retry.ts", patch: RETRY_PATCH };
  parts.push({
    type: "tool-call",
    toolCallId: "patch-1",
    toolName: "apply_patch",
    args: patchArgs,
    argsText: JSON.stringify(patchArgs),
  });
  yield emit();
  await sleep(600);
  parts[parts.length - 1] = {
    ...parts[parts.length - 1],
    result: { applied: true },
  } as ThreadAssistantMessagePart;
  yield emit();
  await sleep(300);

  const testArgs = { command: "pnpm test retry" };
  parts.push({
    type: "tool-call",
    toolCallId: "test-1",
    toolName: "run_tests",
    args: testArgs,
    argsText: JSON.stringify(testArgs),
  });
  yield emit();
  await sleep(700);
  parts[parts.length - 1] = {
    ...parts[parts.length - 1],
    isError: true,
    result:
      "FAIL src/retry.test.ts - retry() ran 4 times, expected 3 (off-by-one in loop bound)",
  } as ThreadAssistantMessagePart;
  yield emit();
  await sleep(400);

  const noteIndex = parts.length;
  parts.push({ type: "text", text: "" });
  const note = "The loop bound was off by one. Tightening it and re-running.";
  for (const word of note.split(" ")) {
    const p = parts[noteIndex] as Extract<
      ThreadAssistantMessagePart,
      { type: "text" }
    >;
    parts[noteIndex] = { ...p, text: (p.text ? p.text + " " : "") + word };
    yield emit();
    await sleep(20);
  }

  const fixArgs = { path: "src/retry.ts", patch: RETRY_PATCH_FIX };
  parts.push({
    type: "tool-call",
    toolCallId: "patch-2",
    toolName: "apply_patch",
    args: fixArgs,
    argsText: JSON.stringify(fixArgs),
  });
  yield emit();
  await sleep(500);
  parts[parts.length - 1] = {
    ...parts[parts.length - 1],
    result: { applied: true },
  } as ThreadAssistantMessagePart;
  yield emit();
  await sleep(300);

  const runArgs = { command: "pnpm test retry" };
  parts.push({
    type: "tool-call",
    toolCallId: "test-2",
    toolName: "run_tests",
    args: runArgs,
    argsText: JSON.stringify(runArgs),
  });
  yield emit();
  await sleep(600);
  parts[parts.length - 1] = {
    ...parts[parts.length - 1],
    result: "PASS src/retry.test.ts (3 passed)",
  } as ThreadAssistantMessagePart;
  yield emit();
  await sleep(300);

  const summaryIndex = parts.length;
  parts.push({ type: "text", text: "" });
  const summary = `### Done

Added a \`retry()\` helper and routed \`fetchUser\` through it:

- exponential backoff (\`100ms\`, \`200ms\`, \`400ms\`)
- rethrows the **last error** after exhausting attempts
- fixed an off-by-one that ran one extra attempt

Tests are green.`;
  for (const word of summary.split(" ")) {
    const p = parts[summaryIndex] as Extract<
      ThreadAssistantMessagePart,
      { type: "text" }
    >;
    parts[summaryIndex] = { ...p, text: (p.text ? p.text + " " : "") + word };
    yield emit();
    await sleep(15);
  }
}

async function* runProposalReply(): AsyncGenerator<{
  content: ThreadAssistantMessagePart[];
}> {
  const response = `I'm set up to work in this repo. The obvious thing to fix is the flaky \`fetchUser()\` call in \`src/retry.ts\` — it has no retry logic, so a single network blip fails the request.

Want me to wrap it in retry-with-backoff? Just say *make fetchUser retry on failure*.`;
  let acc = "";
  for (const word of response.split(" ")) {
    acc += (acc ? " " : "") + word;
    yield { content: [{ type: "text", text: acc }] };
    await sleep(20);
  }
}

export const createScriptedAdapter = (): ChatModelAdapter => ({
  run({ messages }) {
    const text = lastUserText(messages as never);
    return isTaskRequest(text) ? runAgentScript() : runProposalReply();
  },
});
