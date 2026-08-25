import type { AssistantStreamChunk } from "../../AssistantStreamChunk";

// A controller throws TypeError once its stream is closed or cancelled; that
// is the only portable signal a producer gets that the consumer went away.
const isClosedControllerError = (error: unknown) => error instanceof TypeError;

export const enqueueIfOpen = (
  controller: { enqueue(chunk: AssistantStreamChunk): void },
  chunk: AssistantStreamChunk,
) => {
  try {
    controller.enqueue(chunk);
  } catch (error) {
    if (!isClosedControllerError(error)) throw error;
  }
};

export const closeIfOpen = (controller: { close(): void }) => {
  try {
    controller.close();
  } catch (error) {
    if (!isClosedControllerError(error)) throw error;
  }
};
