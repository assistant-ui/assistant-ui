---
"@assistant-ui/react-hook-form": patch
---

fix: submit forms through React Hook Form when DOM constructors are unavailable, instead of throwing on `instanceof HTMLElement` (#10739)
