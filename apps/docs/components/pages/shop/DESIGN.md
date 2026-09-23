# Setup wizard design decisions

- The frame never resizes: every page renders in one fixed size, and only the viewport caps it.
- Page content never scrolls; the license box scrolls internally instead. The install step list is the exception: the title and progress bar stay put while the list scrolls under a fade and follows the step in progress.
- The intro and license pages fit the frame.
- The agent-disconnected notice is a modal that hides the content until the agent reconnects.
- The key step shows an explicit test result before Next.
- Back keeps the session running; Cancel is the only way to end it.
- The mobile header replaces the desktop sidebar.
- The messages sheet is full screen below `sm` and resizable above.
- The exploring bar is a seeded simulation of a familiar installer bar: it creeps, stalls for a few seconds, jumps a little, never runs backwards or fills past 92%, holds while the agent is away, and resumes where it was when the page comes back.
- Dark mode uses the plain page background behind the frame.
- Spacing scale: `gap-1.5` between an icon and its text (the Button's own gap), `2` between rows, chips and a label and its control, `3` between the fields of one card, `4` between the sections of a page, `6` between the title and the body. Sections stack with `gap`, not margins.
- Page padding is `px-5 sm:px-6` on every horizontal band of the frame (content, notice, footer).
- Surfaces: a filled card is `bg-muted rounded-lg p-4`; a selectable row or tile is `rounded-lg border p-3`, resting on `border-foreground/10`, `border-foreground/30` on hover and `border-foreground bg-muted` when chosen.
- `border-foreground/10` is the one hairline, for borders, dividers and the progress track; `/30` is the accent bar; `border-foreground` is the active state.
- Text: the page title is `text-lg font-semibold`; every other heading is `text-sm font-medium`; helper text is `text-muted-foreground text-sm` and metadata `text-xs`.
- Icons are `size-4` beside content and `size-3.5` inside a line of text.
