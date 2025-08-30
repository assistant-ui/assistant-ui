import { tapRef, tapEffect } from "@assistant-ui/tap";

export const tapRefValue = <T>(value: T) => {
  const ref = tapRef(value);
  tapEffect(() => {
    ref.current = value;
  });
  return ref;
};
