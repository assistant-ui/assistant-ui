"use client";

import { TerminalBlock } from "@/components/assistant-ui/elements/terminal-block";
import { defineStates } from "./types";

const TEST_LINES = [
  "RUN v4.0.5 /apps/docs",
  "✓ composer restores draft on switch (12ms)",
  "✓ composer clears draft after send (9ms)",
  "✓ composer keeps attachments per thread (11ms)",
  "Tests 3 passed (3)",
];

const LONG_LINES = [
  "\u001b[1m> @assistant-ui/react@0.11.4 build\u001b[0m",
  "\u001b[2m> tsup src/index.ts --format esm,cjs --dts\u001b[0m",
  "\u001b[34mCLI\u001b[0m Building entry: src/index.ts",
  "\u001b[34mCLI\u001b[0m Using tsconfig: tsconfig.json",
  "\u001b[34mCLI\u001b[0m tsup v8.3.5",
  "\u001b[34mCLI\u001b[0m Target: es2022",
  "\u001b[34mESM\u001b[0m Build start",
  "\u001b[34mCJS\u001b[0m Build start",
  "\u001b[32mESM\u001b[0m dist/index.mjs 412.08 KB",
  "\u001b[32mESM\u001b[0m ⚡️ Build success in 1840ms",
  "\u001b[32mCJS\u001b[0m dist/index.js 431.77 KB",
  "\u001b[32mCJS\u001b[0m ⚡️ Build success in 1912ms",
  "\u001b[34mDTS\u001b[0m Build start",
  "\u001b[32mDTS\u001b[0m ⚡️ Build success in 6204ms",
  "\u001b[32mDTS\u001b[0m dist/index.d.ts 98.40 KB",
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "running",
    label: "Running",
    note: "The command is still streaming and has printed two lines so far.",
    Component: () => (
      <TerminalBlock
        command="pnpm vitest run composer"
        lines={TEST_LINES}
        visibleCount={2}
        done={false}
      />
    ),
  },
  {
    key: "failed",
    label: "Failed",
    note: "A non-zero exit with stderr shown in red under the regular output.",
    Component: () => (
      <TerminalBlock
        cwd="~/assistant-ui"
        command="pnpm vitest run composer"
        lines={[
          "RUN v4.0.5 /apps/docs",
          "✓ composer restores draft on switch (12ms)",
          "× composer clears draft after send (14ms)",
          "Tests 1 failed | 1 passed (2)",
        ]}
        stderr={[
          "AssertionError: expected 'hello' to be ''",
          "  at composer.test.tsx:48:31",
        ]}
        visibleCount={6}
        done
        exitCode={1}
        durationMs={2140}
      />
    ),
  },
  {
    key: "empty",
    label: "No output",
    note: "The command exited cleanly without printing anything.",
    Component: () => (
      <TerminalBlock
        cwd="~/assistant-ui"
        command="git stash"
        lines={[]}
        visibleCount={0}
        done
        exitCode={0}
        durationMs={84}
      />
    ),
  },
  {
    key: "collapsed",
    label: "Collapsed",
    note: "Long output folded to its first lines, with a button to show the rest.",
    Component: () => (
      <TerminalBlock
        cwd="~/assistant-ui/packages/react"
        command="pnpm build"
        lines={LONG_LINES}
        visibleCount={LONG_LINES.length}
        done
        exitCode={0}
        durationMs={9480}
        maxCollapsedLines={5}
      />
    ),
  },
  {
    key: "truncated",
    label: "Truncated",
    note: "The tool cut the output short, so the block says so at the end.",
    Component: () => (
      <TerminalBlock
        cwd="~/assistant-ui"
        command="git log --oneline"
        lines={[
          "a41c9e2 fix(react): keep composer draft per thread",
          "7d02b1f feat(ui): add terminal block element",
          "c93e4aa chore: bump vitest to 4.0.5",
          "18f6d70 docs: document remote thread list adapter",
          "e5b2c11 fix(cloud): retry token refresh once",
        ]}
        visibleCount={5}
        done
        exitCode={0}
        durationMs={120}
        truncated
      />
    ),
  },
  {
    key: "long-content",
    label: "Long command",
    note: "A long command and long output lines wrap inside the block.",
    Component: () => (
      <TerminalBlock
        variant="ink"
        cwd="~/assistant-ui"
        command="docker run --rm -v $(pwd):/workspace -w /workspace -e NODE_OPTIONS=--max-old-space-size=8192 node:22 pnpm turbo build --filter=@assistant-ui/react..."
        lines={[
          "\u001b[33mwarn\u001b[0m Unable to resolve peer dependency react@^19.0.0 required by @assistant-ui/react-markdown@0.10.2 (found react@18.3.1 in /workspace/node_modules)",
          "• Packages in scope: @assistant-ui/react, @assistant-ui/react-markdown, @assistant-ui/react-ai-sdk",
          "\u001b[32m Tasks:    3 successful, 3 total\u001b[0m",
        ]}
        visibleCount={3}
        done
        exitCode={0}
        durationMs={74_300}
      />
    ),
  },
]);
