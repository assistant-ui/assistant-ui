---
"@assistant-ui/generative-ui": patch
---

The Teams converter keeps markdown links written in plain text props (Header, Text, Caption, Badge, Fact, Tabs, Steps, Timeline, table cells, card titles and an unlinked Citation title) as literal text, as it already did for Citation sources and snippets. Links the converter builds itself, and the Markdown component, still render as links.
