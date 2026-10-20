import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { resource, withKey } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";
import { useClientLookup } from "@assistant-ui/store/client";

import type { AppendMessage } from "../../types/message";
import type {
  Attachment,
  CompleteAttachment,
  CreateAttachment,
  PendingAttachment,
} from "../../types/attachment";
import {
  isAttachmentComplete,
  isCreateAttachment,
} from "../../types/attachment";
import type { QuoteInfo } from "../../types/quote";
import type {
  ExternalThreadQueueAdapter,
  QueuePlacement,
} from "../../runtime/queue/external-thread-queue-adapter";
import type { ComposerSubmission } from "../../runtime/interfaces/composer-runtime-core";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { QueueItemState } from "../scopes/queue-item";
import type { ComposerSendOptions } from "../scopes/composer";
import { fileMatchesAccept, liftNonTextParts } from "../../adapters/attachment";
import {
  AttachmentAddOperations,
  drainAttachmentAdd,
} from "../../runtime/utils/attachment-add-operations";
import { AttachmentSendOperations } from "../../runtime/utils/attachment-send-operations";
import { generateId } from "../../utils/id";
import type { ExternalThreadMessage } from "./external-thread";

const EMPTY_QUEUE_ITEMS: readonly QueueItemState[] = [];

type AttachmentResourceProps = {
  attachment: Attachment;
  onRemove?: () => void | Promise<void>;
};

// Attachment Client - minimal implementation
const useAttachmentResource = ({
  attachment,
  onRemove,
}: AttachmentResourceProps): ClientOutput<"attachment"> => {
  return {
    getState: () => attachment,
    remove: async () => {
      await onRemove?.();
    },
  };
};

export const AttachmentResource = resource(useAttachmentResource);

const EMPTY_MESSAGE_KEYS: readonly string[] = Object.freeze([]);

export type CleanupOwner = (
  source: AttachmentSendOperations,
  attachment: PendingAttachment,
) => void;

type ComposerClientResourceProps = {
  type: "thread" | "edit";
  canCancel: boolean;
  isRunning?: boolean;
  isSendDisabled?: boolean;
  onCancel?: () => void;
  onBeginEdit?: () => void;
  onSend?: (message: AppendMessage) => void;
  message?: ExternalThreadMessage;
  queue?: ExternalThreadQueueAdapter | undefined;
  attachmentAdapter?: AttachmentAdapter | undefined;
  captureCleanupOwner?: (() => CleanupOwner) | undefined;
  /** `id|role` of each thread message, used to tell when a send has landed. */
  messageKeys?: readonly string[] | undefined;
};

const useQueueItemClient = ({
  item,
  onMove,
  onRemove,
}: {
  item: QueueItemState;
  onMove: (placement: QueuePlacement) => void;
  onRemove: () => void;
}): ClientOutput<"queueItem"> => {
  return {
    getState: () => item,
    steer: () => onMove({ lane: "steer", insertAfter: null }),
    move: onMove,
    remove: onRemove,
  };
};

const QueueItemClient = resource(useQueueItemClient);

// State whose setter tracks the latest value in a ref, so imperative
// call sequences (setText immediately followed by send) observe the write
// before React re-renders — legacy composer parity.
const useLiveState = <T>(initial: T) => {
  const [state, setState] = useState(initial);
  const ref = useRef(state);
  const set = useCallback((next: T | ((prev: T) => T)) => {
    ref.current =
      typeof next === "function" ? (next as (prev: T) => T)(ref.current) : next;
    setState(ref.current);
  }, []);
  return [state, set, ref] as const;
};

const dispatchSafely = (dispatch: () => void) => {
  try {
    dispatch();
    return undefined;
  } catch (error) {
    return { error };
  }
};

// A hidden thread keeps preparing its send, so only the owner's permanent
// teardown aborts it, never an effect cleanup.
const abortOnDestroy = (
  destroySignal: AbortSignal | undefined,
  controller: AbortController,
) => {
  if (!destroySignal) return () => {};
  const abort = () => controller.abort(destroySignal.reason);
  if (destroySignal.aborted) {
    abort();
    return () => {};
  }
  // A cancelled send can stay unsettled forever, so its abort unlinks too.
  const unlink = () => {
    destroySignal.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", unlink);
  };
  destroySignal.addEventListener("abort", abort, { once: true });
  controller.signal.addEventListener("abort", unlink, { once: true });
  return unlink;
};

