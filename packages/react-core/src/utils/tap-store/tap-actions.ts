import { tapRef, tapEffect, tapMemo } from "@assistant-ui/tap";

interface ActionsObject {
  [key: string]: Function | ActionsObject;
}

export const tapActions = <T extends ActionsObject>(inner: T) => {
  const ref = tapRef(inner);
  tapEffect(() => {
    ref.current = inner;
  });

  return tapMemo(() => {
    return new Proxy({} as T, {
      get(_target, prop) {
        return ref.current[prop as keyof T];
      },
    });
  }, []);
};