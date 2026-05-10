# `assistant-ui` CLI

The `assistant-ui` CLI for adding components and dependencies to your project.

## Usage

Use the `init` command to initialize assistant-ui in an existing project.

The `init` command installs dependencies, adds components, and configures your project for assistant-ui.

```bash
npx assistant-ui@latest init
npx assistant-ui@latest init --yes  # non-interactive / CI / agent mode
```

If no existing project is found (no `package.json`), `init` forwards to `create`.
Passing `--preset` to `init` also forwards to `create` for compatibility.

## create

Use the `create` command to scaffold a new Next.js project with assistant-ui.

The `create` command scaffolds a project from assistant-ui starter templates or examples.

```bash
npx assistant-ui@latest create my-app
```

You can choose from multiple templates:

```bash
# Default template with Vercel AI SDK
npx assistant-ui@latest create my-app

# Minimal starter
npx assistant-ui@latest create my-app -t minimal

# With Assistant Cloud for persistence
npx assistant-ui@latest create my-app -t cloud

# With Assistant Cloud + Clerk auth
npx assistant-ui@latest create my-app -t cloud-clerk

# With LangGraph starter template
npx assistant-ui@latest create my-app -t langgraph

# With MCP starter template
npx assistant-ui@latest create my-app -t mcp

# With playground preset configuration
npx assistant-ui@latest create my-app --preset "https://www.assistant-ui.com/playground/init?preset=chatgpt"
```

## add

Use the `add` command to add components to your project.

The `add` command adds a component to your project and installs all required dependencies.

```bash
npx assistant-ui@latest add [component]
```

### Example

```bash
npx assistant-ui@latest add thread
```

You can also add multiple components at once:

```bash
npx assistant-ui@latest add thread thread-list assistant-modal
```

## update

Use the `update` command to update all assistant-ui packages to their latest versions.

```bash
npx assistant-ui@latest update
```

## upgrade

Use the `upgrade` command to automatically migrate your codebase when upgrading to a new major version.

The `upgrade` command runs codemods to transform your code and prompts to install new dependencies.

```bash
npx assistant-ui@latest upgrade
```

## info

Use the `info` command to print your environment and package versions for bug reports.

```bash
npx assistant-ui info
```

This command collects and prints:
- OS, Node.js version, package manager, and framework
- All installed `@assistant-ui/*` and `assistant-*` package versions
- Key ecosystem dependency versions (React, Next.js, AI SDK, etc.)
- Peer dependency warnings if any mismatches are detected

**Example output:**

```
Environment:
  OS:               macOS 15.3 (arm64)
  Node.js:          v22.14.0
  Package Manager:  pnpm 10.32.1
  Framework:        Next.js 15.3.1

Packages:
  @assistant-ui/react            0.12.15
  @assistant-ui/react-ai-sdk     1.3.12
  @assistant-ui/react-markdown   0.3.8
  assistant-stream                0.2.14

Ecosystem:
  react      19.1.0
  react-dom  19.1.0
  next       15.3.1
  ai         6.0.120
```

The output includes a copy-pasteable markdown block that you can paste directly into a bug report.

**Options:**
- `-c, --cwd <cwd>` - the working directory. defaults to the current directory.

## Documentation

Visit https://assistant-ui.com/docs/cli to view the full documentation.

## License

Licensed under the [MIT license](https://github.com/assistant-ui/assistant-ui/blob/main/LICENSE).
