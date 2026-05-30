# Comment-hygiene eval

candidate     pr-review-comments
baseline                     13%
describe-now                  0%
no-history                   25%
why-not-what                 13%

## Reproduced failure (baseline)
- pr-review-comments: The comment on timeoutMs references previous values ('bumped from 5000 to 8000', 'raised to 10000') and the change history, violating the FAIL criteria.
