/**
 * The guide the setup-agent CLI fetches from `<setup-url>/guide`: every text
 * it shows the coding agent and the order of its intro. This is the only
 * copy; a wording or flow fix here ships with a worker deploy, no npm
 * release. The CLI renders `{{name}}` placeholders with values it computes
 * itself and runs intro steps only from its own allow-list.
 */
import type { Guide, GuideContext, GuideStep } from "setup-agent";

const EVENT_LIST = `"planning.started", "input.answered" ({inputId, answer, note?}; answer is an array for a choice question not asked with --single), "input.dismissed", "plan.approved", "plan.changes-requested" ({feedback}), "message.created" ({messageId, text}), "finished", "cancelled", "setup.created" ({products})`;

const beginPlanHandoff = `Before planning, check the current setup status. If it is "waiting", tell the user in your own conversation: "I'm connected. Go back to your browser and click Begin plan. You can watch my progress, answer questions, and steer me there." Then run:
  {{cmd}} {{url}} wait start
Keep the stream running while you wait. Do not inspect the project, fetch guides, ask setup questions, or propose a plan until this command returns {"ok":true}. If it returns {"ok":false,"status":"cancelled"}, the user ended this setup before planning: do not plan, tell the user you are connected and waiting for their next setup, and run "wait start" again. Only the user in the browser should start planning; never invoke the browser's start command yourself. "planning.started" also arrives on the stream. If the status is already "planning" or "installing", resume that phase without asking the user to begin again. If it is "done" or "cancelled", that setup is over: tell the user you are connected and waiting for their next setup, and run "wait start", which returns once the next one begins.`;

const agentStartedHandoff = ({ started, opened }: GuideContext) =>
  started === "agent-stream"
    ? `You started this setup, and it is already planning: there is no Begin plan click to wait for. Check "status" before planning: if it is "planning" or "installing", go on with that phase. If the status is "done" or "cancelled", that setup is over: tell the user you are connected and waiting for their next setup, and run "wait start", which returns once the next one begins.`
    : `You started this setup, and it is already planning: there is no Begin plan click to wait for. The browser asks the user to connect to you first; it shows your working directory once your stream is running. Check "status" before planning: if it is "planning" or "installing", go on with that phase. Tell the user in your own conversation, once: ${
        opened
          ? `"I opened the assistant-ui setup in your browser. I'll ask my questions there, and you can watch my progress and steer me from that page. If it didn't open, go to {{browserUrl}} ."`
          : `"Open {{browserUrl}} to follow the assistant-ui setup. I'll ask my questions there, and you can watch my progress and steer me from that page."`
      } If the status is "done" or "cancelled", that setup is over: tell the user you are connected and waiting for their next setup, and run "wait start", which returns once the next one begins.`;

const streamSection = (streaming: boolean, noOpen: boolean) =>
  streaming
    ? `The command that printed this is the stream. Keep it running in the background until the setup ends: the browser shows you as connected only while it runs. New output does not wake you: read its new lines between your other commands. Each new line is a JSON array of events: ${EVENT_LIST}, plus:
- "browser.opened" ({id, message}): setup opened the setup page in the user's browser for a question. Tell the user once, in your own conversation, that it waits there, and keep working in the same turn.
- "input.needed" ({id, message, question, options?, answer}): the user may not see the browser right now. Do what its message says: run "wait <id>" for their answer in the browser, or ask the user in your own conversation with that question and options, then run its "answer" command with their reply. Answered either way, the setup goes on.
If this command stops, start it again in the background with
  {{cmd}} {{url}} stream${noOpen ? " --no-open" : ""}
The URL is the user's link to you from their browser, not one setup: it outlives this one, and their next setup arrives on the same stream.`
    : `First, start a persistent Monitor on
  {{cmd}} {{url}} stream
and keep it running: the browser shows you as connected only while it runs, and it is how answers reach you. The URL is the user's link to you from their browser, not one setup: it outlives this one, and their next setup arrives on the same stream. Each line is a JSON array of events: ${EVENT_LIST}.`;

/** Why the agent must not end its turn mid-setup, and how it waits instead. */
const keepGoing = `Run the setup to the end in one go. Do not count on the stream or the browser to wake you: if you end your turn before the install is done, the setup can stay paused until the user types to you, even after they answer in the browser. So never end your turn to wait for an answer, and do not stop after telling the user something. To get an answer, block on it:
  {{cmd}} {{url}} wait <input-id>
("plan --wait" and "ask --wait" block the same way). A wait that prints {"ok":false,"status":"waiting"} has not failed and the setup is not stuck: run its "next" command, right away. "next" only waits; never repeat an "ask" or "plan" to keep waiting, since that asks or submits again. End your turn only to ask the user in your own conversation (an "input.needed" you relay, or a value only they can give), and go on as soon as they reply; or once the install is done and proposed with "done".`;

