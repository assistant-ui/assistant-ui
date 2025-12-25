# Tool-UI MCP Standard Implementation Plan

## Overview

Create `@assistant-ui/tool-ui` - a new package in the assistant-ui monorepo that establishes the standard for MCP servers to provide rich, interactive UI components. This package will enable MCP tool results to render as beautiful, schema-validated, lifecycle-aware components inline in chat interfaces.

**Goal**: Make assistant-ui + tool-ui THE reference implementation for MCP UI rendering, positioning it for adoption into SEP-1865.

## Current State Analysis

### assistant-ui (target monorepo)
- **Location**: `/Users/sam/Desktop/work/assistant-ui`
- **Structure**: Monorepo with 20+ packages under `packages/`
- **Tool rendering**: `makeAssistantToolUI()` registers components by `toolName`
- **Key files**:
  - `packages/react/src/model-context/makeAssistantToolUI.tsx` - Tool UI factory
  - `packages/react/src/client/Tools.ts` - Tool registry
  - `packages/react/src/primitives/message/MessageParts.tsx` - Rendering logic
- **Limitation**: No remote/async component loading - all UIs must be bundled

### tool-ui (source components)
- **Location**: `/Users/sam/Desktop/work/.wt/toolui/mcp_standard`
- **Components**: CodeBlock, Terminal, DataTable, MediaCard, Chart, Plan, OptionList, SocialPost
- **Patterns**: Schema-first (Zod), `surfaceId` identity, `footerActions`, lifecycle states
- **Design philosophy**: Collaborative triad (User ↔ Surface ↔ Assistant)

### Key Discoveries
- assistant-ui's `ToolUIDisplay` at `MessageParts.tsx:249-262` looks up components by `toolName`
- Tools stored as arrays: `Record<string, ToolCallMessagePartComponent[]>`
- Props injected at render: `args`, `result`, `argsText`, `addResult`, `resume`, `status`
- No existing infrastructure for remote component loading
- PSL entry `*.auiusercontent.com` enables security isolation for hosted components

## Desired End State

After this plan is complete:

1. **New package** `@assistant-ui/tool-ui` exists in assistant-ui monorepo with:
   - Core components (CodeBlock, Terminal, DataTable, etc.)
   - Remote component loading infrastructure (`<RemoteToolUI>`)
   - Schema definitions and validation utilities
   - Theme token system for consistent styling

2. **New package** `@assistant-ui/tool-ui-server` exists with:
   - MCP server SDK for creating UI-enabled tools
   - `createToolUIComponent()` factory with schema-first approach
   - Manifest generation utilities

3. **Integration with assistant-ui/react**:
   - `<MCPToolUIProvider>` auto-discovers and loads UI from MCP servers
   - Tiered trust model (native → remote-dom → sandboxed iframe)
   - Theme inheritance via CSS custom properties

4. **Infrastructure**:
   - Registry service at `registry.assistant-ui.com`
   - PSL-isolated hosting at `*.auiusercontent.com`
   - CLI for publishing (`npx @assistant-ui/tool-ui publish`)

### Verification
- [ ] `pnpm build` succeeds in assistant-ui monorepo
- [ ] `@assistant-ui/tool-ui` publishes to npm
- [ ] Example MCP server with UI renders in assistant-ui chat
- [ ] Remote component loads from `*.auiusercontent.com` in sandboxed iframe
- [ ] Theme tokens inherited by remote components

## What We're NOT Doing

- **Not replacing existing tool-ui repo** - it becomes docs/playground
- **Not building a full marketplace** - registry is discovery only (Phase 1)
- **Not implementing RemoteDom yet** - iframe-first for security (can add later)
- **Not requiring all MCP servers to have UI** - graceful fallback to text
- **Not breaking existing assistant-ui APIs** - purely additive

---

## Implementation Approach

**Strategy**: Ship working code first, then engage SEP-1865.

1. Create packages in assistant-ui monorepo
2. Port best components from tool-ui
3. Build remote loading infrastructure
4. Ship registry MVP
5. Propose to MCP working group with "here's what works"

---

## Phase 1: Package Structure & Core Components

### Overview
Create the `@assistant-ui/tool-ui` package structure and port core components from tool-ui repo.

### Changes Required

#### 1. Create package directory structure

**Directory**: `packages/tool-ui/`

```
packages/tool-ui/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── components/
│   │   ├── index.ts
│   │   ├── code-block/
│   │   │   ├── index.ts
│   │   │   ├── code-block.tsx
│   │   │   ├── schema.ts
│   │   │   └── styles.ts
│   │   ├── terminal/
│   │   │   ├── index.ts
│   │   │   ├── terminal.tsx
│   │   │   ├── schema.ts
│   │   │   └── styles.ts
│   │   ├── data-table/
│   │   │   └── ...
│   │   ├── media-card/
│   │   │   └── ...
│   │   └── shared/
│   │       ├── action-buttons.tsx
│   │       ├── schema.ts
│   │       └── utils.ts
│   ├── schemas/
│   │   ├── index.ts
│   │   ├── base.ts          # ToolUIId, SerializableAction, etc.
│   │   └── manifest.ts      # Component manifest schema
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── use-tool-ui.ts
│   │   └── use-action-buttons.ts
│   └── types/
│       ├── index.ts
│       └── component.ts
```

#### 2. Create package.json

**File**: `packages/tool-ui/package.json`

