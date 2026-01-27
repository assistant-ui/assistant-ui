## ChainOfThought primitive (UI) — plan

**Target location**: `packages/ui/src/components/assistant-ui/chain-of-thought.tsx`  
**Related**: existing `Reasoning` (`packages/ui/src/components/assistant-ui/reasoning.tsx`), `ToolGroup`, `ToolFallback`, `Sources`  
**Last updated**: 2026-01-26

### Goal

Add a `ChainOfThought` primitive that:

- Fits assistant-ui’s established UI architecture (Collapsible + `cva` variants + `data-slot` conventions)
- Is **streaming-friendly** (clear active state, stable layout, avoids scroll-jank)
- Has **safe UX defaults** aligned with modern provider guidance (don’t imply raw internal CoT; prefer summaries; handle redaction/encryption gracefully)
- Can scale from “single reasoning disclosure” to an “agent trace/timeline” view **without** forcing complex structure on all consumers

### Non-goals (v1)

- Defining a new core runtime message-part type for “steps” or “trace”
- Mandating a specific “ReAct (Thought/Action/Observation)” schema
- Attempting to detect/parse provider-specific encrypted/redacted reasoning formats in the UI layer

---

### Step 0 — Lock semantics and naming (avoid the biggest footgun)

There are two distinct UX concepts that often get conflated:

- **Reasoning channel**: “thinking” text associated with a message (currently `ReasoningMessagePart` with `{ type: "reasoning", text, parentId? }`).
- **Execution trace**: “what the agent did” (tool calls, sources, intermediate notes) rendered as a timeline/steps.

**Decision**:

- `ChainOfThought` is a *developer API name*, but the UI label should default to **“Reasoning”** or **“Thinking (summary)”** to avoid implying we’re showing raw internal chain-of-thought.
- v1 ships as a **drop-in alternative UI** for `ReasoningMessagePart` and `ReasoningGroup` behavior.
- v2 enables an optional **trace/timeline** via existing grouping mechanisms (`parentId`, `MessagePrimitive.Unstable_PartsGrouped`), rather than inventing a new part type.

---

### Step 1 — Ground the implementation in existing assistant-ui patterns

Mirror the successful patterns already used in:

- `reasoning.tsx` (collapsible disclosure, shimmer active state, fade gradient, `useScrollLock`)
- `tool-group.tsx` and `tool-fallback.tsx` (collapsible groups, status icon semantics, animation timing)
- `sources.tsx` (compact “evidence/source” tokens)

Concrete conventions to follow:

- **Component anatomy**: `X.Root`, `X.Trigger`, `X.Content`, `X.Text`, `X.Fade` + `xVariants` using `cva`
- **Animation**: reuse 200ms (`ANIMATION_DURATION = 200`) and `--animation-duration` CSS var
- **Scroll stability**: apply `useScrollLock(ref, ANIMATION_DURATION)` when collapsing
- **Slots/attrs**: `data-slot="chain-of-thought-..."`, `data-variant=...`, `group/...` utility conventions

---

### Step 2 — “Safe defaults” requirements (policy-aware UX)

Implement Plan-2-style guardrails, but expressed as UI behaviors and copy:

- **Collapsed by default** (consumer-friendly)
- **Prefer summary framing**:
  - Default label: “Reasoning”
  - Optional label variant: “Reasoning (summary)” / “Thinking (summary)”
- **Redaction/encryption-safe rendering**:
  - If reasoning content is empty/unavailable, show a neutral placeholder (e.g. “Reasoning hidden.”).
  - No attempt to render/interpret “encrypted reasoning”; treat as non-displayable.
- **Developer-only visibility knobs**:
  - Allow apps to opt into showing raw text in dev contexts, but don’t make that the default UX.

---

### Step 3 — Data model strategy (v1 ships now; v2 enabled by grouping)

#### v1 (ship): reasoning-only, drop-in replacement

- Add `ChainOfThought` as a `ReasoningMessagePartComponent` that renders the part content (via existing `MarkdownText`).
- Add `ChainOfThoughtGroup` as a `ReasoningGroupComponent` that wraps *consecutive* reasoning parts (like `ReasoningGroup` today).

This makes adoption trivial:

