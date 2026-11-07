const isLoopbackHostname = (hostname: string): boolean => {
  const host = hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    /^127(?:\.\d{1,3}){3}$/.test(host) ||
    host === "[::1]"
  );
};

export const validateCloudUrl = (value: string): string => {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && isLoopbackHostname(url.hostname)))
  ) {
    throw new Error(
      "Cloud, accounts and setup URLs must use HTTPS or HTTP localhost for development.",
    );
  }
  return value.replace(/\/+$/, "");
};
