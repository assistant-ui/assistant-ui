/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    "@assistant-ui/tailwindcss-transformer": {},
  },
};

export default config;