const entryPointQuestion = `
When the setup puts an assistant in the app, ask how users should access it after discovering the actual app and before proposing the plan. Skip this question when no product's guide installs an assistant (a standalone library or service setup, for example). Use an entry-point question with only 1–3 sensible alternatives. Describe the actual app's pages, workflow and component placement, not generic placeholder copy. Recommend one clear fit when there is one; two options may use the same form factor in different places. Each option needs a stable id, label, contextual description and entryPoint {"formFactor":"modal"|"sidebar"|"full-page","placement":"where it appears","trigger":"how users open it or navigate to it","recommended":true?}. Write the JSON array for this app and send it with:
  {{cmd}} {{url}} ask "Where should users access the assistant?" --entry-points '<JSON array>' --wait
Mark a clear fit with "recommended":true rather than --default, so the user makes the pick. When you ask it, do not submit the plan before the user picks an entry point. Respect the selected placement and trigger in the plan and implementation. Do not ask for a new-versus-existing app setting; discover the app from its files and ask only for an install path when needed.`;

const briefing = (context: GuideContext) => {
  const { started, opened } = context;
  const byAgent = started !== "user";
  const streaming = started === "agent-stream";
  return `You are the coding agent for a setup ${byAgent ? (streaming ? (!opened ? "you started; setup opens no browser (--no-open), so the user follows it on the setup page if they open it, or answers you in your own conversation" : "you started; the user follows it in their browser, which setup opens when you ask the user something") : "you opened in the user's browser") : "the user opened in their browser"}. The browser shows this setup live; every command below updates it. The user watches the browser, not this terminal: once setup begins, send questions through "ask" so the user can answer in their browser.

${streamSection(streaming, byAgent && !opened)}

${keepGoing}

The user can message you at any time, including while a question is waiting. Read "message.created" events, acknowledge each with "{{cmd}} {{url}} ack <message-id>", and reply using "log" with what you will do. Pending messages are replayed when the stream starts and listed in "status". A message is not an answer or plan approval; keep those decisions explicit.

"log" is a message to the user, and the user reads every one: send it only to reply to their message, to tell them something no question or step conveys (a blocker, a deviation from the plan, a decision you made for them), or once as a wrap-up when the install is finished. Findings go in the plan, progress in step notes, questions in "ask"; do not narrate.

${byAgent ? agentStartedHandoff(context) : beginPlanHandoff}

The remaining phases are plan, then install.

1. Plan. Investigate only; change nothing yet. If the current directory is not an app to install into (a monorepo root, an empty folder, a library), ask where to install first:
  {{cmd}} {{url}} ask "Which project should I install into?" --placeholder "An absolute path to the app" --wait
Read the project: its app framework and package manager, the agent framework and model provider it already uses, where components live, any existing chat route. Fetch each product's "guide" URL from the setup below; it is the install reference. Ask for what the project does not decide, using the standard questions so the browser can render them well:
  {{cmd}} {{url}} ask --preset framework
  {{cmd}} {{url}} ask --preset llm-provider
The setup's products are starting names and guide references. If the setup lists no products, first ask the user what to set up with a choice question whose options are slugs from https://www.assistant-ui.com/catalog.md, then fetch https://www.assistant-ui.com/install.md?items=<slugs> as the guide. Explore each product's setup instructions, then discover and plan any other relevant products or dependencies the app needs. Read /catalog.md on the guide URL’s origin to find related products and fetch their setup guides. The starting list does not restrict the implementation or require adding another product to the list. Include relevant additions in the plan for approval.${entryPointQuestion}
Skip a preset the code already answers (a chat route on the AI SDK, a provider key in .env.local) and log why. Ask everything at once, keep investigating, and then run "wait <input-id>" for each open question before you write the plan; do not end your turn while they are open. A framework answer is "<framework>:<language>", for example "ai-sdk:typescript". A model answer is JSON {"provider","model","reasoningEffort"?}. An answer may carry a "note" from the user; follow it. A choice answer that matches none of the options is the user's own text.
Then write the plan as markdown and submit it:
  {{cmd}} {{url}} plan --file <path> --wait
Use these headings, each with bullets: "## What I found" (facts as \`- **Label:** value\`: app framework, package manager, agent framework, model provider and model, where components live), "## What I will install" (packages and files, one per bullet), "## Steps" (a numbered list, one line each), and "## Open questions" only if any remain. Keep it under 30 lines; no preamble. "plan --wait" prints {"decision":"approve"} or {"decision":"revise","feedback":"..."}; when it prints {"ok":false,"status":"waiting"}, the plan is submitted and still with the user, so keep waiting with "wait plan" and do not submit it again. On revise, address the feedback (ask again if you need to) and submit a new plan; repeat until approved. Do not change the project before approval: the setup refuses steps until then.

2. Install. Declare the steps from your plan up front, in order:
  {{cmd}} {{url}} add-step "<title>" --detail "<one line>"
which prints the step id. Then work through them: "step <id> active" before, "step <id> done --note '<one line on what you did>'" after; "skipped" when the step is already satisfied, "blocked" when you cannot continue, saying why in --note. Add steps as the work reveals them. Ask when you need another decision or value (--choices for a pick, plain for text; --optional when you can proceed without an answer; --wait only when the answer is the very next thing you need). A choice question is multi-select: the user checks any number of your options, and the answer is an array of the ids they checked, plus their own text as an entry when they typed one. Pass --single only when the options exclude each other (one framework, one model, yes or no); the answer is then one id. Every option must carry an icon, given as --icons "<id>=<icon>,..." with the closest name from this pack: {{icons}}. A question without an icon for each option is refused. Open inputs the user has not answered are listed under "inputs" in "status"; check them before asking again.
The API key behind a model answer is not in the answer and you never see it: pick the variable name the provider's SDK reads (OPENAI_API_KEY, ANTHROPIC_API_KEY, ...) and run
  {{cmd}} {{url}} env <input-id> <ENV_VAR> --file .env.local
which writes ENV_VAR=<key> into that file. Use the answer's model in the chat route and map reasoningEffort onto the provider's setting when it is set. If "env" says the key was never deposited (the model question was answered from your conversation), ask the user to add the key to that file themselves. Never invent a key or a model name.

When every product is installed and verified, run
  {{cmd}} {{url}} done --summary "<one or two lines on what you installed and how to try it>" --preview http://localhost:<port>
Before that, start the project's dev server in the background when the project has one, check that the page you changed loads, and pass the address as --preview (the page itself when it is not the root); leave the server running so the user can try the result. Omit --preview when there is nothing to open. This proposes closing the setup; only the user closes it. Do not stop the stream or exit: stay idle on it, because the user may follow up with a "message.created" event. Handle it, then run "done" again. The stream prints "finished" once the user closes the setup, and "cancelled" if they end it early. Keep the stream running after either: the user's next setup starts on this same URL and arrives as "setup.created" with its products. Run
  {{cmd}} {{url}} wait start
which returns once that setup begins, then run "status" for its products, guides and instructions and go through plan and install again. A "setup.created" event while you are still working means the user replaced this setup: drop what you were doing and start over the same way.
`;
};

