# `@assistant-ui/agent-launcher`

Spawn the [Claude Code](https://www.anthropic.com/claude-code) CLI with a chosen plugin directory, skill, and prompt.

Used internally by the `assistant-ui` CLI's `agent` command. Call it directly when wiring up your own integration that bundles Claude Code plugins or skills.

## Installation

```bash
npm install @assistant-ui/agent-launcher
```

The `claude` CLI must be available on `PATH`. If it is missing, `launch` prints an install hint and exits with code 1.

## Usage

```typescript
import { launch } from "@assistant-ui/agent-launcher";

launch({
  pluginDir: "/absolute/path/to/plugins", // forwarded as --plugin-dir
  skillName: "assistant-ui",              // optional; sends /<skill> <prompt>
  prompt: "Add a thread component to this project.",
  dry: false,                              // print command without spawning
});
```

The child process inherits `stdio`, so output streams directly to the parent terminal. `launch` exits the parent with the child's status code on non-zero exit.
