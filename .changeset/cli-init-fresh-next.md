---
"assistant-ui": patch
---

fix(cli): `init` in a fresh Next.js app now renders `<Assistant />` on an untouched starter `app/page.tsx` (or prints where to render it), keeps the project's font when shadcn writes a self-referencing `--font-sans`, explains the `cn` dependency in `lib/utils.ts`, and says that no `TooltipProvider` is needed
