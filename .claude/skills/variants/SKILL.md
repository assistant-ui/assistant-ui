---
name: variants
description: Use when the user asks for mockups, variants, options, alternatives, or "N versions" of a piece of UI in the assistant-ui docs or any app in this repo, or asks to iterate on a design before choosing one. Builds the candidates inline in the real page with the `contenders` package (`<Variants>` / `<Variant>`), shows them to the user, and resolves the pick.
---

# Variants

Compare design candidates inside the real page instead of a separate mockups route, so each one is judged with real data, real neighbours, and real breakpoints. `contenders` renders one variant at a time with a dashed outline, a floating switcher, and URL state, and a production build refuses to render a `<Variants>`, so an undecided comparison cannot ship.

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

   - Give the group a page-unique, descriptive `id` and a human `label`.
   - Give every variant a short `id` (used in URLs) and a `label` that says what differs.
   - Include the current design as the `default` when one exists, so the comparison has a baseline.
   - Make five candidates when the user asks for "mockups" without a number, and make them meaningfully different from each other (layout, density, hierarchy), not five tweaks of one idea.
   - Children must be literal `<Variant>` elements; wrapper components and fragments are not recognised.

5. Never create a separate `/mockups` route for this; nest a second `<Variants>` instead when a decision depends on another.

## Show the candidates

- Check every variant renders: `?variant=<group>:<id>` selects one, `?variant=<group>:all` or `?variants=all` stacks them all with captions.
- Screenshot each variant at desktop and phone width, in light and dark, with `?variants=clean` so the outline and switcher stay out of the image. Target the variant's children for element screenshots, because the `data-variant` wrapper uses `display: contents`.
- Report one line per variant: its `id`, its label, what makes it different, and its direct link (`http://localhost:3000/<page>?variant=<group>:<id>`). Send the screenshots.
- Keep iterating inside the same group when the user gives feedback; replace losing candidates rather than accumulating them.

## Resolve the pick

When the user chooses:

1. Replace the whole `<Variants>` block with the chosen `<Variant>`'s children.
2. Delete the losing candidate components and any content, imports, or icons only they used.
3. Rename the chosen component to a permanent name if its name describes the comparison.
4. Search the change for leftovers: `rg "<Variants|<Variant |from \"contenders\""` must find nothing in the files you touched.
5. Typecheck, run the page's tests, and look at the page once more without query parameters.

A `<Variants>` left in a statically prerendered page fails `next build`; one left in a dynamic or client-only page fails at request time instead, so the search in step 4 is the real guard. Never land a PR that still contains a `<Variants>`, and never set `allowInProduction` or `CONTENDERS_ALLOW_IN_PRODUCTION` outside a preview deployment the user asked for.
