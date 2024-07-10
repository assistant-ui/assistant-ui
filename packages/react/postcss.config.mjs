/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    "postcss-nested": {},
    "@assistant-ui/tailwindcss-transformer": {},
  },
};

export default config;
