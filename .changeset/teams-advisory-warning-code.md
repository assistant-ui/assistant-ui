---
"@assistant-ui/react-generative-ui": patch
---

fix: stop reporting `clamped` for conversions that remove nothing. In Teams, a renamed input id and buttons moved past the primary cap now report `fallback`, and the row-width recommendation and the payload byte budget report a new `advisory` code. In Slack, a carousel card reshaped to title and body now reports `fallback`
