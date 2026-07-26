"use client";

type TopAnchorTurnMessage = {
  readonly id: string;
  readonly role: string;
};

export type TopAnchorTurn = {
  readonly anchorId: string;
  readonly targetId: string;
};

/**
 * A stored turn stays valid only while it is still the trailing turn: the
 * anchor immediately precedes the target, and anything after the target is a
 * pending user message awaiting the next run. An assistant message after the
 * target means the turn was superseded (e.g. an external store synced in a
 * turn completed elsewhere), so the reserve must be torn down, not preserved.
 */
export const isTopAnchorTurnValid = (
  turn: TopAnchorTurn | null,
  messages: readonly TopAnchorTurnMessage[],
) => {
  if (!turn) return false;

  const targetIndex = messages.findIndex(
    (message) => message.id === turn.targetId,
  );
  if (targetIndex < 1) return false;

  return (
    messages[targetIndex - 1]?.id === turn.anchorId &&
    messages.slice(targetIndex + 1).every((message) => message.role === "user")
  );
};

export const getActiveTopAnchorTurn = ({
  isRunning,
  messages,
}: {
  readonly isRunning: boolean;
  readonly messages: readonly TopAnchorTurnMessage[];
}) => {
  if (!isRunning) return null;

  const target = messages.at(-1);
  const anchor = messages.at(-2);
  if (anchor?.role !== "user" || target?.role !== "assistant") return null;

  return { anchorId: anchor.id, targetId: target.id };
};

export const getActiveTopAnchorAnchorId = (
  options: Parameters<typeof getActiveTopAnchorTurn>[0],
) => getActiveTopAnchorTurn(options)?.anchorId;

export const getActiveTopAnchorTargetId = (
  options: Parameters<typeof getActiveTopAnchorTurn>[0],
) => getActiveTopAnchorTurn(options)?.targetId;
