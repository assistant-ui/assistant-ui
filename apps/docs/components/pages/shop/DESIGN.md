# Setup wizard design decisions

- The frame never resizes: every page renders in one fixed size, and only the viewport caps it.
- Page content never scrolls; the license box scrolls internally instead.
- The intro and license pages fit the frame.
- The agent-disconnected notice is a modal that hides the content until the agent reconnects.
- The key step shows an explicit test result before Next.
- Back keeps the session running; Cancel is the only way to end it.
- The mobile header replaces the desktop sidebar.
- The messages sheet is full screen below `sm` and resizable above.
- The progress hairline is time based, freezes while waiting on the user, and completes when a step advances.
- Dark mode uses the plain page background behind the frame.
