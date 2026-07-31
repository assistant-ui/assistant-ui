export const throwAggregated = (errors: unknown[], message: string): void => {
  if (errors.length === 0) return;
  if (errors.length === 1) throw errors[0];
  for (const error of errors) {
    console.error(error);
  }
  throw new AggregateError(errors, message);
};
