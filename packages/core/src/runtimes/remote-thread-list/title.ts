export const isTitleSourceMessage = (message: {
  status?: { type: string } | undefined;
}) => message.status?.type !== "running";
