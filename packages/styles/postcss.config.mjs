/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-nested": {},
    "postcss-prefix-selector": {
      prefix: ":where(.aui-root)",
      transform: function (prefix, selector) {
        if (selector === ":where(.aui-root) :root") {
          return ":root :where(.aui-root)";
        }
        if (selector === ":where(.aui-root) :host") {
          return ":host :where(.aui-root)";
        }
        return selector;
      },
    },
  },
};

export default config;
