export const disposeControllers = (
  controllers: Iterable<{ dispose(): void }>,
) => {
  let cleanupFailed = false;
  let cleanupError: unknown;

  for (const controller of controllers) {
    try {
      controller.dispose();
    } catch (error) {
      if (cleanupFailed) {
        console.error(error);
      } else {
        cleanupFailed = true;
        cleanupError = error;
      }
    }
  }

  if (cleanupFailed) throw cleanupError;
};
