import type { ComposerSubmission } from "../../runtime/interfaces/composer-runtime-core";
import type { ThreadMessage } from "../../types/message";
import { fromThreadMessageLike } from "../../runtime/utils/thread-message-like";

/**
 * The thread row for a submission. Its attachments stay on the submission,
 * because a message only carries attachments it was delivered with.
 */
export const submissionThreadMessage = (
  submission: ComposerSubmission,
): ThreadMessage =>
  fromThreadMessageLike(
    {
      role: submission.role,
      content: submission.text ? [{ type: "text", text: submission.text }] : [],
      attachments: [],
      metadata: {
        custom: { ...(submission.quote ? { quote: submission.quote } : {}) },
      },
    },
    submission.id,
    { type: "complete", reason: "unknown" },
  );
