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

The `create` command uses `create-next-app` with assistant-ui starter templates.

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

## Documentation

Visit https://assistant-ui.com/docs/cli to view the full documentation.

## License

Licensed under the [MIT license](https://github.com/assistant-ui/assistant-ui/blob/main/LICENSE).
