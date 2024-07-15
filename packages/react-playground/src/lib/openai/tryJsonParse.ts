export const tryJsonParse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    return { text };
  }
};
