# Xulux Learn Mode

Learn Mode ships one fixed course, **Build a Generative UI Assistant**, backed
by canonical lesson and project files. Its eight `S0`–`S7` snapshots take a
learner from the starter project through streaming chat, suggestions, tools,
generative UI, shared editable state, persisted conversations, and branching.

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

Preview, source, diff, agent context, and ZIP downloads all resolve from the
same immutable stage snapshots through the course registry. Canonical stage
directories store only each lesson's delta; the resolver overlays earlier
stages and shared scaffold files into the complete project. Local storage
persists the one course thread, current versus selected step, completion,
celebration, and certificate dismissal. The course project itself also adds a
browser-backed thread-list adapter in S6 so its conversations survive reloads.

Run focused verification locally. Sandbox deployment is a separate operational
step and is not required to author course content:

```bash
packages/react/node_modules/.bin/vitest --config apps/docs/vitest.config.ts run apps/docs/lib/xulux/learn
pnpm --dir apps/docs exec tsc --noEmit
pnpm exec oxlint apps/docs/app/api/xulux/chat apps/docs/components/xulux apps/docs/lib/xulux/learn
pnpm exec oxfmt --check apps/docs/app/api/xulux/chat apps/docs/components/xulux apps/docs/lib/xulux/learn
```