- `MessagePrimitive.Parts` can map:
  - `components.Reasoning = ChainOfThought`
  - `components.ReasoningGroup = ChainOfThoughtGroup`

#### v2 (optional): trace/timeline via parentId grouping (no new types required)

Use existing `parentId` patterns to build steps:

- **Grouping**: one `parentId` = one “step group” (may include tool calls, sources, reasoning, etc.)
- **Renderer**: `MessagePrimitive.Unstable_PartsGrouped` with a `Group` component that renders a “step container”
- **Step metadata**:
  - Minimal inference: derive labels from first `tool-call.toolName`, or a default label if only reasoning exists
  - Better: use existing `DataMessagePart` with a known `name` (e.g. `"trace.step"`) carrying `{ label, status, icon, timing }` for the same `parentId`

This achieves Plan-1’s “progressive steps / evidence” without coupling it to “reasoning text == raw CoT”.

---

### Step 4 — Streaming + collapse behavior (nuanced interaction rules)

The subtle UX edge is auto-open/auto-close without fighting user intent.

- **Auto-open while streaming**:
  - When a reasoning group is actively streaming, default it to open.
  - If the user manually closes it during the current message, don’t re-open it on subsequent streaming updates (track a per-message “userDismissed” flag).
- **No auto-close by default**:
  - Do not auto-collapse on completion (surprising and hides info users just opened).
  - Optional prop `autoCollapseOnComplete?: boolean` for apps that want it.
- **Active affordance**:
  - Shimmer/active indicator while streaming (consistent with `ReasoningTrigger` and tool UIs).
  - Set `aria-busy` on content while active.
- **Layout stability**:
  - Maintain max-height scrolling region + fade gradient (same as `ReasoningText`/`ReasoningFade`).
  - Keep `useScrollLock` on collapse to prevent viewport jumps.

---

### Step 5 — Public component API (v1)

Create `packages/ui/src/components/assistant-ui/chain-of-thought.tsx` exporting:

- `ChainOfThought` (memo’d) as `ReasoningMessagePartComponent` plus static subcomponents:
  - `ChainOfThought.Root`
  - `ChainOfThought.Trigger`
  - `ChainOfThought.Content`
  - `ChainOfThought.Text`
  - `ChainOfThought.Fade`
- `ChainOfThoughtGroup` (memo’d) as `ReasoningGroupComponent`
- `ChainOfThoughtRoot`, `ChainOfThoughtTrigger`, etc. as named exports (matching the pattern used in `reasoning.tsx` / `tool-fallback.tsx`)
- `chainOfThoughtVariants` via `cva` (outline/ghost/muted) with defaults aligned to existing `Reasoning`

Keep props parallel to `Reasoning` where possible (e.g., `variant`, `defaultOpen`, controlled `open/onOpenChange`, optional `active`, optional `duration`).

---

### Step 6 — Integration plan (how consumers adopt it)

#### Minimal adoption (replace reasoning UI)

- In the thread message UI, wire:
  - `components.Reasoning = ChainOfThought`
  - `components.ReasoningGroup = ChainOfThoughtGroup`

#### Trace adoption (v2 pattern)

- Provide a documented example using:
  - `MessagePrimitive.Unstable_PartsGrouped`
  - grouping by `parentId`
  - a `Group` renderer that shows a “step header” + the grouped children parts

---

### Step 7 — Docs + examples (to make it stick)

Add or update docs to cover:

- **Terminology**: why the UI label avoids “Chain-of-thought”
- **Safe defaults**: collapsed + summary framing + redaction placeholder behavior
- **Wiring instructions** for `MessagePrimitive.Parts`
- **Optional trace mode** using `parentId` grouping (with a short assistant-stream snippet demonstrating `withParentId`)

---

### Step 8 — Acceptance criteria (“done means done”)

- **Architecture fit**: matches assistant-ui conventions (`cva`, `data-slot`, Collapsible + scroll-lock)
- **Streaming UX**: clear active indicator; no scroll jumps; respects user toggles
- **Accessibility**: keyboard/ARIA semantics correct (Collapsible trigger/content; `aria-busy` while active)
- **Safety**: default copy does not promise raw internal CoT; empty/redacted content has a neutral placeholder
- **Extensibility**: trace mode achievable via `Unstable_PartsGrouped` + `parentId` without core type changes