type InTransitEntry = {
  readonly submission: ComposerSubmission;
  /** `id|role` of each thread message when the submission was dispatched. */
  readonly known: ReadonlySet<string>;
};

const EMPTY_IN_TRANSIT: readonly InTransitEntry[] = Object.freeze([]);

// Composer Client - minimal implementation
const useComposerClientResource = ({
  type,
  canCancel,
  isRunning = false,
  isSendDisabled = false,
  onCancel,
  onBeginEdit,
  onSend,
  message,
  queue,
  attachmentAdapter,
  captureCleanupOwner,
  messageKeys = EMPTY_MESSAGE_KEYS,
}: ComposerClientResourceProps): ClientOutput<"composer"> => {
  const [isEditing, setIsEditing, isEditingRef] = useLiveState(
    type === "thread",
  );
  const [text, setText, textRef] = useLiveState("");
  const [role, setRole, roleRef] = useLiveState<
    "user" | "assistant" | "system"
  >("user");
  const [runConfig, setRunConfig, runConfigRef] = useLiveState<
    Record<string, unknown>
  >({});
  const [attachments, setAttachments, attachmentsRef] = useLiveState<
    readonly Attachment[]
  >([]);
  const [quote, setQuote, quoteRef] = useLiveState<
    { readonly text: string; readonly messageId: string } | undefined
  >(undefined);
  const attachmentAddOperations = useMemo(
    () => new AttachmentAddOperations(),
    [],
  );
  const attachmentSends = useMemo(() => new AttachmentSendOperations(), []);
  const nonTextPassthrough = useRef<
    readonly ExternalThreadMessage["content"][number][]
  >([]);
  const destroySignal = useAssistantClientDestroySignal();
  const [submission, setSubmission, submissionRef] = useLiveState<
    ComposerSubmission | undefined
  >(undefined);
  const submissionSend = useRef<
    | {
        readonly options: ComposerSendOptions | undefined;
        readonly runConfig: Record<string, unknown>;
        readonly controller: AbortController;
      }
    | undefined
  >(undefined);
  const [inTransit, setInTransit] =
    useLiveState<readonly InTransitEntry[]>(EMPTY_IN_TRANSIT);
  const messageKeysRef = useRef(messageKeys);
  const sendGeneration = useRef(0);
  const cleanupEpoch = useRef(0);

  // A dispatched message stays on screen until the host shows it, so the two
  // never swap through an empty frame. Each new message of a send's role
  // stands in for the oldest send still waiting for one, and a shown send
  // leaves in the same render its message arrives in.
  const shown = useMemo(() => {
    const claimed = new Set<string>();
    const landed = new Set<InTransitEntry>();
    for (const entry of inTransit) {
      const key = messageKeys.find(
        (candidate) =>
          !entry.known.has(candidate) &&
          !claimed.has(candidate) &&
          candidate.endsWith(`|${entry.submission.role}`),
      );
      if (key === undefined) continue;
      claimed.add(key);
      landed.add(entry);
    }
    return { landed, claimed };
  }, [inTransit, messageKeys]);
  const inTransitSubmissions = useMemo(
    () =>
      inTransit
        .filter((entry) => !shown.landed.has(entry))
        .map((entry) => entry.submission),
    [inTransit, shown],
  );
  useEffect(() => {
    messageKeysRef.current = messageKeys;
    if (shown.landed.size === 0) return;
    // A message stands in for one send only, so the sends still waiting stop
    // counting it as new.
    setInTransit((prev) =>
      prev
        .filter((entry) => !shown.landed.has(entry))
        .map((entry) => ({
          ...entry,
          known: new Set([...entry.known, ...shown.claimed]),
        })),
    );
  }, [messageKeys, shown, setInTransit]);

  const updateFromMessage = () => {
    if (!message) return;
    const messageText = message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n\n");
    setText(messageText);
    setRole(message.role);
    setQuote(message.metadata.custom.quote as QuoteInfo | undefined);
    const restored = message.attachments ?? [];
    for (const attachment of restored)
      attachmentSends.abandonRemoval(attachment);
    if (message.role === "user") {
      setAttachments([...restored, ...liftNonTextParts(message.content)]);
      nonTextPassthrough.current = [];
    } else {
      setAttachments(restored);
      nonTextPassthrough.current = message.content.filter(
        (part) => part.type !== "text",
      );
    }
  };

  const captureLocalCleanupOwner = useCallback((): CleanupOwner => {
    const epoch = cleanupEpoch.current;
    return (source, failed) => {
      if (cleanupEpoch.current !== epoch) return;
      const current = attachmentsRef.current.find(
        (attachment) => attachment.id === failed.id,
      );
      if (current) {
        if (!source.isSameRemoval(current, failed)) return;
        setAttachments((prev) =>
          prev.map((attachment) =>
            attachment === current ? failed : attachment,
          ),
        );
        return;
      }
      attachmentSends.adoptFrom(source, failed);
      setAttachments((prev) => [failed, ...prev]);
    };
  }, [attachmentSends, attachmentsRef, setAttachments]);

  const retrySubmittedRemoval = useCallback(
    (attachment: PendingAttachment, accept: CleanupOwner) => {
      attachmentSends.beginRemoval(attachment);
      void attachmentSends
        .remove(attachment, attachmentAdapter, (_error, message) => {
          console.error("Failed to remove sent attachment", message);
          const failed = attachmentSends.transfer(attachment, {
            ...attachment,
            status: { type: "incomplete", reason: "error", message },
          });
          accept(attachmentSends, failed);
        })
        .catch(() => {});
    },
    [attachmentAdapter, attachmentSends],
  );

  const handleRemoveAttachment = useCallback(
    async (attachment: Attachment) => {
      if (!attachmentSends.beginRemoval(attachment)) return;
      attachmentAddOperations.cancel(attachment.id);
      setAttachments((prev) =>
        prev.some((candidate) => candidate === attachment) ? [...prev] : prev,
      );
      await attachmentSends.remove(
        attachment,
        attachmentAdapter,
        (_error, message) => {
          const fail = (candidate: PendingAttachment) =>
            attachmentSends.transfer(candidate, {
              ...candidate,
              status: { type: "incomplete", reason: "error", message },
            });
          let hasSubmission = false;
          setSubmission((prev) => {
            hasSubmission = prev !== undefined;
            return prev
              ? {
                  ...prev,
                  attachments: prev.attachments.map((candidate) =>
                    !isAttachmentComplete(candidate) &&
                    attachmentSends.isSameRemoval(candidate, attachment)
                      ? fail(candidate)
                      : candidate,
                  ),
                }
              : prev;
          });
          setAttachments((prev) =>
            prev.map((candidate) =>
              !isAttachmentComplete(candidate) &&
              attachmentSends.isSameRemoval(candidate, attachment)
                ? fail(candidate)
                : candidate,
            ),
          );
          if (!hasSubmission)
            setAttachments((prev) =>
              prev.map((candidate) =>
                attachmentSends.isSameRemoval(candidate, attachment)
                  ? attachmentSends.restore(candidate)
                  : candidate,
              ),
            );
        },
      );
      setSubmission((prev) =>
        prev
          ? {
              ...prev,
              attachments: prev.attachments.filter(
                (candidate) =>
                  !attachmentSends.isSameRemoval(candidate, attachment),
              ),
            }
          : prev,
      );
      setAttachments((prev) =>
        prev.filter(
          (candidate) => !attachmentSends.isSameRemoval(candidate, attachment),
        ),
      );
    },
    [
      attachmentAddOperations,
      attachmentAdapter,
      attachmentSends,
      setAttachments,
      setSubmission,
    ],
  );

  const attachmentClients = useClientLookup(
    attachments.map((attachment) =>
      withKey(
        attachment.id,
        AttachmentResource({
          attachment,
          onRemove: () => handleRemoveAttachment(attachment),
        }),
      ),
    ),
  );

  const submittedAttachmentClients = useClientLookup(
    (submission?.attachments ?? [])
      .filter((attachment) => !attachments.some((a) => a.id === attachment.id))
      .map((attachment) =>
        withKey(
          attachment.id,
          AttachmentResource({
            attachment,
            onRemove: () => handleRemoveAttachment(attachment),
          }),
        ),
      ),
  );

  const removePendingAttachments = async (removed: readonly Attachment[]) => {
    if (!attachmentAdapter) return;
    await Promise.all(
      removed
        .filter((a) => a.status.type !== "complete")
        .map((attachment) => {
          attachmentSends.beginRemoval(attachment);
          return attachmentSends.remove(attachment, attachmentAdapter);
        }),
    );
  };

  const draftUploadsToRemove = (draft: readonly Attachment[]) =>
    draft.filter((attachment) =>
      attachmentSends.shouldRemoveOnClear(attachment),
    );

  const upsertAttachment = (attachment: Attachment) => {
    const current = submissionRef.current;
    if (current?.attachments.some((a) => a.id === attachment.id)) {
      setSubmission({
        ...current,
        attachments: current.attachments.map((a) =>
          a.id === attachment.id ? attachmentSends.transfer(a, attachment) : a,
        ),
      });
      return;
    }
    setAttachments((prev) => {
      const idx = prev.findIndex((a) => a.id === attachment.id);
      if (idx === -1) return [...prev, attachment];
      const next = [...prev];
      next[idx] = attachment;
      return next;
    });
  };

  const steerItems = queue?.steerItems ?? EMPTY_QUEUE_ITEMS;
  const laneItems = queue?.items ?? EMPTY_QUEUE_ITEMS;
  const queueItems = useMemo(
    () =>
      steerItems.length === 0
        ? laneItems
        : laneItems.length === 0
          ? steerItems
          : [...steerItems, ...laneItems],
    [steerItems, laneItems],
  );
  const queueItemClients = useClientLookup(
    queueItems.map((item) =>
      withKey(
        item.id,
        QueueItemClient({
          item,
          onMove: (placement) => queue?.move(item.id, placement),
          onRemove: () => queue?.remove(item.id),
        }),
      ),
    ),
  );

  const state = useMemo(() => {
    const isEmpty =
      !text.trim() &&
      !attachments.some((attachment) => !attachmentSends.isRemoved(attachment));
    return {
      text,
      role,
      attachments: attachmentClients.state,
      runConfig,
      isEditing,
      canCancel: canCancel || submission !== undefined,
      canSend:
        isEditing && !isEmpty && !isSendDisabled && submission === undefined,
      attachmentAccept: attachmentAdapter?.accept ?? "*",
      isEmpty,
      type,
      dictation: undefined,
      quote,
      queue: queueItems,
      submission,
      inTransit: inTransitSubmissions,
    };
  }, [
    text,
    role,
    attachmentClients.state,
    runConfig,
    isEditing,
    canCancel,
    isSendDisabled,
    submission,
    inTransitSubmissions,
    type,
    attachments,
    attachmentSends,
    quote,
    queueItems,
    attachmentAdapter?.accept,
  ]);

  /** Ends the send being prepared, so nothing it started can dispatch it. */
  const endSubmission = () => {
    sendGeneration.current++;
    submissionSend.current = undefined;
    setSubmission(undefined);
  };

  // Takes a send's content back into the draft, ahead of anything written
  // since. An edit composer kept its draft, so it only takes back the state
  // the attachments came back in, such as the reason one failed, and leaves
  // an attachment being removed to its removal.
  const returnToDraft = (content: ComposerSubmission) => {
    if (type !== "thread") {
      const returned = new Map(
        content.attachments.flatMap((attachment) => {
          const restored = attachmentSends.restoreUnsent(attachment);
          return restored ? [[attachment.id, restored] as const] : [];
        }),
      );
      setAttachments((prev) =>
        prev.flatMap((attachment) => {
          const restored = attachmentSends.restoreUnsent(attachment);
          return restored ? [returned.get(attachment.id) ?? restored] : [];
        }),
      );
      return;
    }
    const returned = content.attachments.flatMap((attachment) => {
      const restored = attachmentSends.restoreUnsent(attachment);
      return restored ? [restored] : [];
    });
    setAttachments((prev) => [...returned, ...prev]);
    setText((prev) => [content.text, prev].filter(Boolean).join("\n"));
    setQuote((prev) => prev ?? content.quote);
  };

  const cancelSubmission = () => {
    const current = submissionRef.current;
    if (!current) return;
    submissionSend.current?.controller.abort();
    endSubmission();
    returnToDraft(current);
  };

  const discardSubmission = async () => {
    const current = submissionRef.current;
    if (!current) return;
    submissionSend.current?.controller.abort();
    endSubmission();
    // An attachment the draft still holds is removed along with the draft.
    const drafted = new Set(attachmentsRef.current.map((a) => a.id));
    await removePendingAttachments(
      current.attachments.filter(
        (attachment) =>
          !drafted.has(attachment.id) &&
          !attachmentSends.isRemovalPending(attachment),
      ),
    );
  };

  const returnSubmissionToDraft = (
    sent: readonly Attachment[],
    settled: readonly PromiseSettledResult<CompleteAttachment>[],
    reason: unknown,
  ) => {
    const current = submissionRef.current;
    if (!current) return;
    const failures = new Map<string, unknown>();
    settled.forEach((result, index) => {
      if (result.status === "rejected")
        failures.set(sent[index]!.id, result.reason);
    });
    const attachments = current.attachments.map((attachment) => {
      if (
        !failures.has(attachment.id) ||
        isAttachmentComplete(attachment) ||
        attachmentSends.isRemoved(attachment)
      )
        return attachment;
      const failure = failures.get(attachment.id);
      return attachmentSends.transfer(attachment, {
        ...attachment,
        status: {
          type: "incomplete",
          reason: "error",
          message: failure instanceof Error ? failure.message : String(failure),
        },
      });
    });
    endSubmission();
    returnToDraft({ ...current, attachments });
    console.error("Failed to send attachments", reason);
  };

  const dispatchMessage = (
    current: ComposerSubmission,
    attachments: readonly CompleteAttachment[],
    context: {
      readonly options: ComposerSendOptions | undefined;
      readonly runConfig: Record<string, unknown>;
    },
    isSubmission: boolean,
  ) => {
    const composedMessage: AppendMessage = {
      role: current.role,
      content: [
        ...(current.text
          ? [{ type: "text" as const, text: current.text }]
          : []),
        ...nonTextPassthrough.current,
      ] as AppendMessage["content"],
      attachments,
      createdAt: new Date(),
      parentId: null,
      sourceId: null,
      runConfig: context.runConfig,
      startRun: context.options?.startRun,
      metadata: {
        custom: { ...(current.quote ? { quote: current.quote } : {}) },
      },
    };
    const sent: ComposerSubmission = { ...current, attachments };
    const completed = new Map(
      current.attachments
        .filter((attachment) => !attachmentSends.isRemoved(attachment))
        .map((attachment, index) => [attachment, attachments[index]] as const),
    );
    const returned: ComposerSubmission = {
      ...current,
      attachments: current.attachments.map(
        (attachment) => completed.get(attachment) ?? attachment,
      ),
    };
    // edit sends carry a sourceId contract; only thread sends queue
    const queued = queue && type === "thread";
    if (isSubmission) {
      submissionSend.current = undefined;
      setSubmission(undefined);
    }
    // An edit keeps its draft, whose copies of these attachments are the
    // delivered ones now, so clearing that draft must not remove their uploads.
    if (isSubmission && type !== "thread") {
      const delivered = new Map(
        current.attachments.map((attachment, index) => [
          attachment.id,
          returned.attachments[index]!,
        ]),
      );
      setAttachments((prev) =>
        prev.map((attachment) => delivered.get(attachment.id) ?? attachment),
      );
    }
    // A queued message has its own place in the UI, so only a thread send
    // stays in transit until the host shows it.
    const entry: InTransitEntry | undefined =
      isSubmission && type === "thread" && !queued
        ? { submission: sent, known: new Set(messageKeysRef.current) }
        : undefined;
    if (entry) setInTransit((prev) => [...prev, entry]);

    const acceptCleanup =
      (type === "edit" ? captureCleanupOwner?.() : undefined) ??
      captureLocalCleanupOwner();
    const failure = dispatchSafely(() => {
      if (queued) {
        if (context.options?.steer ?? isRunning) queue.steer(composedMessage);
        else queue.enqueue(composedMessage);
      } else {
        onSend?.(composedMessage);
      }
    });
    if (failure) {
      console.error("[assistant-ui] Failed to send the message", failure.error);
      if (entry)
        setInTransit((prev) => prev.filter((candidate) => candidate !== entry));
      returnToDraft(returned);
      return;
    }
    if (isSubmission)
      for (const attachment of current.attachments)
        if (!isAttachmentComplete(attachment))
          attachmentSends.dispatchRemoval(attachment, () =>
            retrySubmittedRemoval(
              attachment as PendingAttachment,
              acceptCleanup,
            ),
          );
    if (type === "edit") {
      attachmentAddOperations.cancelAll();
      setIsEditing(false);
    }
  };

  const prepareSubmission = async (generation: number) => {
    const context = submissionSend.current;
    if (!context) return;
    const { signal } = context.controller;
    if (signal.aborted) return;

    const uploads = (submissionRef.current?.attachments ?? []).flatMap(
      (attachment) => {
        const upload = attachmentAddOperations.whenSendable(attachment.id);
        return upload ? [upload] : [];
      },
    );
    if (uploads.length > 0) {
      // An attachment still uploading in `add()` cannot be finalized yet, so
      // the submission waits for its latest state.
      await Promise.all(uploads);
      if (generation !== sendGeneration.current || signal.aborted) return;
    }

    const current = submissionRef.current;
    if (!current) return;
    const sent = current.attachments.filter(
      (attachment) => !attachmentSends.isRemoved(attachment),
    );
    for (const attachment of sent)
      attachmentAddOperations.cancel(attachment.id);

    const settled = await Promise.allSettled(
      sent.map((attachment) =>
        attachmentSends.send(attachment, attachmentAdapter, signal),
      ),
    );
    if (generation !== sendGeneration.current || signal.aborted) return;

    const rejection = settled.find((result) => result.status === "rejected");
    if (rejection) {
      returnSubmissionToDraft(sent, settled, rejection.reason);
      return;
    }

    // An attachment removed mid-upload can't be cancelled, but it can still be
    // dropped from the outgoing message instead of silently being sent anyway.
    const finalAttachments = settled.flatMap((result, index) =>
      attachmentSends.isRemoved(sent[index]!) || result.status === "rejected"
        ? []
        : [result.value],
    );
    const submitted = submissionRef.current ?? current;
    if (!submitted.text.trim() && finalAttachments.length === 0) {
      endSubmission();
      returnToDraft(submitted);
      return;
    }
    dispatchMessage(submitted, finalAttachments, context, true);
  };

  return {
    getState: () => state,
    setText,
    setRole,
    setRunConfig,
    addAttachment: async (fileOrAttachment: File | CreateAttachment) => {
      if (attachmentAdapter) {
        const file = isCreateAttachment(fileOrAttachment)
          ? {
              name: fileOrAttachment.name,
              type: fileOrAttachment.contentType ?? "",
            }
          : { name: fileOrAttachment.name, type: fileOrAttachment.type };
        if (!fileMatchesAccept(file, attachmentAdapter.accept))
          throw new Error(
            `File type ${file.type || "unknown"} is not accepted. Accepted types: ${attachmentAdapter.accept}`,
          );
      }
      if (!isCreateAttachment(fileOrAttachment) && attachmentAdapter) {
        const operation = attachmentAddOperations.start();
        try {
          await drainAttachmentAdd(
            attachmentAdapter.add({ file: fileOrAttachment }),
            (attachment) => {
              if (!attachmentAddOperations.accept(operation, attachment))
                return false;
              upsertAttachment(attachment);
              return true;
            },
          );
          attachmentAddOperations.finish(operation);
        } catch (error) {
          attachmentAddOperations.finish(operation);
          if (!attachmentAddOperations.isCancelled(operation)) throw error;
        }
      } else if (!isCreateAttachment(fileOrAttachment)) {
        const newAttachment: Attachment = {
          id: generateId(),
          type: "file",
          name: fileOrAttachment.name,
          contentType: fileOrAttachment.type,
          file: fileOrAttachment,
          status: { type: "complete" },
          content: [],
        };
        setAttachments((prev) => [...prev, newAttachment]);
      } else {
        const newAttachment: Attachment = {
          id: fileOrAttachment.id ?? generateId(),
          type: fileOrAttachment.type ?? "document",
          name: fileOrAttachment.name,
          contentType: fileOrAttachment.contentType,
          content: fileOrAttachment.content,
          status: { type: "complete" },
        };
        setAttachments((prev) => [...prev, newAttachment]);
      }
    },
    clearAttachments: async () => {
      cleanupEpoch.current++;
      // A send that detached the draft holds the submission's attachments, so
      // their uploads keep going for it.
      attachmentAddOperations.cancelAll(
        type === "thread"
          ? new Set(
              submissionRef.current?.attachments.map(
                (attachment) => attachment.id,
              ),
            )
          : undefined,
      );
      const removed = attachmentsRef.current;
      // Taken before the marks below, which would read as pending removals.
      const pending = draftUploadsToRemove(removed);
      if (submissionRef.current) {
        for (const attachment of removed)
          attachmentSends.beginRemoval(attachment);
      }
      setAttachments([]);
      await removePendingAttachments(pending);
    },
    attachment: (selector) => {
      if ("id" in selector) {
        const submitted = submission?.attachments.some(
          (attachment) => attachment.id === selector.id,
        );
        const inDraft = attachments.some(
          (attachment) => attachment.id === selector.id,
        );
        if (submitted && !inDraft)
          return submittedAttachmentClients.get({ key: selector.id });
        return attachmentClients.get({ key: selector.id });
      }
      return attachmentClients.get(selector);
    },
    reset: async () => {
      cleanupEpoch.current++;
      attachmentAddOperations.cancelAll();
      sendGeneration.current++;
      const discarded = discardSubmission();
      const removed = attachmentsRef.current;
      setText("");
      setRole("user");
      setRunConfig({});
      setAttachments([]);
      setQuote(undefined);
      nonTextPassthrough.current = [];
      await Promise.all([
        removePendingAttachments(draftUploadsToRemove(removed)),
        discarded,
      ]);
    },
    send: (opts?: ComposerSendOptions) => {
      // An attachment whose removal is still awaiting the adapter is excluded
      // up front, or a send started mid-removal would upload and dispatch it.
      const currentAttachments = attachmentsRef.current.filter(
        (attachment) => !attachmentSends.isRemoved(attachment),
      );
      const isEmpty = !textRef.current.trim() && !currentAttachments.length;
      if (!isEditingRef.current) throw new Error("Composer is not available");
      if (isEmpty || isSendDisabled || submissionRef.current) return;

      const submitted: ComposerSubmission = {
        id: generateId(),
        role: roleRef.current,
        text: textRef.current,
        quote: quoteRef.current,
        attachments: currentAttachments,
      };
      const context = { options: opts, runConfig: runConfigRef.current };
      // Only a send whose attachments still need the adapter becomes a
      // submission; one with nothing left to prepare goes out right away, as
      // it always has, and never shows up as a row of its own.
      const complete = currentAttachments.filter(isAttachmentComplete);
      const ready = complete.length === currentAttachments.length;
      const controller = ready ? undefined : new AbortController();
      if (controller) {
        submissionSend.current = { ...context, controller };
        setSubmission(submitted);
      }
      if (type === "thread") {
        const detached = new Set(currentAttachments);
        setAttachments((prev) =>
          prev.filter((attachment) => !detached.has(attachment)),
        );
        setText("");
        setQuote(undefined);
      }
      const generation = ++sendGeneration.current;
      if (!controller) {
        dispatchMessage(submitted, complete, context, false);
        return;
      }
      const release = abortOnDestroy(destroySignal, controller);
      void prepareSubmission(generation).finally(release);
    },
    cancel: () => {
      // Stopping takes a send still being prepared back into the draft and
      // still stops a run that is going, so the one control never loses either.
      if (type === "thread" && submissionRef.current) {
        cancelSubmission();
        if (canCancel) onCancel?.();
        return;
      }
      // An edit session ends here, so its in-flight adapter adds must not
      // land in a later session; the thread composer's cancel stops the run
      // and leaves the draft (and its pending adds) alone.
      if (type === "edit") {
        cleanupEpoch.current++;
        attachmentAddOperations.cancelAll();
        sendGeneration.current++;
        void discardSubmission();
        const removed = attachmentsRef.current;
        setAttachments([]);
        removePendingAttachments(draftUploadsToRemove(removed)).catch(
          (error) => {
            console.error("Failed to remove cancelled edit attachments", error);
          },
        );
      }
      onCancel?.();
      if (type === "edit") setIsEditing(false);
    },
    beginEdit: () => {
      onBeginEdit?.();
      if (type === "thread") return;
      if (isEditingRef.current) throw new Error("Edit already in progress");
      cleanupEpoch.current++;
      setIsEditing(true);
      updateFromMessage();
    },
    captureCleanupOwner: captureLocalCleanupOwner,
    startDictation: () => {},
    stopDictation: () => {},
    setQuote,
    queueItem: (selector: { index: number } | { id: string }) => {
      if ("id" in selector) {
        return queueItemClients.get({ key: selector.id });
      }
      return queueItemClients.get(selector);
    },
  };
};

export const ComposerClientResource = resource(useComposerClientResource);
