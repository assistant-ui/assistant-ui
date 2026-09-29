---
"@assistant-ui/react-generative-ui": patch
---

fix: the A2UI converter maps a spec `Button` variant (`primary` to the `primary` button style, `borderless` to `ghost`) and a `TextField` `longText` variant (a multiline `Input`); an explicit `buttonStyle` still wins
