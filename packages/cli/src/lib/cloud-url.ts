export const validateCloudUrl = (value: string): string => {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  ) {
    throw new Error(
      "Cloud, accounts and setup URLs must use HTTPS or HTTP localhost for development.",
    );
  }
  return value.replace(/\/+$/, "");
};
