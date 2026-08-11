---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: runtime suggestions can carry a display title and label

`ThreadSuggestion` gains optional `title` and `label`, so an adapter can show a
short pill while still sending the full `prompt`. `useThreadSuggestions` now
passes them through instead of hardcoding `title: prompt`, falling back to
`title ?? prompt` and `label ?? ""` so prompt-only suggestions render exactly as
before. `SuggestionConfig` is unchanged; the change is additive.
