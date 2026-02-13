# AGENTS.md / CLAUDE.md Best Practices Research

> Compiled: February 2026
> Purpose: Reference for improving assistant-ui's progressive disclosure AGENTS.md files

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Standard: AGENTS.md vs CLAUDE.md](#the-standard)
3. [Progressive Disclosure Architecture](#progressive-disclosure-architecture)
4. [File Structure & Sizing](#file-structure--sizing)
5. [Monorepo Patterns](#monorepo-patterns)
6. [What To Include](#what-to-include)
7. [What To Avoid](#what-to-avoid)
8. [Context Engineering Principles](#context-engineering-principles)
9. [Evaluation Data](#evaluation-data)
10. [Agent-Centric Design](#agent-centric-design)
11. [Implementation Checklist](#implementation-checklist)
12. [Sources](#sources)

---

## Executive Summary

**Key findings from 2025-2026 research:**

| Principle | Recommendation |
|-----------|----------------|
| Root file size | Under 60 lines (~500 tokens) |
| Nested file size | 60-100 lines per package |
| Total monorepo | Under 10k words for performance |
| Naming | `AGENTS.md` + symlink to `CLAUDE.md` |
| Focus | "Error → Cause → Fix" over architecture explanations |
| Root scope | A one-sentence project description + package manager + non-standard build/typecheck commands are usually enough at top level |
| Loading | Lazy - nested files load only when agent works in that directory |

**The core insight:**
> "Claude is already smart enough—intelligence is not the bottleneck, context is."
> — Anthropic Engineering

---

## The Standard

### AGENTS.md
- **Governance**: Agentic AI Foundation (Linux Foundation)
- **Adoption**: 60,000+ repositories
- **Support**: GitHub Copilot, OpenAI Codex, Cursor, Windsurf, Google Jules, Aider, Zed, Factory, Amp, RooCode
- **Format**: Plain Markdown, uppercase filename, no required structure

### CLAUDE.md
- **Governance**: Anthropic
- **Support**: Claude Code only
- **Unique features**: Skills (`.claude/skills/`), Commands (`.claude/commands/`), Hooks

### Compatibility Strategy
```bash
# Keep AGENTS.md as primary, symlink for Claude Code support
ln -s AGENTS.md CLAUDE.md
```

---

## Progressive Disclosure Architecture

### The Problem
- AI tools are stateless (context resets each session)
- Large instruction files consume precious context window
- A 2000-line CLAUDE.md uses ~15% of context before work begins
- "Context rot": performance degrades as irrelevant context accumulates

### Three-Tier Solution

| Tier | What | Token Cost | When Loaded |
|------|------|------------|-------------|
| **Tier 1** | Root CLAUDE.md | ~400 tokens | Always (startup) |
| **Tier 2** | `/docs` folder | On-demand | When agent reads them |
| **Tier 3** | Nested CLAUDE.md | On-demand | When working in that directory |

### Root File as Index
The root file should be a **navigation hub**, not a knowledge dump:

```markdown
# Project Name

One-sentence description.

## Commands
pnpm install && pnpm build   # Required first
pnpm test                    # Run tests
pnpm lint:fix               # Fix linting

## Stack
Next.js 15, TypeScript, Tailwind

## Further Reading
**IMPORTANT:** Read relevant docs before starting tasks.
- docs/architecture.md
- docs/gotchas.md

## Package-Specific Guidance
| Area | Location | When to Check |
|------|----------|---------------|
| Core | packages/core/CLAUDE.md | Runtime issues |
| UI | packages/ui/CLAUDE.md | Component styling |
```

The **IMPORTANT** directive signals Claude to actively load contextual docs.

---

## File Structure & Sizing

### Token Budget Math

| File Size | Tokens | % of 200k Context |
|-----------|--------|-------------------|
| 50 lines | ~400 | 0.2% |
| 300 lines | ~2,400 | 1.2% |
| 1000 lines | ~8,000 | 4% |
| 2000 lines | ~16,000 | 8% |

### Recommended Sizes
- **Root CLAUDE.md**: 50-60 lines max
- **Package CLAUDE.md**: 60-100 lines (enough depth, not bloated)
- **Docs files**: As needed (loaded on-demand)

### Instruction Budget
Frontier LLMs reliably follow **150-200 instructions**. Claude Code's system prompt already uses ~50. Every instruction in your CLAUDE.md competes for this budget.

---

## Monorepo Patterns

### Loading Behavior (Claude Code)

1. **Ancestors load at startup** - Walks UP directory tree from CWD
2. **Descendants load lazily** - Only when interacting with files in those directories
3. **Siblings never cross-pollinate** - `frontend/CLAUDE.md` won't load `backend/CLAUDE.md`

### Resolution Rules
- Files are **additive** - all levels contribute simultaneously
- More specific instructions take precedence
- User prompts override everything

### Recommended Structure
```
monorepo/
├── AGENTS.md                    # Root: navigation + shared commands
├── CLAUDE.md -> AGENTS.md       # Symlink for Claude Code support
├── docs/
│   ├── ARCHITECTURE.md          # System overview (on-demand)
│   ├── GOTCHAS.md               # Hard-won lessons (on-demand)
│   └── TESTING.md               # Test strategy (on-demand)
├── packages/
│   ├── core/
│   │   └── AGENTS.md            # Core-specific (lazy-loaded)
│   ├── ui/
│   │   └── AGENTS.md            # UI-specific (lazy-loaded)
│   └── api/
│       └── AGENTS.md            # API-specific (lazy-loaded)
└── apps/
    └── docs/
        └── AGENTS.md            # Docs site specific (lazy-loaded)
```

### Scale Reference
OpenAI's main repository contains **88 AGENTS.md files**.

---

## What To Include

### Essential Sections (Every File)

1. **Breadcrumb Header** - Points back to root
   ```markdown
   # @scope/package-name

   > Part of monorepo. See root [CLAUDE.md](../../CLAUDE.md) for build commands.
   ```

2. **Build First** - Prevent "module not found" errors
   ```markdown
   ## Build First
   pnpm install && pnpm build   # REQUIRED - packages depend on each other
   ```

3. **Numbered Gotchas** - Landmines the agent would step on
   ```markdown
   ## Gotchas
   1. `"use client"` required on 57 of 79 files
   2. `aui-` class prefix required for all components
   3. Build order: core → ui → integrations
   ```

4. **Error → Cause → Fix Table**
   ```markdown
   ## Common Errors

   | Error | Cause | Fix |
   |-------|-------|-----|
   | `Cannot find module 'X'` | Missing build | Run `pnpm build` first |
   | `undefined is not an object` | Version mismatch | Align package versions |
   | Hydration mismatch | Missing "use client" | Add directive |
   ```

5. **If Debugging X, Look at Y**
   ```markdown
   ## Debugging Guide

   | Problem | Start Here |
   |---------|------------|
   | Messages in wrong thread | src/sync/messages.ts |
   | Tool results missing | src/handlers/tool.ts |
   | Streaming corruption | src/stream/parser.ts |
   ```

6. **Boundaries** - What's safe vs needs confirmation
   ```markdown
   ## Boundaries

   ### Safe (no confirmation needed)
   - Running tests
   - Reading any file
   - Adding new test files

   ### Ask First
   - Modifying shared utilities
   - Changing API signatures

   ### Never
   - Committing secrets
   - Force-pushing to main
   ```

### Cross-References
- Link related packages bidirectionally
- Reference root for shared patterns (don't duplicate)
- Point to specific test files for critical paths

---

## What To Avoid

### Anti-Patterns

| Pattern | Why It's Bad | Alternative |
|---------|--------------|-------------|
| ASCII architecture diagrams | Agent learns from code, not diagrams | "If debugging X, look at Y" |
| Package index tables | `ls packages/` exists | Navigation table with "when to check" |
| Generic "Common Tasks" prose | Not useful during debugging | Specific error mappings |
| Duplicating linter rules | Linters enforce faster/cheaper | One line: "Run `pnpm lint:fix`" |
| Copying content from root | Creates staleness | "See root CLAUDE.md for X" |
| Example code without context | Doesn't help fix bugs | Point to real files |
| Auto-generated AGENTS files | Add broad, noisy defaults with low signal | Build concise, manual guidance and split by domain |
| Vague instructions | "Write clean code" | "Use early returns over nesting" |
| Documenting filesystem structure | Paths drift and become stale | Document capabilities/domain concepts with safe fallbacks |

### The Backpressure Principle
Let deterministic tools do their job:
- **ESLint** → Code style (don't document formatting rules)
- **TypeScript** → Type safety (don't repeat type conventions)
- **Prettier** → Formatting (don't document spacing)
- **Tests** → Correctness (document test commands, not patterns)

One line replaces 200 lines of prose:
```markdown
Run `pnpm lint:fix && pnpm typecheck` after code changes.
```

### Staleness Poisoning
Unlike humans, agents read documentation without skepticism. Outdated information actively harms performance.
- **Reference files** instead of copying content
- **Review quarterly** and remove outdated patterns
- **Version in git** to track evolution

---

## Context Engineering Principles

### The Four Strategies (Anthropic)

1. **Write (Offloading)** - Save info outside context window
2. **Select (Retrieval)** - Pull in only what's needed (file paths, not contents)
3. **Compress (Summarization)** - Retain only essential tokens
4. **Isolate (Multi-Agent)** - Split across sub-agents with own context windows

### "Lost in the Middle" Problem
LLMs exhibit a **U-shaped attention curve**:
- **High attention**: Beginning and end of context
- **Low attention**: Middle (performance drops 30%+)

**Solution**: Position most important content at start/end.

### Token Economics
- Average input-to-output ratio: ~100:1
- KV-cache reduces costs 10x for stable prefixes
- **Keep prompt prefixes stable** - single-token changes invalidate cache

---

## Evaluation Data

### Vercel's Findings (2026)

| Approach | Pass Rate |
|----------|-----------|
| AGENTS.md with 8KB compressed index | **100%** |
| Skills with explicit instructions | 79% |
| Skills (default) | 53% |

**Why passive context won:**
1. Eliminates decision points (no "should I retrieve?" moment)
2. Consistent availability (always in system prompt)
3. No sequencing complications (explore vs consult ordering)

**Key insight**: In 56% of eval cases, skills were never invoked despite being available.

### Compression Strategy
Vercel compressed 40KB of documentation to 8KB (80% reduction) using pipe-delimited indexing while maintaining perfect performance.

---

## Agent-Centric Design

### What Agents Actually Need (Critic Feedback)

**High Value:**
- Error → Cause → File location mappings
- "If debugging X, look at Y" pointers
- Critical gotchas (landmines)
- Data flow for core operations
- Which example to use for reproducing specific bugs
- Test file locations for critical paths

**Low Value:**
- Architecture overview diagrams (learn from code)
- Package index tables (can `ls`)
- Generic patterns (example code without context)
- Deprecated hooks tables (migration-specific)
- Testing pattern prose (just give the command)

### The Verdict
> "The docs explain *what things are* but not *how to fix them when broken*."

An agent doesn't need to understand the whole system. It needs to know **where to look when something specific breaks**.

---

## Implementation Checklist

### Per-File Quality Check

- [ ] Breadcrumb header pointing to root
- [ ] "Build First" section at top
- [ ] Numbered gotchas list (not prose)
- [ ] Error → Cause → Fix table
- [ ] "If Debugging X, Look at Y" table
- [ ] "Boundaries" section (Safe / Ask First / Never)
- [ ] Cross-references to related packages
- [ ] No content duplicating root (reference instead)
- [ ] Line count: 60-100 (adequate depth, not bloated)
- [ ] Actionable fixes (not vague "check X")
- [ ] Symlink created for AGENTS.md

### Maintenance Triggers

| Trigger | Action |
|---------|--------|
| Agent made preventable mistake | Add to Gotchas section |
| New error pattern discovered | Add to Error table |
| Package API changed | Update affected files |
| Quarterly review | Remove stale patterns |
| After incidents | Every mistake = missing documentation |

### AGENTS Refactor Playbook

- Step 1: Measure first
  - If a file starts to exceed 60 lines at root or 100 lines in nested scope, mark it for refactor.
- Step 2: Split by signal, not by topic
  - Keep command/build/run guidance in the current file.
  - Move deep architecture details into scoped nested files or existing docs.
  - Keep only immediate agent-relevant instructions in each file.
- Step 3: Reindex with boundaries
  - Add a short "where to continue" pointer list: root → nested package/app docs.
  - Add explicit "Safe / Ask First / Never" boundaries after each behavioral section.
- Step 4: Replace verbosity with triage
  - Convert broad text into "Error → Cause → Fix" and "Debugging X, Start At Y" tables.
- Step 5: Validate recursively
  - Remove duplicate guidance between parent and child files.
  - Confirm each new nested file has a unique purpose and can be justified by agent mistakes prevented.

---

## Sources

### Official Resources
- [AGENTS.md Official Website](https://agents.md/)
- [Anthropic: Using CLAUDE.md Files](https://claude.com/blog/using-claude-md-files)
- [Anthropic: Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Claude Code Documentation](https://code.claude.com/docs/en/best-practices)

### Best Practices Guides
- [The Complete Guide to CLAUDE.md - Builder.io](https://www.builder.io/blog/claude-md-guide)
- [A Complete Guide to AGENTS.md - AI Hero](https://www.aihero.dev/a-complete-guide-to-agents-md)
- [Writing a Good CLAUDE.md - HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [Creating the Perfect CLAUDE.md - Dometrain](https://dometrain.com/blog/creating-the-perfect-claudemd-for-claude-code/)

### Progressive Disclosure
- [Stop Bloating Your CLAUDE.md - alexop.dev](https://alexop.dev/posts/stop-bloating-your-claude-md-progressive-disclosure-ai-coding-tools/)
- [Progressive Disclosure for AI Agents - Honra](https://www.honra.ai/articles/progressive-disclosure-for-ai-agents)

### Evaluation & Research
- [AGENTS.md Outperforms Skills - Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
- [Context Engineering Lessons from Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)

### Monorepo Patterns
- [Claude Code in Large Monorepos - AI Developer Accelerator](https://www.skool.com/ai-developer-accelerator/using-claude-code-in-a-large-monorepo-practical-questions-about-structure-discoverability-workflow)
- [Nested CLAUDE.md Context - GitHub Issue](https://github.com/anthropics/claude-code/issues/705)
