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
+  for (let i = 0; i <= attempts; i++) {
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
-  for (let i = 0; i <= attempts; i++) {
+  for (let i = 0; i < attempts; i++) {
     try {
       return await fn();
     } catch (err) {
`;

const isTaskRequest = (text: string) =>
  /fetch|retry|resilient|flaky|backoff|robust|network|\byes\b|sure|\bok\b|go ahead|do it|please/i.test(
    text,
  );

const lastUserText = (
  messages: readonly { role: string; content: readonly { type: string }[] }[],
) => {
  const last = messages.filter((m) => m.role === "user").at(-1);
  return (
    last?.content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
};

async function* streamText(
  parts: ThreadAssistantMessagePart[],
  index: number,
  text: string,
  delay: number,
): AsyncGenerator<{ content: ThreadAssistantMessagePart[] }> {
  for (const word of text.split(" ")) {
    const p = parts[index] as Extract<
      ThreadAssistantMessagePart,
      { type: "text" | "reasoning" }
    >;
    parts[index] = { ...p, text: p.text ? `${p.text} ${word}` : word };
    yield { content: [...parts] };
    await sleep(delay);
  }
}

async function* runAgentScript(): AsyncGenerator<{
  content: ThreadAssistantMessagePart[];
}> {
  const parts: ThreadAssistantMessagePart[] = [];
  const emit = () => ({ content: [...parts] });
  const setResult = (result: unknown, isError = false) => {
    parts[parts.length - 1] = {
      ...parts[parts.length - 1],
      result,
      ...(isError ? { isError: true } : {}),
    } as ThreadAssistantMessagePart;
  };
  const pushToolCall = (
    toolCallId: string,
    toolName: string,
    args: Record<string, string>,
  ) =>
    parts.push({
      type: "tool-call",
      toolCallId,
      toolName,
      args,
      argsText: JSON.stringify(args),
    });

  const reasoningIdx = parts.push({ type: "reasoning", text: "" }) - 1;
  yield* streamText(
    parts,
    reasoningIdx,
    "Let me look at how fetchUser is implemented, wrap it in retry-with-backoff, and run the tests to make sure it holds up.",
    20,
  );

  pushToolCall("read-1", "read_file", { path: "src/retry.ts" });
  yield emit();
  await sleep(500);
  setResult("12 lines read");
  yield emit();
  await sleep(300);

  pushToolCall("patch-1", "apply_patch", {
    path: "src/retry.ts",
    patch: RETRY_PATCH,
  });
  yield emit();
  await sleep(600);
  setResult({ applied: true });
  yield emit();
  await sleep(300);

  pushToolCall("test-1", "run_tests", { command: "pnpm test retry" });
  yield emit();
  await sleep(700);
  setResult(
    "FAIL src/retry.test.ts - retry() ran 4 times, expected 3 (off-by-one in loop bound)",
    true,
  );
  yield emit();
  await sleep(400);

  const noteIdx = parts.push({ type: "text", text: "" }) - 1;
  yield* streamText(
    parts,
    noteIdx,
    "The loop bound was off by one. Tightening it and re-running.",
    20,
  );

  pushToolCall("patch-2", "apply_patch", {
    path: "src/retry.ts",
    patch: RETRY_PATCH_FIX,
  });
  yield emit();
  await sleep(500);
  setResult({ applied: true });
  yield emit();
  await sleep(300);

  pushToolCall("test-2", "run_tests", { command: "pnpm test retry" });
  yield emit();
  await sleep(600);
  setResult("PASS src/retry.test.ts (3 passed)");
  yield emit();
  await sleep(300);

  const summary = `### Done

Added a \`retry()\` helper and routed \`fetchUser\` through it:

- exponential backoff (\`100ms\`, \`200ms\`, \`400ms\`)
- rethrows the **last error** after exhausting attempts
- fixed an off-by-one that ran one extra attempt

Tests are green.`;
  const summaryIdx = parts.push({ type: "text", text: "" }) - 1;
  yield* streamText(parts, summaryIdx, summary, 15);
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
    return isTaskRequest(lastUserText(messages))
      ? runAgentScript()
      : runProposalReply();
  },
});
