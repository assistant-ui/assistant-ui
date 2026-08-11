---
"@assistant-ui/react-generative-ui": patch
---

fix: stop reporting `clamped` for Teams conversions that remove nothing. A renamed input id and buttons moved past the primary cap now report `fallback`, and the row-width recommendation and the payload byte budget report a new `advisory` code