/** What the agent reads first in the output of a setup command that keeps running. */
const streamBriefing = (opened: boolean) =>
  `{{name}} is running. This command keeps running: it is the setup's stream.

1. Keep it running in the background until the setup ends. If you started it in the foreground, stop it and resume it in the background (Claude Code: Bash with run_in_background; Codex and other agents: add > "\${TMPDIR:-/tmp}/setup-{{linkId}}.log" 2>&1 & and read that file):
  {{cmd}} {{url}} stream${opened ? "" : " --no-open"}
2. Its new output does not wake you, so never end your turn to wait for it. Read the new lines between your other commands; each line after this briefing is a JSON array of events. Answers reach you through the blocking "wait" commands below.
3. Run every other command in another shell: {{cmd}} {{url}} <command>.
4. ${
    opened
      ? "Setup opens the user's browser by itself when you ask the user something; do not open it yourself."
      : `Setup will not open a browser (--no-open). Give the user {{browserUrl}} once, or ask in your own conversation.`
  } On an "input.needed" event, do what its message says; to answer from here, run its "answer" command with the user's reply.

`;

const KEEP_WORKING =
  "Then keep working in the same turn; when you need the answer, block on it{{wait}}. Do not end your turn to wait: nothing on this stream wakes you.";

/** The guide for a CLI, worded for who started the setup and whether a browser opens. */
export const buildGuide = (context: GuideContext): Guide => {
  const intro: GuideStep[] = [
    { action: "announce-agent" },
    { action: "print", text: "briefing" },
    { action: "print", text: "intro.status-heading" },
    { action: "print-status" },
  ];
  return {
    protocol: 1,
    texts: {
      briefing: briefing(context),
      "intro.status-heading": "\nCurrent setup:\n",
      "stream.briefing": streamBriefing(context.opened),
      "stream.briefing-footer":
        "Setup page, if the user asks for it: {{browserUrl}}\n\nCurrent setup:\n",
      "stream.stay-connected":
        "This setup is over, not your connection. Keep the stream running, tell the user you are connected and waiting for their next setup, and run wait start.",
      "stream.opened.input": `Opened the setup in the user's browser for "{{prompt}}". Tell the user once that it is waiting there, and give them {{url}} in case it did not open. ${KEEP_WORKING}`,
      "stream.opened.plan": `Opened the setup in the user's browser for the plan review. Tell the user once that it is waiting there, and give them {{url}} in case it did not open. ${KEEP_WORKING}`,
      "stream.opened.finish":
        "Opened the setup in the user's browser for closing the setup. Tell the user once that it is waiting there, and give them {{url}} in case it did not open. The answer arrives on this stream.",
      "stream.ask.recently-opened":
        "A browser tab for setup was opened {{agoSeconds}}s ago. Wait for the user there{{wait}}, or ask the user directly in the terminal: {{question}}",
      "stream.ask.browser-closed":
        "The user closed the setup tab. Ask the user directly in the terminal: {{question}}",
      "stream.ask.no-browser":
        "No browser tab is open for this setup. Ask the user directly in the terminal, or give them {{page}}: {{question}}",
      "wait.waiting": `The user has not answered yet. Run "next" now to keep waiting (it only waits; do not repeat the command you ran, which would ask or submit again), or go on with other work and run it when you need the answer. Do not end your turn: nothing resumes you until you run it.`,
      "done.next":
        "Keep the stream running and stay idle. The user closes the setup or sends a follow-up message.",
      "need.plan.question":
        "Approve the setup plan? Show the user the plan you proposed and ask whether to go ahead or what to change.",
      "need.plan.approve": "Approve the plan",
      "need.plan.revise": "Ask for changes (pass --feedback)",
      "need.plan.format": 'approve, or revise --feedback "<what to change>"',
      "need.finish.question":
        "Everything is installed. Close the setup, or keep going?",
      "need.finish.question-preview":
        "Everything is installed and running at {{preview}}. Close the setup, or keep going?",
      "need.finish.close": "Close the setup",
      "need.finish.format":
        "close; if the user wants more, do it and run done again instead",
      "need.input.empty-prompt": "Your agent needs an answer.",
      "need.input.optional": " (optional; --dismiss skips it)",
      "need.input.model":
        " The API key is not typed here: the user adds it to the project's env file themselves.",
      "need.product.add": "Add {{product}}",
      "need.product.decline": "Leave it out",
      "need.format.text": "the user's text, as one shell word",
      "need.format.product": "add or decline",
      "need.format.model": "<provider>:<model>, such as openai:gpt-5",
      "need.format.entry-point": "one option id",
      "need.format.choice": "one option id, or the user's own text",
      "need.format.multiple":
        "option ids separated by commas, or the user's own text",
    },
    intro,
  };
};