```json
{
  "name": "@assistant-ui/tool-ui",
  "version": "0.1.0",
  "description": "Rich UI components for MCP tool results in assistant-ui",
  "license": "MIT",
  "sideEffects": false,
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    },
    "./components": {
      "import": {
        "types": "./dist/components/index.d.ts",
        "default": "./dist/components/index.mjs"
      }
    },
    "./schemas": {
      "import": {
        "types": "./dist/schemas/index.d.ts",
        "default": "./dist/schemas/index.mjs"
      }
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "@assistant-ui/react": ">=0.11.0",
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "zod": "^3.23.0",
    "clsx": "^2.1.0",
    "class-variance-authority": "^0.7.0"
  },
  "devDependencies": {
    "@assistant-ui/react": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

#### 3. Create base schemas

**File**: `packages/tool-ui/src/schemas/base.ts`

```typescript
import { z } from "zod";

/**
 * Universal identifier for tool UI surfaces.
 * Must be unique within a conversation.
 */
export const ToolUIIdSchema = z.string().min(1);
export type ToolUIId = z.infer<typeof ToolUIIdSchema>;

/**
 * Serializable action for footer buttons.
 */
export const SerializableActionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  confirmLabel: z.string().optional(),
  variant: z
    .enum(["default", "destructive", "secondary", "ghost", "outline"])
    .default("default"),
  disabled: z.boolean().optional(),
  shortcut: z.string().optional(),
});

export type SerializableAction = z.infer<typeof SerializableActionSchema>;

/**
 * Actions configuration with layout options.
 */
export const SerializableActionsConfigSchema = z.object({
  items: z.array(SerializableActionSchema).min(1),
  align: z.enum(["left", "center", "right"]).default("right"),
  confirmTimeout: z.number().positive().default(3000),
});

export type SerializableActionsConfig = z.infer<typeof SerializableActionsConfigSchema>;

/**
 * Base props all tool UI components share.
 */
export const BaseToolUIPropsSchema = z.object({
  id: ToolUIIdSchema,
  footerActions: z
    .union([z.array(SerializableActionSchema), SerializableActionsConfigSchema])
    .optional(),
});

export type BaseToolUIProps = z.infer<typeof BaseToolUIPropsSchema>;

/**
 * Lifecycle status for tool UI components.
 */
export type ToolUIStatus =
  | { type: "invoking" }
  | { type: "streaming"; progress?: number }
  | { type: "interactive" }
  | { type: "committing"; actionId: string }
  | { type: "receipt"; actionId: string; timestamp: Date }
  | { type: "error"; message: string };
```

#### 4. Port CodeBlock component

**File**: `packages/tool-ui/src/components/code-block/schema.ts`

```typescript
import { z } from "zod";
import { BaseToolUIPropsSchema } from "../../schemas/base";

export const CodeBlockPropsSchema = BaseToolUIPropsSchema.extend({
  code: z.string(),
  language: z.string().default("text"),
  filename: z.string().optional(),
  showLineNumbers: z.boolean().default(true),
  highlightLines: z.array(z.number()).optional(),
  maxCollapsedLines: z.number().min(1).optional(),
});

export type CodeBlockProps = z.infer<typeof CodeBlockPropsSchema> & {
  isLoading?: boolean;
  onAction?: (actionId: string) => void | Promise<void>;
  className?: string;
};

export const SerializableCodeBlockSchema = CodeBlockPropsSchema;
export type SerializableCodeBlock = z.infer<typeof SerializableCodeBlockSchema>;
```

**File**: `packages/tool-ui/src/components/code-block/code-block.tsx`

```typescript
"use client";

import * as React from "react";
import { cn } from "../../utils/cn";
import { CodeBlockProps, CodeBlockPropsSchema } from "./schema";
import { ActionButtons } from "../shared/action-buttons";

export const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  (props, ref) => {
    const {
      id,
      code,
      language,
      filename,
      showLineNumbers,
      highlightLines,
      maxCollapsedLines,
      footerActions,
      isLoading,
      onAction,
      className,
    } = props;

    const [isCollapsed, setIsCollapsed] = React.useState(
      maxCollapsedLines !== undefined
    );
    const [copied, setCopied] = React.useState(false);

    const lines = code.split("\n");
    const shouldCollapse = maxCollapsedLines && lines.length > maxCollapsedLines;
    const displayedCode = isCollapsed && shouldCollapse
      ? lines.slice(0, maxCollapsedLines).join("\n")
      : code;

    const handleCopy = async () => {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) {
      return (
        <div ref={ref} className={cn("tool-ui-code-block-skeleton", className)}>
          <div className="animate-pulse bg-muted h-32 rounded-lg" />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        data-tool-ui-id={id}
        className={cn("tool-ui-code-block", className)}
      >
        {filename && (
          <div className="tool-ui-code-block-header">
            <span className="tool-ui-code-block-filename">{filename}</span>
            <span className="tool-ui-code-block-language">{language}</span>
          </div>
        )}

        <div className="tool-ui-code-block-content">
          <pre>
            <code className={`language-${language}`}>
              {showLineNumbers
                ? displayedCode.split("\n").map((line, i) => (
                    <div
                      key={i}
                      className={cn(
                        "tool-ui-code-line",
                        highlightLines?.includes(i + 1) && "highlighted"
                      )}
                    >
                      <span className="tool-ui-line-number">{i + 1}</span>
                      <span className="tool-ui-line-content">{line}</span>
                    </div>
                  ))
                : displayedCode}
            </code>
          </pre>
        </div>

        {shouldCollapse && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="tool-ui-code-block-expand"
          >
            {isCollapsed
              ? `Show ${lines.length - maxCollapsedLines!} more lines`
              : "Collapse"}
          </button>
        )}

        <div className="tool-ui-code-block-footer">
          <button onClick={handleCopy} className="tool-ui-copy-button">
            {copied ? "Copied!" : "Copy"}
          </button>

          {footerActions && (
            <ActionButtons
              actions={Array.isArray(footerActions) ? footerActions : footerActions.items}
              onAction={onAction}
            />
          )}
        </div>
      </div>
    );
  }
);

