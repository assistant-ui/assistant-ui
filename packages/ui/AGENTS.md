# @assistant-ui/ui

The private component kit the registry copies into user projects; the root and `packages/AGENTS.md` still apply.

## Rules

- Put behavior assistant-ui needs in `src/components/react/assistant-ui/**`, never in a stock shadcn primitive under `src/components/react/ui/`, because `shadcn add` replaces a user's copy of that primitive with shadcn's own file.
- Never re-vendor `src/components/react/ui/` from shadcn upstream over the copies here; the kit is its own design system.
- Name flavor variants by suffix: an unmarked file is the Base UI or props-only source, `.radix.tsx` holds its Radix variant, `.aui.tsx` binds an element to the runtime, and `.aui.radix.tsx` holds the Radix variant of that binding.
