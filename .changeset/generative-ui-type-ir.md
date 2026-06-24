---
"@assistant-ui/core": patch
---

add the flat `$type`-shape generative-ui node to the message types, with a `$`-reserved namespace for framework keys. `$type` selects the component, `$key` carries list identity, `$action` carries behavior as data, and `children` nests; every other key is an inline component prop, so a component's own `type`/`status`/`variant` props never collide with the framework. add `GenerativeUIAction` and shared ui token types, plus `normalizeUINode`/`normalizeSpec` that map both the flat `$type` shape and the legacy `component` shape to one canonical `NormalizedUINode`, and render either through `MessagePrimitive.GenerativeUI`. the legacy `component` shape stays as a backward-compatible alias; nothing existing is removed.
