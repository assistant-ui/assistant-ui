export const calculateFibonacci = (index: number): string => {
  let current = 0n;
  let next = 1n;

  for (let position = 0; position < index; position += 1) {
    [current, next] = [next, current + next];
  }

  return current.toString();
};
