# Xulux Learn Mode

Learn Mode is a fixed, two-step prototype course backed by canonical lesson and
project files. It intentionally replaces the larger `S0`–`S7` concept with the
registered `P0` and `P1` stages while the product flow is validated.

The `/api/xulux/learn/chat` route binds the Learn agent directly instead of
deriving an agent mode from the request pathname. App Builder and Learn use the
same request handler and share documentation and repository-source helpers. App
Builder preserves browser-supplied frontend tools and adds template tools;
Learn adds `getNextCourseStep` and does not accept frontend tools. Learn source
tools expose the assistant-ui monorepo as `repo` and the
validated selected course stage as `course`. The request sends only `courseId`,
status, current step, and selected step. The Learn agent decides when Start or
Continue intent requires the course tool, and later model steps may use docs
and source tools but cannot call the course tool again. Normal questions can
therefore inspect `/course` without advancing. The course tool reads lessons
and stages from the generated source snapshot and returns a validated
product-owned result.

Preview, source, diff, and ZIP downloads all resolve through the course
registry. Local storage persists the one course thread, current versus selected
step, completion, celebration, and certificate dismissal.

Run verification in the Blaxel development sandbox:

```bash
packages/react/node_modules/.bin/vitest --config apps/docs/vitest.config.ts run apps/docs/lib/xulux/learn
pnpm --dir apps/docs exec tsc --noEmit
pnpm exec oxlint apps/docs/app/api/xulux/chat apps/docs/components/xulux apps/docs/lib/xulux/learn
pnpm exec oxfmt --check apps/docs/app/api/xulux/chat apps/docs/components/xulux apps/docs/lib/xulux/learn
```
