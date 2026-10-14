// UI and DevTools scan sources for CSS; Metro uses a separate declaration build.
export const isExcludedPackageTest = (file) =>
  /^packages\/(?!ui\/|react-devtools\/|metro\/)[^/]+\/src\/.*\.test\.tsx?$/.test(
    file,
  );
