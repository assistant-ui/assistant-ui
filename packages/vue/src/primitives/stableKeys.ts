import { computed } from "vue";

export const useStableKeys = (getKeys: () => string[]) =>
  computed<string[]>((previous) => {
    const keys = getKeys();
    return previous?.length === keys.length &&
      previous.every((key, index) => key === keys[index])
      ? previous
      : keys;
  });
