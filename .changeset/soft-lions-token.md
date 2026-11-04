---
"@assistant-ui/react-markdown": patch
---

Only treat a standalone `language-*` class token as the code language, so a class such as `my-language-js` no longer selects the wrong syntax highlighter.