CodeBlock.displayName = "CodeBlock";
```

#### 5. Create shared ActionButtons

**File**: `packages/tool-ui/src/components/shared/action-buttons.tsx`

```typescript
"use client";

import * as React from "react";
import { cn } from "../../utils/cn";
import { SerializableAction } from "../../schemas/base";

export interface ActionButtonsProps {
  actions: SerializableAction[];
  align?: "left" | "center" | "right";
  confirmTimeout?: number;
  onAction?: (actionId: string) => void | Promise<void>;
  className?: string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  actions,
  align = "right",
  confirmTimeout = 3000,
  onAction,
  className,
}) => {
  const [confirming, setConfirming] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const handleClick = async (action: SerializableAction) => {
    if (action.confirmLabel && confirming !== action.id) {
      setConfirming(action.id);
      timeoutRef.current = setTimeout(() => setConfirming(null), confirmTimeout);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setConfirming(null);
    await onAction?.(action.id);
  };

  return (
    <div
      className={cn(
        "tool-ui-action-buttons",
        `align-${align}`,
        className
      )}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => handleClick(action)}
          disabled={action.disabled}
          className={cn(
            "tool-ui-action-button",
            `variant-${action.variant ?? "default"}`,
            confirming === action.id && "confirming"
          )}
        >
          {confirming === action.id ? action.confirmLabel : action.label}
        </button>
      ))}
    </div>
  );
};
```

#### 6. Create main exports

**File**: `packages/tool-ui/src/index.ts`

```typescript
// Components
export { CodeBlock } from "./components/code-block";
export { Terminal } from "./components/terminal";
export { DataTable } from "./components/data-table";
export { MediaCard } from "./components/media-card";
export { ActionButtons } from "./components/shared/action-buttons";

// Schemas
export * from "./schemas/base";
export * from "./components/code-block/schema";
export * from "./components/terminal/schema";
export * from "./components/data-table/schema";
export * from "./components/media-card/schema";

// Types
export type { ToolUIStatus } from "./schemas/base";

// Hooks
export { useToolUI } from "./hooks/use-tool-ui";
export { useActionButtons } from "./hooks/use-action-buttons";
```

### Success Criteria

#### Automated Verification:
- [x] Package builds: `cd packages/tool-ui && pnpm build`
- [ ] Types check: `cd packages/tool-ui && pnpm typecheck`
- [ ] Lint passes: `cd packages/tool-ui && pnpm lint`
- [ ] Monorepo builds: `pnpm build` from root

#### Manual Verification:
- [ ] CodeBlock renders correctly in example app
- [ ] Terminal renders with ANSI colors
- [ ] DataTable sorts and formats correctly
- [ ] ActionButtons confirm flow works
- [ ] Components match tool-ui visual design

---

## Phase 2: assistant-ui Integration Hooks

### Overview
Create hooks that bridge `@assistant-ui/tool-ui` components with assistant-ui's tool rendering system.

### Changes Required

#### 1. Create useToolUI hook

**File**: `packages/tool-ui/src/hooks/use-tool-ui.ts`

```typescript
"use client";

import { useEffect } from "react";
import { useAssistantToolUI, type ToolCallMessagePartComponent } from "@assistant-ui/react";
import { z } from "zod";

export interface ToolUIRegistration<TSchema extends z.ZodType, TResult = unknown> {
  toolName: string;
  schema: TSchema;
  component: React.ComponentType<{
    data: z.infer<TSchema>;
    result?: TResult;
    status: { type: string };
    onAction?: (actionId: string) => void;
  }>;
  /**
   * Transform raw tool args/result into component props.
   * Defaults to passing args directly.
   */
  transform?: (args: unknown, result?: TResult) => z.infer<TSchema>;
}

/**
 * Register a tool-ui component for rendering tool calls.
 *
 * @example
 * ```tsx
 * useToolUI({
 *   toolName: "show_code",
 *   schema: CodeBlockPropsSchema,
 *   component: CodeBlock,
 *   transform: (args) => ({
 *     id: `code-${args.filename}`,
 *     code: args.content,
 *     language: args.language,
 *     filename: args.filename,
 *   }),
 * });
 * ```
 */
export function useToolUI<TSchema extends z.ZodType, TResult = unknown>(
  registration: ToolUIRegistration<TSchema, TResult>
) {
  const { toolName, schema, component: Component, transform } = registration;

  useAssistantToolUI({
    toolName,
    render: ({ args, result, status }) => {
      // Transform or pass through
      const rawData = transform ? transform(args, result as TResult) : args;

      // Validate with schema
      const parseResult = schema.safeParse(rawData);
      if (!parseResult.success) {
        return (
          <div className="tool-ui-error">
            <p>Invalid tool data for {toolName}</p>
            <pre>{parseResult.error.message}</pre>
          </div>
        );
      }

      return (
        <Component
          data={parseResult.data}
          result={result as TResult}
          status={status}
        />
      );
    },
  });
}
```

#### 2. Create makeToolUI factory

**File**: `packages/tool-ui/src/factories/make-tool-ui.tsx`

```typescript
"use client";

import * as React from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { z } from "zod";

export interface MakeToolUIOptions<
  TSchema extends z.ZodType,
  TResult = unknown
