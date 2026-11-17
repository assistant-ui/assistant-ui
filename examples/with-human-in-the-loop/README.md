# Human in the loop

A support desk copilot that looks up an order, asks which items to refund, and waits for approval before a large refund runs. It is built on `@assistant-ui/ai-sdk` with AI SDK v7.

A run can stop for a person in two ways, and the example uses both:

| | Human tool | Approval gate |
| --- | --- | --- |
| The person | supplies the tool's result | allows or blocks an action the server performs |
| Declared with | `execute: humanTool()` | `toolApproval` on `streamText` |
| Answered with | `addResult(...)` | `respondToApproval(...)` |
| In this app | `select_items`: pick the items to refund | `issue_refund`: refunds over $100.00 |

## Run it

From the monorepo root:

```sh
pnpm install
pnpm turbo build --filter='with-human-in-the-loop^...'
pnpm --filter with-human-in-the-loop dev
```

Open http://localhost:3000 and pick one of the three sample tickets.

No API key is needed. Without `OPENAI_API_KEY` the route answers from a scripted model (`lib/script.ts`) that follows one path: find the order, ask which items when the request names none, then refund. The tools, the approval gate, and the stream are the same ones a real model drives. To use a model, copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`.

## How it works

- `app/toolkit.tsx` is a `"use generative"` toolkit. `find_order` and `issue_refund` execute on the server, and `select_items` is a human tool with no executor. Each entry carries its renderer.
- `app/api/chat/route.ts` passes `toolApproval: { issue_refund: refundApproval }` to `streamText`. `lib/refund-policy.ts` prices the refund from the order on record and returns `user-approval` over the limit and `approved` within it, so the model cannot describe a smaller refund to skip the gate.
- `components/refund-approval.tsx` renders the gate with the kit's `ApprovalCard`. It reads `approval` from the tool call, answers with `respondToApproval`, and becomes a receipt once the decision is recorded.
- `components/return-items.tsx` renders the human tool with the kit's `OptionList` and answers with `addResult`.
- `app/assistant.tsx` creates the AI SDK runtime and continues the run after either answer through `sendAutomaticallyWhen`.
- `app/support-desk.tsx` holds the UI and the toolkit config. It takes the runtime as a prop, so the same component also runs on `LocalRuntime` in the docs preview.

The route sets its own system prompt and tool set and ignores the `system` and `tools` fields of the request body, because those come from the browser. The decision also comes back in a request, so the gate stops the model from refunding on its own, not a caller who forges one: `app/api/request-context.ts` refuses cross-site requests, and the route needs authentication before you deploy it.

The orders are sample data in `lib/orders.ts`, and a refund changes nothing outside the conversation.

## Things to try

- **Order 1042** asks which items are coming back. Pick the headphones and the refund waits for approval. Pick only the cable and it runs within the limit.
- **Order 1063** has a $420.00 desk frame, so the refund waits. Deny it, then ask for the cable tray instead.
- **Order 1057** has one item under the limit, so it is refunded without a prompt.
- Send another message while a card is waiting. The request closes as a receipt and the run moves on.

## Tests

```sh
pnpm --filter with-human-in-the-loop test
```

The tests cover the refund policy and the path the scripted model follows.
