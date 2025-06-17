# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start the Next.js development server
- `pnpm build` - Build the documentation (runs `build:docs` first, then `next build`)
- `pnpm build:docs` - Generate TypeScript documentation from type definitions
- `pnpm lint` - Run ESLint

## Architecture Overview

This is a Next.js documentation site for the assistant-ui library, built with Fumadocs for MDX-based documentation.

### Key Structure

- **Content Management**: Uses Fumadocs MDX for documentation, with content in `content/docs/` and `content/blog/`
- **Documentation Generation**: The `scripts/generate-docs.mts` script uses ts-morph to automatically generate API documentation from TypeScript types defined in `content/types-to-generate/typeDocs.ts`
- **Component Library**: The app showcases assistant-ui components with live examples in `components/` organized by integration type (chatgpt, claude, perplexity, etc.)
- **Workspace Dependencies**: Uses workspace packages (`@assistant-ui/*`) for all core functionality

### Component Organization

- `components/assistant-ui/` - Core assistant-ui component demos
- `components/docs-chat/` - Documentation-specific chat implementations
- `components/samples/` - Interactive component samples
- `app/(home)/` - Marketing pages (showcase, pricing, examples)
- `app/docs/` - Documentation pages using Fumadocs layout

### Configuration

- **Fumadocs**: Configured in `source.config.ts` with Twoslash TypeScript integration, Mermaid diagrams, and custom code highlighting
- **Next.js**: Transpiles workspace packages, configured for MDX processing
- **Build Process**: Two-step build that generates docs first, then builds the Next.js app

The site serves as both documentation and a showcase for the assistant-ui library, with interactive examples demonstrating various AI provider integrations.