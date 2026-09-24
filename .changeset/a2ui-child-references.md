---
"@assistant-ui/react-generative-ui": patch
---

fix: the A2UI converter follows v0.9 and v1.0 `child` references, so a spec `Card` keeps its content and a spec `Button` takes its label from its child `Text` (any other child, such as an `Icon`, renders inside the button); a button action written as `{ event: { name, context } }` dispatches like the bare `{ name, context }` form; with `keepUnknownComponents`, a kept `Modal` or `Tabs` keeps the components it references as children, and a child reference the converter cannot follow is reported as a warning