> {
  toolName: string;
  schema: TSchema;
  render: React.ComponentType<{
    data: z.infer<TSchema>;
    result?: TResult;
    status: { type: string };
    addResult: (result: TResult) => void;
    onAction?: (actionId: string) => void;
  }>;
  transform?: (args: unknown, result?: TResult) => z.infer<TSchema>;
  fallback?: React.ReactNode;
}

/**
 * Create a self-registering tool UI component.
 *
 * @example
 * ```tsx
 * const CodeBlockToolUI = makeToolUI({
 *   toolName: "show_code",
 *   schema: CodeBlockPropsSchema,
 *   render: ({ data, status }) => (
 *     <CodeBlock {...data} isLoading={status.type === "running"} />
 *   ),
 * });
 *
 * // Use in app:
 * <AssistantRuntimeProvider runtime={runtime}>
 *   <CodeBlockToolUI />
 *   <Thread />
 * </AssistantRuntimeProvider>
 * ```
 */
export function makeToolUI<TSchema extends z.ZodType, TResult = unknown>(
  options: MakeToolUIOptions<TSchema, TResult>
) {
  const { toolName, schema, render: RenderComponent, transform, fallback } = options;

  return makeAssistantToolUI({
    toolName,
    render: ({ args, result, status, addResult }) => {
      const rawData = transform ? transform(args, result as TResult) : args;

      const parseResult = schema.safeParse(rawData);
      if (!parseResult.success) {
        if (fallback) return <>{fallback}</>;
        return (
          <div className="tool-ui-validation-error">
            <p>Schema validation failed for {toolName}</p>
            <details>
              <summary>Error details</summary>
              <pre>{JSON.stringify(parseResult.error.format(), null, 2)}</pre>
            </details>
          </div>
        );
      }

      return (
        <RenderComponent
          data={parseResult.data}
          result={result as TResult}
          status={status}
          addResult={addResult as (result: TResult) => void}
        />
      );
    },
  });
}
```

#### 3. Create pre-built tool UI components

**File**: `packages/tool-ui/src/tool-uis/code-block-tool-ui.tsx`

```typescript
"use client";

import { makeToolUI } from "../factories/make-tool-ui";
import { CodeBlock } from "../components/code-block";
import { SerializableCodeBlockSchema } from "../components/code-block/schema";

/**
 * Pre-built tool UI for code display tools.
 *
 * Expected tool args shape:
 * - code: string
 * - language?: string
 * - filename?: string
 *
 * @example
 * ```tsx
 * <AssistantRuntimeProvider runtime={runtime}>
 *   <CodeBlockToolUI />
 *   <Thread />
 * </AssistantRuntimeProvider>
 * ```
 */
export const CodeBlockToolUI = makeToolUI({
  toolName: "show_code",
  schema: SerializableCodeBlockSchema,
  render: ({ data, status }) => (
    <CodeBlock
      {...data}
      isLoading={status.type === "running"}
    />
  ),
  transform: (args: any) => ({
    id: `code-${args.filename ?? Date.now()}`,
    code: args.code ?? args.content ?? "",
    language: args.language ?? "text",
    filename: args.filename,
    showLineNumbers: args.showLineNumbers ?? true,
    highlightLines: args.highlightLines,
    maxCollapsedLines: args.maxCollapsedLines,
    footerActions: args.footerActions,
  }),
});
```

### Success Criteria

#### Automated Verification:
- [ ] Hooks compile without errors
- [ ] Types are correctly inferred from schemas
- [ ] No circular dependencies

#### Manual Verification:
- [ ] `useToolUI` registers component correctly
- [ ] `makeToolUI` self-registers on mount
- [ ] Schema validation errors display gracefully
- [ ] Transform function correctly maps args

---

## Phase 3: Remote Component Loading

### Overview
Build infrastructure for loading tool UI components from remote sources (MCP servers with UI capability).

### Changes Required

#### 1. Create RemoteToolUI component

**File**: `packages/tool-ui/src/remote/remote-tool-ui.tsx`

```typescript
"use client";

import * as React from "react";
import { cn } from "../utils/cn";

export interface RemoteToolUIProps {
  /** PSL-isolated subdomain URL */
  src: string;
  /** Tool name for identification */
  toolName: string;
  /** Props to pass to remote component */
  props: Record<string, unknown>;
  /** Callback when remote component emits action */
  onAction?: (actionId: string, payload?: unknown) => void;
  /** Callback to add tool result (for human-in-loop) */
  onAddResult?: (result: unknown) => void;
  /** Fallback while loading */
  fallback?: React.ReactNode;
  /** Error fallback */
  errorFallback?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

interface RemoteMessage {
  type: "ready" | "action" | "addResult" | "resize" | "error";
  payload?: unknown;
}

/**
 * Renders a tool UI component from a remote PSL-isolated source.
 *
 * Security model:
 * - Component runs in sandboxed iframe
 * - Only allow-scripts enabled (no same-origin)
 * - Communication via postMessage with origin validation
 * - PSL isolation prevents cross-component data access
 */
export const RemoteToolUI: React.FC<RemoteToolUIProps> = ({
  src,
  toolName,
  props,
  onAction,
  onAddResult,
  fallback,
  errorFallback,
  className,
}) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [height, setHeight] = React.useState(100);
  const [error, setError] = React.useState<string | null>(null);

  // Extract origin for validation
  const expectedOrigin = React.useMemo(() => {
    try {
      return new URL(src).origin;
    } catch {
      return null;
    }
  }, [src]);

