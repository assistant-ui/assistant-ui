export const randomIdPrefix = () =>
  Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
