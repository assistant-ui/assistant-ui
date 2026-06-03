---
"assistant-ui": patch
---

perf(cli): merge the two `shadcn add` calls in `create` into one

`create` for templates without local components ran `shadcn@latest add` twice (once for the shadcn UI components, once for the `@assistant-ui/*` components), paying for a separate dlx cold start, a separate registry index fetch, and a separate package-manager `add` subprocess each time. `@assistant-ui` is publicly listed in shadcn's registry index, so a single `shadcn add <shadcn components> @assistant-ui/...` resolves the whole mixed tree in one topologically sorted pass; the `tw-shimmer` CSS injection and the `components.json` registries write still happen. This roughly halves the component install time, including on the `--skip-install` path.
