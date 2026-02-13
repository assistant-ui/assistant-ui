## Project Context: `happy-agents`

This project, on GitButler virtual branch (`happy-agents`) tracks the progressive-disclosure `agents.md` implementation for assistant-ui. The goal is to provide high-signal, low-noise runtime context to coding agents by keeping top-level guidance minimal and scoping deeper instructions to package/app directories.

### Purpose
- Provide a high-signal, low-noise runtime context to coding agents.
- Document unintuitive patterns, easy misunderstandings, and other pitfalls in an agent-friendly format.
- Provide the high level guidance needed to help agents best avoid common mistakes without over constraining them.

### Scope
- Apply repository-wide progressive documentation structure.

## GitButler

> [!IMPORTANT]
> This local clone of the assistant-ui monorepo is managed with GitButler.
> Do not use `git` action commands - they will conflict with and break the GitButler workspace.
> Use the `but` CLI for all actions. Only read-only git commands are permitted.

### Relevant Command Examples
- `but --help`
- `but diff --help`
- `but commit --help`
- `but status`
- `but diff happy-agents`
- `but checkout happy-agents`

## Required Documentation References

- `AGENTS-MD-RESEARCH.md` (repo-local design/research notes for progressive AGENTS/CLAUDE patterns)
- `AGENTS.md Official Website` — https://agents.md/
- `Anthropic: Using CLAUDE.md Files` — https://claude.com/blog/using-claude-md-files
- `Anthropic: Effective Context Engineering` — https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- `Claude Code Documentation` — https://code.claude.com/docs/en/best-practices
- `Vercel: AGENTS.md vs skills` — https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals
- `Progressive disclosure for AI coding tools` — https://alexop.dev/posts/stop-bloating-your-claude-md-progressive-disclosure-ai-coding-tools/
- `AIHero: A Complete Guide to AGENTS.md` — https://www.aihero.dev/a-complete-guide-to-agents-md
