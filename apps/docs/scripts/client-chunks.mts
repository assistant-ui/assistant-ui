const NODE_MODULES = /[\\/]node_modules[\\/]/;
const REACT = /[\\/]node_modules[\\/](?:react|react-dom|scheduler)[\\/]/;
// Pre-render (transformed source) bytes, roughly 150 KB once minified.
const MAX_GROUP_SIZE = 500_000;

/**
 * Rolldown's automatic chunking emits one chunk per distinct set of importers,
 * which on the docs is thousands of chunks under 10 KB, each one a separate
 * request on page load. These groups collect the modules several routes share
 * into a few size-capped chunks.
 */
export const CLIENT_CODE_SPLITTING = {
  groups: [
    { name: "react", test: REACT, priority: 30 },
    {
      name: "vendor",
      test: NODE_MODULES,
      minShareCount: 2,
      maxSize: MAX_GROUP_SIZE,
      priority: 20,
    },
    {
      name: "shared",
      minShareCount: 2,
      maxSize: MAX_GROUP_SIZE,
      priority: 10,
    },
  ],
};