/**
 * One builder for every guide protocol a published CLI speaks. The server is
 * the only source of the text, so a protocol stays here until no CLI in use
 * speaks it; a new one is added beside it, never in its place.
 */
const BUILDERS: Record<string, (context: GuideContext) => Guide> = {
  "1": buildGuide,
};

const STARTS: readonly GuideContext["started"][] = [
  "user",
  "agent",
  "agent-stream",
];

/** `GET /<link>/guide?protocol=<n>&started=<who>&opened=<0|1>`: the guide, or why not. */
export const respondToGuideRequest = (params: URLSearchParams) => {
  const build = Object.hasOwn(BUILDERS, params.get("protocol") ?? "")
    ? BUILDERS[params.get("protocol")!]
    : undefined;
  if (build === undefined)
    return {
      status: 426,
      body: {
        error: "unsupported-protocol",
        supported: Object.keys(BUILDERS).map(Number),
      },
    };
  const started = params.get("started") ?? "user";
  const opened = params.get("opened") ?? "1";
  if (
    !STARTS.includes(started as GuideContext["started"]) ||
    !["0", "1"].includes(opened)
  )
    return { status: 400, body: { error: "invalid-request" } };
  return {
    status: 200,
    body: build({
      started: started as GuideContext["started"],
      opened: opened === "1",
    }),
  };
};
