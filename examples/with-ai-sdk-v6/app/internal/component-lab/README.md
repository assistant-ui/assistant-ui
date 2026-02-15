# Internal Component Part Lab Story Guide

This lab is an internal storytelling and validation surface for PR #3310.

`Status`: component-part substrate is primary; `json-render` / data-spec is additive and intentionally `unstable_*`.

## What This Unlocks

The new component-part substrate turns assistant responses into durable interactive UI graphs.

- Each interactive node has stable identity (`instanceId`) and ordering (`seq`), so updates are deterministic instead of best-effort.
- Interaction handlers (`invoke`, `emit`) are first-class and survive streaming.
- Guardrails drop stale or malformed updates without corrupting visible UI state.

For product teams, this shifts assistant UX from "rendered text with occasional widgets" to "stateful interaction surfaces that can evolve over a run."

## How It Complements Tool UIs

Component parts and Tool UIs solve different layers of the same experience.

| Use case | Component parts | Tool UIs |
| --- | --- | --- |
| Assistant-authored UI fragments in message flow | Primary | Optional |
| Tool invocation lifecycle (running/success/error) | Optional | Primary |
| Progressive patch updates to presentation state | Primary | Optional |
| Backend function contract and typed tool I/O | Optional | Primary |

Practical rule: use component parts for assistant-led presentation and continuity, then embed or pair Tool UIs when you need explicit tool execution affordances.

## Audience Framing

- PM: Ship richer assistant capabilities with reliability guarantees (stable instance continuity, monotonic updates, stale/malformed guards).
- Design: Compose native and spec-driven blocks in one thread, with catalog fallback and override paths to iterate safely.
- Engineering: Implement against a deterministic runtime contract with clear extension points (`Component.by_name`, catalog, telemetry hooks).

## 90-Second Demo Walkthrough

Path: `/internal/component-lab`

1. `Component Part`
- Show native component rendering plus fallback in the same response.
- Point out that unknown components fail gracefully instead of breaking the message.

2. `json-render Guards`
- Run the scenario and highlight stale/malformed telemetry counters.
- Explain that bad updates are rejected while valid follow-up patches still apply.

3. `Mixed`
- Show native component part + json-render spec in one response.
- Frame this as coexistence, not replacement: one runtime model, two composition paths.

Optional close: click `Run Scenario Matrix` to show deterministic pass/fail coverage across all scenarios.

## Suggested PR Comment Addendum

```md
Story framing for #3310:

- **Primary unlock**: assistant responses now support a deterministic component-part substrate (stable instance identity, monotonic updates, and stale/malformed guards).
- **Why this matters**: this enables richer product UX than static text, while preserving runtime reliability under streaming and retries.
- **How this relates to Tool UIs**: component parts handle assistant-authored interaction surfaces; Tool UIs continue to own explicit tool lifecycle UX. They compose in the same thread.
- **Fast demo path** (`/internal/component-lab`): `Component Part` -> `json-render Guards` -> `Mixed` -> optional `Run Scenario Matrix`.

This PR keeps the json-render/data-spec compatibility lane additive and explicitly unstable (`unstable_*`).
```
