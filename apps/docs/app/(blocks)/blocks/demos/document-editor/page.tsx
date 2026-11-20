"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  unstable_Interactables,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import {
  AssistantMessageAccumulator,
  createAssistantStream,
  unstable_toolResultStream,
} from "assistant-stream";
import { asAsyncIterableStream } from "assistant-stream/utils";
import { getEditorBridge, type EditorBridge } from "./components/editor";
import data from "./data.json";
import { DocumentEditor } from "./document-editor";
import {
  mintId,
  plainText,
  seedBlocks,
  UPDATE_COMMENTS_TOOL,
  UPDATE_DOCUMENT_TOOL,
  type Block,
} from "./lib/document";

/* -------------------------------------------------------------------------- */
/* The scripted model: the preview runs without a key or a server.            */
/*                                                                            */
/* It answers from data.json and makes the same tool calls a real model       */
/* would, so the page really changes. To talk to a model instead, replace     */
/* `useLocalRuntime(scriptedModel)` below with `useChatRuntime` (see README). */
/* -------------------------------------------------------------------------- */

/** One thing a reply does: a tool call, as a model would make it, or text. */
type ScriptStep =
  | { type: "tool"; toolName: string; args: Record<string, unknown> }
  | { type: "text"; text: string };

const script = data.assistant;

const say = (text: string): ScriptStep => ({ type: "text", text });

function lastUserText(messages: readonly ThreadMessage[]) {
  const message = messages.findLast((entry) => entry.role === "user");
  return (message?.content ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ");
}

// A passage short enough to quote, cut at a word.
const quoteFrom = (text: string) => {
  const plain = plainText(text).trim();
  if (plain.length <= 64) return plain;
  const cut = plain.slice(0, 64);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 24)).trim();
};

const isHeading = (block: Block) =>
  block.type === "h1" || block.type === "h2" || block.type === "h3";

const textOf = (block: Block) => plainText(block.text).trim();

/** Where the section that starts at `heading` ends: the next heading. */
function sectionEnd(blocks: readonly Block[], heading: number) {
  const next = blocks.findIndex(
    (block, index) => index > heading && isHeading(block),
  );
  return next < 0 ? blocks.length : next;
}

const listed = (names: readonly string[]) =>
  names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

const SUMMARY_LABEL = "**Summary:**";

/** A few sentences about the page, counted from what is on it. */
function summarise(blocks: readonly Block[]) {
  const sections = blocks.filter(isHeading).map(textOf).filter(Boolean);
  const tasks = blocks.filter(
    (block) => block.type === "check" && textOf(block),
  );
  const open = tasks.filter((task) => !task.checked);
  const notes = blocks.filter(
    (block) => !isHeading(block) && block.type !== "check" && textOf(block),
  );
  const sentences: string[] = [];
  if (sections.length > 0) {
    sentences.push(
      `This page has ${sections.length === 1 ? "one section" : `${sections.length} sections`}: ${listed(sections)}.`,
    );
  }
  if (tasks.length > 0) {
    sentences.push(
      `${tasks.length - open.length} of ${tasks.length} tasks are done.`,
    );
    const next = open[0];
    sentences.push(
      next
        ? `Next up: ${textOf(next).replace(/[.!?]+$/, "")}.`
        : "Nothing is left open.",
    );
  } else if (notes[0]) {
    sentences.push(
      `It holds ${notes.length === 1 ? "one note" : `${notes.length} notes`}, starting with "${quoteFrom(notes[0].text)}".`,
    );
  }
  return `${SUMMARY_LABEL} ${sentences.join(" ")}`;
}

/**
 * Picks the scripted reply for a prompt and turns it into steps. Add a reply
 * in data.json under `assistant.replies`; a new `action` needs a case here.
 */
