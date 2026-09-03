---
"assistant-ui": patch
---

feat: scaffold `lib/utils` from the assistant-ui registry so new projects get `cn`

`create-assistant-ui` used to append shadcn's own `utils` item to the component install, which ships `twMerge(clsx(inputs))` and pulls in `clsx` plus `tailwind-merge`. it now requests `@assistant-ui/utils`, a new registry item that ships the same `lib/utils.ts` the monorepo uses (`export { cn } from "cn"`) and declares `cn` alone. templates and examples declare `cn` to match, so a scaffolded project starts on the merge engine shadcn ships rather than the pair it replaces.
