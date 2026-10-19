---
"@assistant-ui/react": patch
"@assistant-ui/react-lexical": patch
---

fix: call a directive trigger's `onInserted` under the Lexical composer once the directive is in the composer text; `onDirectiveSelect` now fires at the same point
