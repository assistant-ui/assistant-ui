module.exports = (api) => {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          "react-compiler": {
            // Workspace packages resolve to paths outside node_modules, so the
            // preset's node_modules exclusion does not cover them. Restrict the
            // compiler to this app's own sources.
            sources: (filename) => filename.startsWith(__dirname),
          },
        },
      ],
    ],
  };
};
