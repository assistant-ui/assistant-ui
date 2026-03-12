export const prettyPrintArgs = (argsText: string): string => {
  if (!argsText) return "";
  try {
    return JSON.stringify(JSON.parse(argsText), null, 2);
  } catch {
    return argsText;
  }
};
