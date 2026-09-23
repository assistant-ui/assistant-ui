# Setup wizard design decisions

- The frame never resizes: every page renders in one fixed size, and only the viewport caps it.
- Page content never scrolls; the license box scrolls internally instead.
- The intro and license pages fit the frame.
- The agent-disconnected notice is a modal that hides the content until the agent reconnects.
- The key step shows an explicit test result before Next.
- Back keeps the session running; Cancel is the only way to end it.
- The mobile header replaces the desktop sidebar.
- The messages sheet is full screen below `sm` and resizable above.
- The exploring bar is a seeded simulation of a familiar installer bar: it creeps, stalls for a few seconds, jumps a little, never runs backwards or fills past 92%, holds while the agent is away, and resumes where it was when the page comes back.
- Dark mode uses the plain page background behind the frame.
