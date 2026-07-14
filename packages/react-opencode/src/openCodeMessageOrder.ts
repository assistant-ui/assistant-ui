type OpenCodeMessageOrderInfo = {
  id: string;
  time?: { created?: number } | undefined;
};

export const compareOpenCodeMessageOrder = (
  left: OpenCodeMessageOrderInfo,
  right: OpenCodeMessageOrderInfo,
) => {
  const leftCreated = left.time?.created ?? Number.MAX_SAFE_INTEGER;
  const rightCreated = right.time?.created ?? Number.MAX_SAFE_INTEGER;
  if (leftCreated !== rightCreated) return leftCreated - rightCreated;
  return left.id.localeCompare(right.id);
};
