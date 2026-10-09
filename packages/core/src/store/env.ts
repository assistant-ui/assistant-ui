// Bundlers replace the process.env.NODE_ENV literal statically (Vite, webpack,
// Metro); the try covers hosts where no process binding exists at runtime.
export const isDevelopment = (() => {
  try {
    return (
      process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
    );
  } catch {
    return false;
  }
})();
