---
"@assistant-ui/react-pi": patch
---

fix: require the React release that supports dismissible tool approvals

`@assistant-ui/react-pi` now requires `@assistant-ui/react` `^0.15.22`, which
includes the `approval.dismissible` field used for Pi `select`, `input`, and
`editor` requests.
