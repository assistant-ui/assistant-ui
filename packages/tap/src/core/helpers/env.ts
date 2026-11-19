export const isDevelopment = (() => {
  try {
    return (
      process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
    );
  } catch {
    return false;
  }
})();
