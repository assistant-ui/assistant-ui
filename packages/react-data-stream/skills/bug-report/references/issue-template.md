# Bug Issue Template

Use this structure when filing to `assistant-ui/assistant-ui`.

```md
## Summary
<One-paragraph description of the bug and impact>

## Type Of Work In Progress
<What the agent was doing when the bug occurred>

## Reproduction Steps
1. ...
2. ...
3. ...

## Expected Behavior
<What should happen>

## Actual Behavior
<What happens now>

## Context
- Environment: <OS, Node, pnpm>
- Repository state: <branch, commit>
- Area/package: <e.g. @assistant-ui/react, docs app>
- Logs/errors: <key stack traces or excerpts>

## Repro Script (Optional)
<Include a minimal script or explicitly state why not feasible>
```

Title guidance:
- Format: `[area] short failure mode`
- Example: `[react] composer send button remains disabled after stream ends`