function planReply(prompt: string, bridge: EditorBridge | null): ScriptStep[] {
  const asked = prompt.toLowerCase();
  const reply = script.replies.find((entry) =>
    entry.match.some((keyword) => asked.includes(keyword)),
  );
  if (!reply) {
    return [
      say(
        `${script.fallback}\n\n${script.suggestions
          .map((suggestion) => `- ${suggestion}`)
          .join("\n")}`,
      ),
    ];
  }
  if (!bridge)
    return [say("The page is still loading. Try again in a moment.")];

  const page = bridge.getDocument();
  const edit = (blocks: Record<string, unknown>): ScriptStep => ({
    type: "tool",
    toolName: UPDATE_DOCUMENT_TOOL,
    args: { id: bridge.documentId, blocks },
  });

  switch (reply.action) {
    case "replace":
      return [
        edit({ set: seedBlocks(reply.blocks ?? [], `s-${mintId()}`) }),
        say(reply.text),
      ];
    case "append":
      return [
        edit({
          add: seedBlocks(reply.blocks ?? [], "new").map(
            ({ type, text, checked }) => ({
              type,
              text,
              ...(checked !== undefined && { checked }),
            }),
          ),
        }),
        say(reply.text),
      ];
    case "insert": {
      const added = seedBlocks(reply.blocks ?? [], `s-${mintId()}`);
      const headings = page.blocks.filter(
        (block) => isHeading(block) && textOf(block),
      );
      const heading =
        headings.find((block) => asked.includes(textOf(block).toLowerCase())) ??
        headings[0];
      if (!heading) {
        return [
          edit({
            add: added.map(({ type, text, checked }) => ({
              type,
              text,
              ...(checked !== undefined && { checked }),
            })),
          }),
          say(reply.empty ?? reply.text),
        ];
      }
      const end = sectionEnd(page.blocks, page.blocks.indexOf(heading));
      return [
        edit({
          set: [
            ...page.blocks.slice(0, end),
            ...added,
            ...page.blocks.slice(end),
          ],
        }),
        say(reply.text.replace("{heading}", textOf(heading))),
      ];
    }
    case "summary": {
      const first = page.blocks[0];
      const body = page.blocks.filter(
        (block) => textOf(block) && !block.text.startsWith(SUMMARY_LABEL),
      );
      if (body.length === 0) return [say(reply.empty ?? reply.text)];
      const text = summarise(body);
      if (first?.text.startsWith(SUMMARY_LABEL)) {
        return [edit({ update: [{ id: first.id, text }] }), say(reply.text)];
      }
      return [
        edit({
          set: [{ id: `s-${mintId()}`, type: "quote", text }, ...page.blocks],
        }),
        say(reply.text),
      ];
    }
    case "tidy": {
      const title = reply.heading ?? "Done";
      const at = page.blocks.findIndex(
        (block) =>
          isHeading(block) &&
          textOf(block).toLowerCase() === title.toLowerCase(),
      );
      const end = at < 0 ? -1 : sectionEnd(page.blocks, at);
      const moved = page.blocks.filter(
        (block, index) =>
          block.type === "check" &&
          block.checked &&
          textOf(block) &&
          !(index > at && index < end),
      );
      if (moved.length === 0) return [say(reply.empty ?? reply.text)];
      const kept = page.blocks.filter((block) => !moved.includes(block));
      const last = at < 0 ? undefined : page.blocks[end - 1];
      const insertAt = last ? kept.indexOf(last) + 1 : kept.length;
      const heading: Block[] = last
        ? []
        : [
            {
              id: `s-${mintId()}`,
              type: page.blocks.find(isHeading)?.type ?? "h2",
              text: title,
            },
          ];
      return [
        edit({
          set: [
            ...kept.slice(0, insertAt),
            ...heading,
            ...moved,
            ...kept.slice(insertAt),
          ],
        }),
        say(reply.text),
      ];
    }
    case "complete": {
      const open = page.blocks.filter(
        (block) => block.type === "check" && !block.checked,
      );
      if (open.length === 0) return [say(reply.empty ?? reply.text)];
      return [
        edit({ update: open.map(({ id }) => ({ id, checked: true })) }),
        say(reply.text),
      ];
    }
    case "comment": {
      const target =
        page.blocks.find((block) => block.type === "check" && block.text) ??
        page.blocks.find((block) => plainText(block.text).trim());
      if (!target) return [say(reply.empty ?? reply.text)];
      return [
        {
          type: "tool",
          toolName: UPDATE_COMMENTS_TOOL,
          args: {
            id: bridge.commentsId,
            comments: {
              add: [
                {
                  quote: quoteFrom(target.text),
                  author: "assistant",
                  text: reply.comment ?? "",
                  resolved: false,
                  replyTo: null,
                },
              ],
            },
          },
        },
        say(reply.text),
      ];
    }
    default:
      return [say(reply.text)];
  }
}

const LEFT_PAGE =
  "You left the page before I finished, so I left it as it was.";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const chunks = (text: string, size: number) =>
  text.match(new RegExp(`[\\s\\S]{1,${size}}`, "g")) ?? [];

/**
 * A `ChatModelAdapter` that plays `planReply`. Tool arguments stream a few
 * characters at a time, so an edit types itself into the page, and the tools
 * the page registered run on them exactly as they would for a model.
 */
const scriptedModel: ChatModelAdapter = {
  async *run({ messages, abortSignal, context }) {
    const bridge = getEditorBridge();
    const steps = planReply(lastUserText(messages), bridge);

    const stream = createAssistantStream(async (controller) => {
      let rejected = false;
      await wait(350);
      for (const step of steps) {
        if (abortSignal.aborted) return;
        if (step.type === "text") {
          const text = rejected ? LEFT_PAGE : step.text;
          for (const word of text.split(/(?<=\s)/)) {
            if (abortSignal.aborted) return;
            controller.appendText(word);
            await wait(24);
          }
          continue;
        }
        const call = controller.addToolCallPart({
          toolCallId: `call-${mintId()}`,
          toolName: step.toolName,
        });
        for (const piece of chunks(JSON.stringify(step.args), 14)) {
          if (abortSignal.aborted) break;
          call.argsText.append(piece);
          await wait(16);
        }
        call.argsText.close();
        call.close();
        // A call that ends after its page was left is rejected by the tool.
        rejected = getEditorBridge()?.pageId !== bridge?.pageId;
        await wait(200);
      }
    })
      .pipeThrough(
        unstable_toolResultStream(context.tools, abortSignal, async () => {
          throw new Error(
            "The scripted preview has no tool that asks a person.",
          );
        }),
      )
      .pipeThrough(new AssistantMessageAccumulator());

    yield* asAsyncIterableStream(stream);
  },
};

export default function Page() {
  const runtime = useLocalRuntime(scriptedModel);
  const config = AuiConfig({
    unstable_interactables: unstable_Interactables(),
    suggestions: Suggestions(script.suggestions.slice(0, 3)),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <DocumentEditor />
    </AssistantRuntimeProvider>
  );
}
