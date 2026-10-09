export const normalizeBaseUrl = (baseUrl: string): string => {
  let end = baseUrl.length;
  while (end > 0 && baseUrl[end - 1] === "/") end--;
  return baseUrl.slice(0, end);
};
