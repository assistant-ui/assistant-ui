# @assistant-ui/ui

The private component kit the registry copies into user projects; the root and `packages/AGENTS.md` still apply.

## Rules

- Keep `src/components/react/ui/**` byte-identical to stock shadcn output and put behavior assistant-ui needs in `src/components/react/assistant-ui/**`, because `shadcn add` overwrites a user's copy of a stock primitive.
- Never re-vendor kit components from shadcn upstream; the kit is its own design system.
- Name flavor variants by suffix: an unmarked file is the Base UI or props-only source, `.radix.tsx` holds its Radix variant, `.aui.tsx` binds an element to the runtime, and `.aui.radix.tsx` holds the Radix variant of that binding.
