"use client";

type TopAnchorTurnMessage = {
  readonly id: string;
  readonly role: string;
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
