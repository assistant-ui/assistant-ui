# Comment-hygiene eval

candidate        pr-review-comments
baseline                         0%
delete-stale                    50%
drop-tombstones                 75%

## Reproduced failure (baseline)
- pr-review-comments: The comment on timeoutMs references a previous value ('5000') and a prior change ('bumped from'), violating the FAIL criteria.
