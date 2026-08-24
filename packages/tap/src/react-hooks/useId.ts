import { useRef } from "./useRef";

let nextId = 0;

export const useId = (): string => {
  const ref = useRef<string | null>(null);
  ref.current ??= `:tap${nextId++}:`;
  return ref.current;
};
