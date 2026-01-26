# Agent Skills

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

- [Agent Skills]()

# Agent Skills[](#agent-skills)

[Agent Skills](https://agentskills.io/) are instruction sets that guide AI coding agents through tasks. When you invoke a skill, the agent takes the lead — it asks clarifying questions, makes decisions based on your codebase, and executes the work.

This repository provides two skills:

- [**create-mcp-app**](https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/create-mcp-app/SKILL.md) — scaffolds a new MCP App with an interactive UI

- [**migrate-oai-app**](https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/migrate-oai-app/SKILL.md) — migrates an existing OpenAI App to the MCP Apps SDK

## Install the Skills[](#install-the-skills)

Choose one of the following installation methods based on your agent:

### Option 1: Claude Code Plugin[](#option-1-claude-code-plugin)

Install via Claude Code:

```
`/plugin marketplace add modelcontextprotocol/ext-apps
/plugin install mcp-apps@modelcontextprotocol-ext-apps
`Copy
```

### Option 2: Vercel Skills CLI[](#option-2-vercel-skills-cli)

Use the [Vercel Skills CLI](https://skills.sh/) to install skills across different AI coding agents:

```
`npx skills add modelcontextprotocol/ext-apps
`Copy
```

### Option 3: Manual Installation[](#option-3-manual-installation)

Clone the repository:

```
`git clone https://github.com/modelcontextprotocol/ext-apps.git
`Copy
```

Then copy the skills from `plugins/mcp-apps/skills/` to your agent's skills directory. See your agent's documentation for the correct location:

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/skills)

- [VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills) / [GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)

- [Codex](https://developers.openai.com/codex/skills/)

- [Gemini CLI](https://geminicli.com/docs/cli/skills/)

- [Cline](https://docs.cline.bot/features/skills#skills)

- [Goose](https://block.github.io/goose/docs/guides/context-engineering/using-skills/)

## Verify Installation[](#verify-installation)

Ask your agent "What skills do you have?" — you should see `create-mcp-app` and `migrate-oai-app` among the available skills.

## Invoke a Skill[](#invoke-a-skill)

Try invoking the skills by asking your agent:

- "Create an MCP App" — scaffolds a new MCP App with an interactive UI

- "Migrate from OpenAI Apps SDK" — converts an existing OpenAI App to use the MCP Apps SDK

The agent will guide you through the process, asking clarifying questions as needed.

## Test Your App[](#test-your-app)

After creating or migrating your MCP App, see the [Testing MCP Apps](Testing_MCP_Apps.html) guide to run and debug it locally.

### Settings

Member Visibility
- Protected
- Inherited
- External

ThemeOSLightDark
### On This Page

[Agent Skills](#agent-skills)
- [Install the Skills](#install-the-skills)
- 
[Option 1: Claude Code Plugin](#option-1-claude-code-plugin)
- [Option 2: Vercel Skills CLI](#option-2-vercel-skills-cli)
- [Option 3: Manual Installation](#option-3-manual-installation)

- [Verify Installation](#verify-installation)
- [Invoke a Skill](#invoke-a-skill)
- [Test Your App](#test-your-app)

[GitHub](https://github.com/modelcontextprotocol/ext-apps)[Specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)[@modelcontextprotocol/ext-apps - v1.0.0](../modules.html)
- Loading...