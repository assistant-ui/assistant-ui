import { TerminalBlock } from "@assistant-ui/ui/components/assistant-ui/elements/terminal-block.tsx";
import { defineSections } from "../types";

const LINES = [
  "RUN v4.0.5 /examples/with-vscode",
  "✓ bridge streams a response body (12ms)",
  "✓ bridge aborts with the webview (9ms)",
  "✓ bridge rejects a closed channel (11ms)",
  "Tests 3 passed (3)",
] as const;

export default defineSections([
  {
    id: "terminal-block",
    title: "Terminal block",
    category: "content",
    notes: "Paper and ink variants of a finished run.",
    render: () => (
      <div className="flex flex-col gap-3">
        <TerminalBlock
          command="pnpm vitest run bridge"
          lines={LINES}
          visibleCount={LINES.length}
          done
          variant="paper"
        />
        <TerminalBlock
          command="pnpm vitest run bridge"
          lines={LINES}
          visibleCount={LINES.length}
          done
          variant="ink"
        />
      </div>
    ),
  },
  {
    id: "terminal-block-states",
    title: "Terminal block states",
    category: "content",
    notes:
      "Still running (3 of 5 lines), then a failed run with ANSI and stderr.",
    render: () => (
      <div className="flex flex-col gap-3">
        <TerminalBlock
          command="pnpm vitest run bridge"
          lines={LINES}
          visibleCount={3}
          done={false}
        />
        <TerminalBlock
          cwd="~/assistant-ui"
          command="pnpm build"
          lines={[
            "\u001b[1mBuilding package\u001b[0m",
            "\u001b[2mChecking entrypoints\u001b[0m",
            "\u001b[33mwarn\u001b[0m webview bundle is 6.4 MB",
          ]}
          stderr={[
            "Error: missing export from ./runtime in /Users/someone/projects/assistant-ui/packages/vscode/src/webview/index.ts",
          ]}
          visibleCount={4}
          done
          exitCode={1}
          durationMs={1200}
        />
      </div>
    ),
  },
]);
