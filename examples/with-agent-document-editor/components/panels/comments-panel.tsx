"use client";

import { CheckIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import {
  useCommentsState,
  useDocumentState,
  useWorkspace,
} from "@/components/workspace-context";
import { plainText } from "@/lib/blocks";
import { threadIds } from "@/lib/comment-threads";
import {
  initialComments,
  type DocumentComment,
  type DocumentState,
} from "@/lib/document-state";
import { cn } from "@/lib/utils";

const isAnchored = (comment: DocumentComment, document: DocumentState) => {
  const block = document.blocks.find((item) => item?.id === comment.blockId);
  if (!block) return false;
  const text = plainText(block.text ?? "");
  return (
    text.includes(comment.quote) || text.includes(plainText(comment.quote))
  );
};

function Entry({ comment }: { comment: DocumentComment }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">
        {comment.author === "assistant" ? "Assistant" : "You"}
      </span>
      <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
        {comment.text}
      </p>
    </div>
  );
}

function ReplyForm({ onReply }: { onReply: (text: string) => void }) {
  const [text, setText] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const reply = text.trim();
    if (!reply) return;
    onReply(reply);
    setText("");
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Reply"
        aria-label="Reply to this comment"
        className="bg-foreground/[0.04] placeholder:text-muted-foreground/70 focus-visible:ring-ring/50 h-8 min-w-0 flex-1 rounded-lg px-2.5 text-sm outline-none focus-visible:ring-1"
      />
      <Button type="submit" size="sm" variant="ghost" disabled={!text.trim()}>
        Reply
      </Button>
    </form>
  );
}

export function CommentsPanel() {
  const [{ comments }, { setState }] = useCommentsState();
  const [document] = useDocumentState();
  const { activeCommentId, showComment } = useWorkspace();

  const saved = comments.filter(
    (comment): comment is DocumentComment => !!comment?.id,
  );
  const position = (comment: DocumentComment) => {
    const index = document.blocks.findIndex(
      (block) => block?.id === comment.blockId,
    );
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const threadOf = threadIds(saved);
  const threads = saved
    .filter((comment) => threadOf.get(comment.id) === comment.id)
    .sort(
      (a, b) =>
        Number(a.resolved) - Number(b.resolved) || position(a) - position(b),
    );

  const update = (change: (comments: DocumentComment[]) => DocumentComment[]) =>
    setState((previous) => ({
      comments: change((previous ?? initialComments).comments),
    }));

  const reply = (thread: DocumentComment, text: string) =>
    update((all) => [
      ...all,
      {
        id: `c-${Math.random().toString(36).slice(2, 8)}`,
        blockId: thread.blockId,
        quote: thread.quote,
        author: "user",
        text,
        resolved: false,
        replyTo: thread.id,
      },
    ]);

  const setResolved = (id: string, resolved: boolean) =>
    update((all) =>
      all.map((comment) =>
        comment.id === id ? { ...comment, resolved } : comment,
      ),
    );

  const remove = (id: string) => {
    update((all) => {
      const threads = threadIds(all);
      return all.filter((comment) => threads.get(comment.id) !== id);
    });
    if (activeCommentId === id) showComment(null);
  };

  if (threads.length === 0) {
    return (
      <p className="text-muted-foreground p-4 text-sm leading-relaxed">
        No comments yet. Highlight some text and choose Comment, or ask the
        assistant to review the document.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1 p-2">
      {threads.map((thread) => {
        const active = thread.id === activeCommentId;
        const replies = saved.filter(
          (comment) =>
            comment.id !== thread.id && threadOf.get(comment.id) === thread.id,
        );
        return (
          <li
            key={thread.id}
            className={cn(
              "group flex flex-col gap-2.5 rounded-xl p-3 transition-colors",
              active ? "bg-foreground/[0.05]" : "hover:bg-foreground/[0.025]",
              thread.resolved && !active && "opacity-60",
            )}
          >
            <button
              type="button"
              aria-pressed={active}
              onClick={() => showComment(active ? null : thread.id)}
              className="border-foreground/15 text-muted-foreground hover:text-foreground focus-visible:border-foreground/50 line-clamp-2 border-s-2 ps-2.5 text-start text-xs leading-relaxed italic outline-none"
            >
              {thread.quote}
            </button>
            {!thread.resolved && !isAnchored(thread, document) && (
              <p className="text-muted-foreground text-xs">
                This passage has changed since the comment was left.
              </p>
            )}
            <Entry comment={thread} />
            {replies.map((comment) => (
              <Entry key={comment.id} comment={comment} />
            ))}
            {!thread.resolved && (
              <ReplyForm onReply={(text) => reply(thread, text)} />
            )}
            <div className="text-muted-foreground -ms-1 flex items-center gap-0.5">
              {thread.resolved ? (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setResolved(thread.id, false)}
                >
                  <RotateCcwIcon data-icon="inline-start" />
                  Reopen
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setResolved(thread.id, true)}
                >
                  <CheckIcon data-icon="inline-start" />
                  Resolve
                </Button>
              )}
              <TooltipIconButton
                tooltip="Delete comment"
                side="top"
                onClick={() => remove(thread.id)}
                className="ms-auto size-6 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [&_svg]:size-3.5"
              >
                <Trash2Icon />
              </TooltipIconButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
