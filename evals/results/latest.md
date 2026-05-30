# Comment-hygiene eval

candidate  pr-review-comments
baseline                   0%

## Reproduced failure (baseline)
- pr-review-comments: The comment on timeoutMs references a previous value ('5000') and a prior change ('bumped from … to 8000'), violating the rule against referencing old values or the change history.
