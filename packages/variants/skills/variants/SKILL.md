---
name: variants
description: Compares UI design options inside the running app.
---

```tsx
import { Variant, Variants } from "@assistant-ui/variants";

<Variants id="pricing-plans" label="Plans" default="current">
  <Variant id="current" label="Current"><PlansCurrent /></Variant>
  <Variant id="table" label="Comparison table"><PlansTable /></Variant>
</Variants>;
```

- Group ids are unique across the codebase. A nested `<Variants>` is a dependent decision.
- `?variants=canvas` shows every option side by side.

The sidebar copies commands the user pastes back:

- `/variants choose group:id … [-- notes: …]`: keep each chosen option in place of its `<Variants>` block.
- `/variants apply [group…]`: apply notes without choosing.
- `/variants connect`: take requests from `.variants/inbox.jsonl` (`{ id, kind: "choose" | "apply", pairs, notes }`) instead, append `{ id, re, type: "ack" | "status" | "done" }` events to `outbox.jsonl`, and touch `agent.json` every 5 seconds while connected. A request without a `done` event is unhandled. `/variants disconnect` removes `agent.json`.

Notes are change requests: `group[:id] "text" (on: hint)` entries after `-- notes:`, or `{/* @variants-note … text="<base64url JSON { note, hint }>" */}` as the first child of their `<Variant>`.

Ship nothing with an `@assistant-ui/variants` import or `@variants-note` left in it. `allowInProduction` bypasses this rule.