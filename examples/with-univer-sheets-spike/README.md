# Univer Sheets Spike

This example is a feasibility spike for a split workspace:

- Left pane: `assistant-ui` chat thread
- Right pane: live `Univer` spreadsheet
- Bridge: assistant can call a frontend tool (`update_sheet_range`) to edit cells in-place
- Hybrid formula flow: assistant can stream a `formula-council` component part and apply formulas through tools

## Quick Start

```bash
npx assistant-ui@latest create my-app --example with-univer-sheets-spike
cd my-app
```

### Environment Variables

Create `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

### Run

```bash
npm run dev
```

## What This Proves

- Univer can mount cleanly in a Next.js + React 19 app.
- assistant-ui frontend tools can mutate the sheet directly.
- Users and assistants can co-edit a single spreadsheet surface.
- Component parts can present multi-agent formula proposals while tools execute deterministic mutations.

## Suggested Prompts

- `Show the metric definition panel for conversion rate in F6:F11 and apply the best option for executive reporting`
- `Compare formula options for CAC in G6:G11 and apply the option that avoids noisy errors while keeping trend visibility`
- `Show definition options for ROAS in H6:H11 and explain KPI impact before applying`
- `Identify which channels are causing metric instability in rows 6 to 11 and propose fixes`
- `Add a TikTok row with Spend 11000, Visitors 26000, Trials 1300, Paid 170, then update related metrics`
