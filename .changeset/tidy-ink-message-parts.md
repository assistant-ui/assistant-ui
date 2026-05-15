---
"@assistant-ui/react-ink": patch
---

feat(react-ink): add `MessagePartPrimitive` namespace with terminal-safe defaults for image, file, source, reasoning, and data parts.

Behavior changes in `react-ink`:
- `MessagePrimitive.Content` (deprecated) now renders the new terminal-safe defaults for image/file/source/reasoning/data parts when no `render*` prop is provided; previously these parts were silently dropped. Pass `render*={() => null}` to restore the prior behavior.
- `MessagePrimitive.Content` now consults `dataRenderers.fallbacks[0]` before falling back to the inline data renderer, matching `MessagePrimitive.Parts`.
- `MessagePrimitive.Parts` now forwards `data` and `Quote` components alongside `ChainOfThought`; previously `data` was dropped when `ChainOfThought` was set.