  // Handle messages from iframe
  React.useEffect(() => {
    if (!expectedOrigin) return;

    const handleMessage = (event: MessageEvent<RemoteMessage>) => {
      // Validate origin (must be from our PSL-isolated domain)
      if (event.origin !== expectedOrigin) return;
      if (!event.data || typeof event.data.type !== "string") return;

      const { type, payload } = event.data;

      switch (type) {
        case "ready":
          setStatus("ready");
          // Send initial props
          iframeRef.current?.contentWindow?.postMessage(
            { type: "render", toolName, props },
            expectedOrigin
          );
          break;

        case "action":
          onAction?.(payload as string);
          break;

        case "addResult":
          onAddResult?.(payload);
          break;

        case "resize":
          if (typeof payload === "number" && payload > 0) {
            setHeight(Math.min(payload, 800)); // Cap at 800px
          }
          break;

        case "error":
          setStatus("error");
          setError(payload as string);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [expectedOrigin, toolName, props, onAction, onAddResult]);

  // Send updated props when they change
  React.useEffect(() => {
    if (status === "ready" && iframeRef.current?.contentWindow && expectedOrigin) {
      iframeRef.current.contentWindow.postMessage(
        { type: "update", props },
        expectedOrigin
      );
    }
  }, [status, props, expectedOrigin]);

  if (!expectedOrigin) {
    return errorFallback ?? <div className="tool-ui-error">Invalid source URL</div>;
  }

  if (status === "error") {
    return errorFallback ?? (
      <div className="tool-ui-error">
        <p>Failed to load remote component</p>
        {error && <pre>{error}</pre>}
      </div>
    );
  }

  return (
    <div className={cn("tool-ui-remote-container", className)}>
      {status === "loading" && (fallback ?? (
        <div className="tool-ui-remote-loading">
          <div className="animate-pulse bg-muted h-24 rounded-lg" />
        </div>
      ))}

      <iframe
        ref={iframeRef}
        src={src}
        sandbox="allow-scripts"
        style={{
          width: "100%",
          height: status === "ready" ? height : 0,
          border: "none",
          display: status === "ready" ? "block" : "none",
        }}
        title={`${toolName} UI`}
      />
    </div>
  );
};
```

#### 2. Create component manifest schema

**File**: `packages/tool-ui/src/schemas/manifest.ts`

```typescript
import { z } from "zod";

/**
 * Schema for a single component definition in the manifest.
 */
export const ComponentDefinitionSchema = z.object({
  /** Component name (used in tool results) */
  name: z.string().min(1),
  /** Human-readable description */
  description: z.string().optional(),
  /** Tool names this component handles */
  toolNames: z.array(z.string()).min(1),
  /** Zod-compatible JSON Schema for props validation */
  propsSchema: z.record(z.unknown()).optional(),
});

export type ComponentDefinition = z.infer<typeof ComponentDefinitionSchema>;

/**
 * Schema for the complete UI manifest from an MCP server.
 */
export const UIManifestSchema = z.object({
  /** Manifest schema version */
  version: z.literal("1.0"),
  /** Unique server identifier */
  serverId: z.string().min(1),
  /** Human-readable server name */
  serverName: z.string().optional(),
  /** URL to the component bundle */
  bundleUrl: z.string().url(),
  /** SHA-256 hash of the bundle for integrity verification */
  bundleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  /** Component definitions */
  components: z.array(ComponentDefinitionSchema).min(1),
  /** Required permissions */
  permissions: z.object({
    /** Allow network requests from component */
    network: z.boolean().default(false),
    /** Allow localStorage/sessionStorage */
    storage: z.boolean().default(false),
    /** Allow clipboard access */
    clipboard: z.boolean().default(false),
  }).default({}),
});

export type UIManifest = z.infer<typeof UIManifestSchema>;

/**
 * MCP server capability declaration for UI support.
 */
export const MCPUICapabilitySchema = z.object({
  /** UI capability version */
  version: z.literal("1.0"),
  /** Registry URL to fetch manifest from */
  registry: z.string().url(),
  /** Server ID in the registry */
  serverId: z.string().min(1),
  /** Bundle hash for verification */
  bundleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

export type MCPUICapability = z.infer<typeof MCPUICapabilitySchema>;
```

#### 3. Create MCPToolUIProvider

**File**: `packages/tool-ui/src/remote/mcp-tool-ui-provider.tsx`

```typescript
"use client";

import * as React from "react";
import { useAssistantToolUI } from "@assistant-ui/react";
import { RemoteToolUI } from "./remote-tool-ui";
import { UIManifest, UIManifestSchema, MCPUICapability } from "../schemas/manifest";

export interface MCPToolUIProviderProps {
  /** MCP servers with UI capability */
  servers: Array<{
    serverId: string;
    capability: MCPUICapability;
  }>;
  /** Custom registry URL (default: registry.assistant-ui.com) */
  registryUrl?: string;
  /** Fallback component for loading state */
  loadingFallback?: React.ReactNode;
  /** Fallback component for errors */
  errorFallback?: React.ReactNode;
  children: React.ReactNode;
}

interface LoadedManifest {
  manifest: UIManifest;
  baseUrl: string;
}

/**
 * Provider that auto-discovers and loads UI components from MCP servers.
 *
 * @example
 * ```tsx
 * <MCPToolUIProvider
 *   servers={[
 *     { serverId: "weather-mcp", capability: server.capabilities.ui }
 *   ]}
 * >
 *   <Thread />
 * </MCPToolUIProvider>
 * ```
 */
export const MCPToolUIProvider: React.FC<MCPToolUIProviderProps> = ({
  servers,
  registryUrl = "https://registry.assistant-ui.com",
  loadingFallback,
  errorFallback,
  children,
}) => {
  const [manifests, setManifests] = React.useState<Record<string, LoadedManifest>>({});
  const [loading, setLoading] = React.useState(true);

  // Fetch manifests for all UI-enabled servers
  React.useEffect(() => {
    const loadManifests = async () => {
      const results: Record<string, LoadedManifest> = {};

      await Promise.all(
        servers.map(async ({ serverId, capability }) => {
          try {
            const manifestUrl = `${capability.registry}/v1/servers/${serverId}/manifest.json`;
            const response = await fetch(manifestUrl);

            if (!response.ok) {
              console.warn(`Failed to fetch manifest for ${serverId}: ${response.status}`);
              return;
            }

            const data = await response.json();
            const parseResult = UIManifestSchema.safeParse(data);

            if (!parseResult.success) {
              console.warn(`Invalid manifest for ${serverId}:`, parseResult.error);
              return;
            }

            const manifest = parseResult.data;

            // Verify bundle hash matches capability declaration
            if (manifest.bundleHash !== capability.bundleHash) {
              console.warn(`Bundle hash mismatch for ${serverId}`);
              return;
            }

            results[serverId] = {
              manifest,
              baseUrl: `https://${serverId}.auiusercontent.com`,
            };
          } catch (error) {
            console.warn(`Error loading manifest for ${serverId}:`, error);
          }
        })
      );

      setManifests(results);
      setLoading(false);
    };

    loadManifests();
  }, [servers]);

  // Register tool UIs for all loaded manifests
  return (
    <>
      {Object.entries(manifests).map(([serverId, { manifest, baseUrl }]) => (
        <ManifestToolUIRegistrar
          key={serverId}
          manifest={manifest}
          baseUrl={baseUrl}
          loadingFallback={loadingFallback}
          errorFallback={errorFallback}
        />
      ))}
      {children}
    </>
  );
};

interface ManifestToolUIRegistrarProps {
  manifest: UIManifest;
  baseUrl: string;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

const ManifestToolUIRegistrar: React.FC<ManifestToolUIRegistrarProps> = ({
  manifest,
  baseUrl,
  loadingFallback,
  errorFallback,
}) => {
  // Register a tool UI for each component's tool names
  for (const component of manifest.components) {
    for (const toolName of component.toolNames) {
      useAssistantToolUI({
        toolName,
        render: ({ args, result, addResult }) => (
          <RemoteToolUI
            src={`${baseUrl}/render?component=${component.name}`}
            toolName={toolName}
            props={{ args, result }}
            onAddResult={addResult}
            fallback={loadingFallback}
            errorFallback={errorFallback}
          />
        ),
      });
    }
  }

  return null;
};
```

### Success Criteria

#### Automated Verification:
- [ ] RemoteToolUI compiles without errors
- [ ] Manifest schema validates correctly
- [ ] MCPToolUIProvider builds

#### Manual Verification:
- [ ] iframe loads from PSL-isolated domain
- [ ] postMessage communication works correctly
- [ ] Props passed to remote component
- [ ] Actions bubble up to parent
- [ ] Height auto-adjusts based on content
- [ ] Origin validation rejects invalid sources

---

## Phase 4: Server SDK

### Overview
Create `@assistant-ui/tool-ui-server` package for MCP server developers to easily create UI-enabled tools.

### Changes Required

#### 1. Create package structure

**Directory**: `packages/tool-ui-server/`

```
packages/tool-ui-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── create-tool-ui-server.ts
│   ├── create-tool-ui-component.ts
│   ├── manifest.ts
│   └── types.ts
```

#### 2. Create package.json

**File**: `packages/tool-ui-server/package.json`

```json
{
  "name": "@assistant-ui/tool-ui-server",
  "version": "0.1.0",
  "description": "SDK for creating UI-enabled MCP servers",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --dts --watch"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.23.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

#### 3. Create server factory

**File**: `packages/tool-ui-server/src/create-tool-ui-server.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export interface ToolUIServerOptions {
  /** Unique server identifier */
  serverId: string;
  /** Human-readable name */
  name: string;
  /** Server version */
  version: string;
  /** Registry URL for UI manifests */
  registryUrl?: string;
  /** Bundle hash for integrity verification */
  bundleHash: string;
}

export interface ToolWithUI<TArgs extends z.ZodType, TResult> {
  name: string;
  description: string;
  parameters: TArgs;
  /** UI component name to render results */
  component: string;
  /** Execute the tool */
  execute: (args: z.infer<TArgs>) => Promise<TResult>;
  /** Transform result into component props (optional) */
  transformResult?: (result: TResult, args: z.infer<TArgs>) => Record<string, unknown>;
}

/**
 * Create an MCP server with UI capability.
 *
 * @example
 * ```typescript
 * const { server, toolWithUI } = createToolUIServer({
 *   serverId: "weather-mcp",
 *   name: "Weather MCP",
 *   version: "1.0.0",
 *   bundleHash: "sha256:abc123...",
 * });
 *
 * toolWithUI({
 *   name: "get_weather",
 *   description: "Get weather for a location",
 *   parameters: z.object({ location: z.string() }),
 *   component: "WeatherCard",
 *   execute: async ({ location }) => fetchWeather(location),
 * });
 * ```
 */
export function createToolUIServer(options: ToolUIServerOptions) {
  const {
    serverId,
    name,
    version,
    registryUrl = "https://registry.assistant-ui.com",
    bundleHash,
  } = options;

  const server = new McpServer({
    name,
    version,
  });

  // Track registered components for manifest generation
  const components: Array<{
    name: string;
    toolNames: string[];
  }> = [];

  /**
   * Register a tool with UI component.
   */
  function toolWithUI<TArgs extends z.ZodType, TResult>(
    config: ToolWithUI<TArgs, TResult>
  ) {
    const { name: toolName, description, parameters, component, execute, transformResult } = config;

    // Track component registration
    const existingComponent = components.find(c => c.name === component);
    if (existingComponent) {
      existingComponent.toolNames.push(toolName);
    } else {
      components.push({ name: component, toolNames: [toolName] });
    }

    // Register with MCP server
    server.tool(toolName, description, parameters.shape, async (args) => {
      const result = await execute(args as z.infer<TArgs>);
      const componentProps = transformResult
        ? transformResult(result, args as z.infer<TArgs>)
        : result;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
        // Extended result with UI metadata
        _ui: {
          component,
          props: componentProps,
        },
      };
    });
  }

  /**
   * Get the UI capability object for initialization.
   */
  function getUICapability() {
    return {
      version: "1.0" as const,
      registry: registryUrl,
      serverId,
      bundleHash,
    };
  }

  /**
   * Generate manifest for registry publication.
   */
  function generateManifest() {
    return {
      version: "1.0" as const,
      serverId,
      serverName: name,
      bundleUrl: `https://${serverId}.auiusercontent.com/bundle.js`,
      bundleHash,
      components: components.map(c => ({
        name: c.name,
        toolNames: c.toolNames,
      })),
      permissions: {
        network: false,
        storage: false,
        clipboard: false,
      },
    };
  }

  return {
    server,
    toolWithUI,
    getUICapability,
    generateManifest,
  };
}
```

#### 4. Create component runtime for iframe

**File**: `packages/tool-ui-server/src/create-tool-ui-component.ts`

```typescript
import { z } from "zod";

export interface ToolUIComponentConfig<TSchema extends z.ZodType> {
  /** Component name (must match server registration) */
  name: string;
  /** Props schema for validation */
  schema: TSchema;
  /** Render function */
  render: (props: z.infer<TSchema>) => HTMLElement | string;
}

export interface ToolUIRuntime {
  /** Register a component */
  register: <TSchema extends z.ZodType>(config: ToolUIComponentConfig<TSchema>) => void;
  /** Start the runtime (call after all components registered) */
  start: () => void;
}

/**
 * Create a runtime for tool UI components in the iframe.
 *
 * @example
 * ```typescript
 * const runtime = createToolUIRuntime();
 *
 * runtime.register({
 *   name: "WeatherCard",
 *   schema: WeatherPropsSchema,
 *   render: (props) => `
 *     <div class="weather-card">
 *       <h2>${props.location}</h2>
 *       <p>${props.temperature}°</p>
 *     </div>
 *   `,
 * });
 *
 * runtime.start();
 * ```
 */
export function createToolUIRuntime(): ToolUIRuntime {
  const components = new Map<string, ToolUIComponentConfig<any>>();
  let currentProps: Record<string, unknown> | null = null;

  function register<TSchema extends z.ZodType>(config: ToolUIComponentConfig<TSchema>) {
    components.set(config.name, config);
  }

  function renderComponent(componentName: string, props: Record<string, unknown>) {
    const config = components.get(componentName);
    if (!config) {
      throw new Error(`Unknown component: ${componentName}`);
    }

    const parseResult = config.schema.safeParse(props);
    if (!parseResult.success) {
      throw new Error(`Invalid props: ${parseResult.error.message}`);
    }

    const output = config.render(parseResult.data);
    const container = document.getElementById("root");

    if (container) {
      if (typeof output === "string") {
        container.innerHTML = output;
      } else {
        container.innerHTML = "";
        container.appendChild(output);
      }

      // Report height to parent
      requestAnimationFrame(() => {
        const height = container.scrollHeight;
        window.parent.postMessage({ type: "resize", payload: height }, "*");
      });
    }
  }

  function start() {
    // Listen for messages from parent
    window.addEventListener("message", (event) => {
      const { type, toolName, props, component } = event.data || {};

      switch (type) {
        case "render":
          currentProps = props;
          try {
            // Component name comes from URL or message
            const componentName = component || new URLSearchParams(window.location.search).get("component");
            if (componentName) {
              renderComponent(componentName, props.args || props);
            }
          } catch (error) {
            window.parent.postMessage({
              type: "error",
              payload: error instanceof Error ? error.message : "Render failed",
            }, "*");
          }
          break;

        case "update":
          if (currentProps) {
            currentProps = { ...currentProps, ...props };
            // Re-render with updated props
            const componentName = new URLSearchParams(window.location.search).get("component");
            if (componentName) {
              renderComponent(componentName, currentProps);
            }
          }
          break;
      }
    });

    // Signal ready
    window.parent.postMessage({ type: "ready" }, "*");
  }

  return { register, start };
}

/**
 * Helper to emit actions to parent.
 */
export function emitAction(actionId: string, payload?: unknown) {
  window.parent.postMessage({ type: "action", payload: actionId }, "*");
}

/**
 * Helper to emit result (for human-in-loop tools).
 */
export function emitResult(result: unknown) {
  window.parent.postMessage({ type: "addResult", payload: result }, "*");
}
```

### Success Criteria

#### Automated Verification:
- [ ] Package builds: `cd packages/tool-ui-server && pnpm build`
- [ ] Types are correct
- [ ] No runtime dependencies on React

#### Manual Verification:
- [ ] Example MCP server starts correctly
- [ ] Tool calls return UI metadata
- [ ] Manifest generation produces valid JSON
- [ ] Component runtime works in iframe

---

## Phase 5: Registry & Hosting Infrastructure

### Overview
Set up the registry service and PSL-isolated hosting infrastructure.

### Changes Required

#### 1. Registry API design

**Endpoints**:
```
GET  /v1/servers                     - List all registered servers
GET  /v1/servers/:serverId           - Get server details
GET  /v1/servers/:serverId/manifest  - Get UI manifest
POST /v1/servers/:serverId/publish   - Publish/update server (authenticated)
```

#### 2. Hosting setup

**DNS Configuration**:
```
*.auiusercontent.com -> CDN/Edge function
```

**CDN Rules**:
- Serve static bundles from `{serverId}.auiusercontent.com/bundle.js`
- Serve render page from `{serverId}.auiusercontent.com/render`
- Add security headers (CSP, X-Frame-Options)

#### 3. CLI for publishing

**File**: `packages/tool-ui-server/src/cli.ts`

```typescript
#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import { createHash } from "crypto";

const program = new Command();

program
  .name("tool-ui")
  .description("CLI for publishing tool-ui components")
  .version("0.1.0");

program
  .command("publish")
  .description("Publish UI bundle to registry")
  .option("-s, --server-id <id>", "Server ID")
  .option("-b, --bundle <path>", "Path to bundle file")
  .option("-m, --manifest <path>", "Path to manifest file")
  .option("--registry <url>", "Registry URL", "https://registry.assistant-ui.com")
  .action(async (options) => {
    const { serverId, bundle, manifest, registry } = options;

    // Read and hash bundle
    const bundleContent = readFileSync(bundle);
    const hash = createHash("sha256").update(bundleContent).digest("hex");
    const bundleHash = `sha256:${hash}`;

    console.log(`Publishing ${serverId}...`);
    console.log(`Bundle hash: ${bundleHash}`);

    // Upload to registry
    const response = await fetch(`${registry}/v1/servers/${serverId}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Auth header would go here
      },
      body: JSON.stringify({
        manifest: JSON.parse(readFileSync(manifest, "utf-8")),
        bundle: bundleContent.toString("base64"),
        bundleHash,
      }),
    });

    if (response.ok) {
      console.log("Published successfully!");
      console.log(`Bundle URL: https://${serverId}.auiusercontent.com/bundle.js`);
    } else {
      console.error("Publish failed:", await response.text());
      process.exit(1);
    }
  });

program.parse();
```

### Success Criteria

#### Automated Verification:
- [ ] Registry API responds correctly
- [ ] CLI publishes bundle successfully
- [ ] Bundle accessible from CDN

#### Manual Verification:
- [ ] PSL isolation verified (cookies don't leak)
- [ ] CSP headers present
- [ ] CORS configured correctly
- [ ] Manifest validates against schema

---

## Phase 6: Documentation & Examples

### Overview
Create comprehensive documentation and example MCP servers with UI.

### Changes Required

#### 1. Documentation structure

```
apps/docs/content/docs/
├── tool-ui/
│   ├── introduction.mdx
│   ├── quick-start.mdx
│   ├── components/
│   │   ├── code-block.mdx
│   │   ├── terminal.mdx
│   │   ├── data-table.mdx
│   │   └── ...
│   ├── creating-components.mdx
│   ├── mcp-integration.mdx
│   ├── remote-loading.mdx
│   └── publishing.mdx
```

#### 2. Example MCP servers

**Directory**: `examples/mcp-weather-ui/`

```
examples/mcp-weather-ui/
├── package.json
├── src/
│   ├── server.ts        # MCP server with UI capability
│   └── ui/
│       ├── index.ts     # Component runtime
│       └── weather-card.ts
├── dist/
│   └── bundle.js        # Built UI bundle
└── manifest.json
```

### Success Criteria

#### Automated Verification:
- [ ] Docs build without errors
- [ ] Example servers start correctly
- [ ] Example UI bundles build

#### Manual Verification:
- [ ] Documentation is clear and complete
- [ ] Quick start works end-to-end
- [ ] Examples demonstrate key patterns

---

## Testing Strategy

### Unit Tests
- Schema validation for all component types
- postMessage protocol handling
- Manifest parsing and validation
- Transform function behavior

### Integration Tests
- Tool UI registration flow
- Remote component loading
- MCPToolUIProvider auto-discovery
- Action/result callbacks

### E2E Tests
- Full flow: MCP server → assistant-ui → rendered component
- PSL isolation verification
- Theme inheritance

### Manual Testing Steps
1. Start example MCP server with UI
2. Connect to assistant-ui app
3. Trigger tool call
4. Verify component renders inline
5. Test action buttons
6. Verify receipt state
7. Test with multiple MCP servers simultaneously

---

## Performance Considerations

- **Bundle size**: Keep `@assistant-ui/tool-ui` tree-shakeable
- **Lazy loading**: Remote components load on-demand
- **Caching**: Cache manifests and bundles aggressively
- **iframe overhead**: Consider RemoteDom for trusted components (future)

---

## Migration Notes

- tool-ui repo becomes documentation/examples only
- Existing tool-ui components need minor refactoring for new schema patterns
- No breaking changes to assistant-ui public API

---

## References

- Research document: `notes/research/tool-ui-mcp-standard.md`
- Design philosophy: `notes/research/tool-ui-design-philosophy.md`
- MCP specification: https://modelcontextprotocol.io/specification/2025-06-18
- SEP-1865 (MCP Apps): https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1865
- PSL documentation: https://publicsuffix.org/
