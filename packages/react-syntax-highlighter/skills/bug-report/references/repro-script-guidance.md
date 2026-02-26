# Repro Script Guidance

Goal: produce the smallest deterministic repro that another engineer can run quickly.

## Keep it minimal

1. Prefer shell scripts (`.sh`) with explicit commands.
2. Use existing workspace commands (`pnpm`, package filters).
3. Remove unrelated setup and optional steps.

## Good repro script qualities

- Runs from a clean checkout or clearly states prerequisites.
- Fails in a consistent way.
- Prints enough output to confirm failure.
- Avoids external dependencies unless they are required to trigger the bug.

## Stop criteria

Stop pursuing a script when one or more of these are true:
- Repro requires complex external services or secrets.
- Repro is flaky after reasonable simplification attempts.
- Building a script would consume disproportionate time versus report value.

When stopping, write:
- What was attempted
- Why deterministic scripting was not feasible
- What manual repro path still works
