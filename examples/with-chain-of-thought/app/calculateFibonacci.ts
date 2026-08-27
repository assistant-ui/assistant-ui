export const calculateFibonacci = (index: number): string => {
  if (!Number.isSafeInteger(index) || index < 0 || index > 1000) {
    throw new RangeError(
      "Fibonacci index must be an integer between 0 and 1000",
    );
  }

  let current = 0n;
  let next = 1n;

  for (let position = 0; position < index; position += 1) {
    [current, next] = [next, current + next];
  }

  return current.toString();
};
