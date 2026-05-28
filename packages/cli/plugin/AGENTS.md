# AGENTS.md

This file provides context for AI coding assistants (Cursor, GitHub Copilot, Claude Code, etc.) working with assistant-ui generated app skills.

## Project Overview

The **assistant-ui Agent Skills** bundle provides official agent guidance for coding agents working with [assistant-ui](https://www.assistant-ui.com). These skills help AI assistants write accurate assistant-ui code using the current docs, CLI, architecture guidance, migrations, and common pitfalls.

- **assistant-ui Framework**: https://github.com/assistant-ui/assistant-ui
- **Documentation**: https://www.assistant-ui.com/docs
- **LLM Docs Index**: https://www.assistant-ui.com/llms.txt
- **License**: MIT

## Repository Structure

| Directory | Description |
| --- | --- |
| `skills/` | Agent skill definitions |
| `skills/assistant-ui/` | Single comprehensive assistant-ui skill with progressive disclosure |

## Specification

Fetch the up-to-date [Agent Skills Specification](https://agentskills.io/specification.md) for details on skill structure, frontmatter fields, and best practices.

## Development Guidelines

### Updating Existing Skills

1. **Validate against current docs**: Always verify patterns against assistant-ui docs and the latest assistant-ui source code.
2. **Use hosted docs**: Check `https://www.assistant-ui.com/llms.txt` for current docs structure.
3. **Test patterns**: Ensure all code examples are runnable.
4. **Update references**: Keep migration guidance and common pitfalls current.
5. **Version alignment**: Note which assistant-ui versions the patterns support when relevant.

### Code Pattern Requirements

- **Completeness**: Patterns should be copy-paste ready.
- **Validation**: All APIs must be verified against current assistant-ui docs or codebase.
- **TODO placeholders**: Use `// TODO:` for user customization points.
- **Imports**: Include all necessary import statements.
- **Comments**: Explain non-obvious concepts, not syntax.
- **No marketing language**: Technical documentation only.
