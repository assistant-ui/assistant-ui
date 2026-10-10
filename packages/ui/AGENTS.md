# @assistant-ui/ui

The private component kit the registry copies into user projects; the root and `packages/AGENTS.md` still apply.

## Rules

- Put behavior assistant-ui needs in `src/components/react/assistant-ui/**`, never in a stock shadcn primitive under `src/components/react/ui/`, because `shadcn add` replaces a user's copy of that primitive with shadcn's own file.
- Never re-vendor `src/components/react/ui/` from shadcn upstream over the copies here; the kit is its own design system.
- Name element variants by suffix under `src/components/react/assistant-ui/elements/`: an unmarked file is the props-only source, `.radix.tsx` holds its Radix variant, `.aui.tsx` binds it to the runtime, and `.aui.radix.tsx` holds the Radix variant of that binding.
- Under `src/components/react/ui/`, the `base/` or `radix/` directory carries a primitive's flavor, except that a `.radix.tsx` sibling there is the Radix variant of its unmarked Base UI file.
- Fix a file mirrored between `src/components/react/` and `src/components/react-native/` in both copies in the same pull request, because the two trees install separately and nothing else carries a fix across.
- Animate kit components with CSS only (custom properties, `duration-(--var)`, `motion-reduce:`), never framer-motion or the `motion` package.
- Never migrate `src/components/react/ui/radix/*`, the docs samples' `.radix.tsx` twins, or the `--radix-*` variables in radix-flavor kit files to Base UI, because the Radix flavor ships as its own product.
- Use only react-native type names both type trees export under `src/components/react-native/**`, deriving the rest from components (`ComponentRef<typeof View>`), because `examples/with-expo` compiles the kit against react-native 0.86 while the kit types against 0.87.
- Route a native-kit CSSOM read (a class-to-prop mapping, `useCSSVariable`, `useUniwind().theme`) through `useHydrated` or `Icon`'s gate, never a new gate, because a read before hydration mismatches the static web export.
- Clear a copy-confirmation timer and reset its copied flag together on unmount, because an `<Activity>` hide that only cancels the timer leaves the flag stuck true.
