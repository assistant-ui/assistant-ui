const contextValue: unique symbol = Symbol("tap.Context");
type Context<T> = {
  [contextValue]: T;
};

export const createContext = <T>(defaultValue: T): Context<T> => {
  return {
    [contextValue]: defaultValue,
  };
};

export const withContextProvider = <T, TResult>(
  context: Context<T>,
  value: T,
  fn: () => TResult,
) => {
  const previousValue = context[contextValue];
  context[contextValue] = value;
  try {
    return fn();
  } finally {
    context[contextValue] = previousValue;
  }
};

export const tapContext = <T>(context: Context<T>) => {
  return context[contextValue];
};
