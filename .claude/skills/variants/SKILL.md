---
name: variants
description: Use when the user asks for mockups, variants, options, alternatives, or "N versions" of a piece of UI in the assistant-ui docs or any app in this repo, asks to iterate on a design before choosing one, or runs `/variants choose <group>:<variant> …` (pasted from the variants sidebar). Builds the candidates inline in the real page with the `contenders` package (`<Variants>` / `<Variant>`), shows them to the user, and resolves the pick.
---

# Variants

Compare design candidates inside the real page instead of a separate mockups route, so each one is judged with real data, real neighbours, and real breakpoints. `contenders` renders one variant at a time, with these on top:

- a dashed outline around the undecided region
- a sidebar for switching variants
- a canvas that shows every variant side by side
- URL state

A production build refuses to render a `<Variants>`, so an undecided comparison can't ship.

## When the user asks for variants

1. Read the page and its design rules first (`apps/docs/content/design.md` for the docs site), and keep every candidate within them.
2. Wrap only the part being decided. Everything else on the page stays real and unchanged.
3. Write each candidate as its own small component in the same file, sharing one content constant, so the candidates differ only in design and stay honest about content.
4. Add one group per decision:

   ```tsx
   import { Variant, Variants } from "contenders";

   <Variants id="scf-features" label="Feature list" default="current">
     <Variant id="current" label="Current">
       <FeaturesCurrent />
     </Variant>
     <Variant id="cards" label="Light cards with icons">
       <FeaturesCards />
     </Variant>
   </Variants>;
   ```

   - Group ids must be unique across the whole repository and prefixed by the page or feature (`scf-features`, `oss-hero`, `brand-logo-grid`), because `/variants choose` finds the block by id alone. Before adding a group, check the id is free with `rg -n 'id="<group>"' --glob '*.tsx'`.
   - Give the group a human `label`, every variant a short `id` (used in URLs and commands; no `:`, `,` or spaces), and a `label` that says what differs.
   - Include the current design as the `default` when one exists, so the comparison has a baseline.
   - Make five candidates when the user asks for "mockups" without a number, and make them meaningfully different from each other (layout, density, hierarchy), not five tweaks of one idea.
   - Children must be literal `<Variant>` elements; wrapper components and fragments are not recognised.

5. Never create a separate `/mockups` route for this. When a decision depends on another, nest a second `<Variants>` inside the relevant `<Variant>`. It then shows up indented under its parent in the sidebar.

## Show the candidates

- Check every variant renders. `?variant=<group>:<id>` selects one.
- Send the canvas link, `http://localhost:3000/<page>?variants=canvas`, which shows every variant of every group side by side. Send a screenshot of it too.
- When layout matters, also send one clean screenshot per variant at phone width (`?variant=<group>:<id>&variants=clean`). This hides the outline and sidebar. The variant's top-level elements carry `data-variant="<id>"`, so `[data-variant="<id>"]` works as an element-screenshot target.
- Report one line per variant: its `id`, its label, what makes it different, and its direct link.
- The user can pick in the sidebar and paste the `/variants choose …` line it copies, or simply reply with ids.
- Keep iterating inside the same group when the user gives feedback; replace losing candidates rather than accumulating them.

## Choose

`/variants choose <pairs…>` is the decision. Treat the listed choices as final.

1. Parse the arguments as `group:variant` pairs separated by whitespace or commas (the `?variant=` syntax).
2. For each group, find its block with `rg -n 'id="<group>"' --glob '*.tsx'` across the repo, and keep only `<Variants` matches. If there's no match, or more than one, stop and ask.
3. Check the variant id is one of that block's `<Variant id=…>` children. If it isn't, list the valid ids and ask.
4. Handle nesting:
   - Resolve parents before the groups nested inside them.
   - Resolving a parent deletes any nested group under a losing variant, together with its candidates.
   - A nested group under the winner is resolved too when the command lists it.
   - If the command doesn't list it, keep it and ask which variant to keep. Never guess.
5. Resolve each group exactly as in "Resolve the pick" below.
6. Report what changed (files, kept variants, deleted components), then land it through the repo's normal flow.

## Resolve the pick

When the user chooses:

1. Replace the whole `<Variants>` block with the chosen `<Variant>`'s children.
2. Delete the losing candidate components and any content, imports, or icons only they used.
3. Rename the chosen component to a permanent name if its name describes the comparison.
4. Search the change for leftovers: `rg "<Variants|<Variant |from \"contenders\""` must find nothing in the files you touched.
5. Typecheck, run the page's tests, and look at the page once more without query parameters.

A `<Variants>` left in a statically prerendered page fails `next build`. One left in a dynamic or client-only page fails at request time instead, so the search in step 4 is the real guard. Never land a PR that still contains a `<Variants>`, and never set `allowInProduction` or `CONTENDERS_ALLOW_IN_PRODUCTION` outside a preview deployment the user asked for.
