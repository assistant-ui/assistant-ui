/**
 * Import maps for the React artifact iframe.
 *
 * The SafeContentFrame iframe is a fresh document on a content-hashed origin
 * with no module resolution; a `<script type="importmap">` in the rendered
 * HTML tells the browser where to fetch each ESM specifier. Entries are URL
 * strings only and are not preloaded; the browser fetches each lazily when the
 * model's source `import`s the specifier, so a large map costs only the JSON
 * bytes in the document. Identical artifact content reuses the same origin, so
 * the browser caches these across re-renders.
 */

/**
 * The bare minimum to render a React component: `react`, `react-dom`, and
 * `clsx` (commonly used by hand-written components).
 */
export const minimalImportMap: Record<string, string> = {
  react: "https://esm.sh/react@18.3.1",
  "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
  "react/jsx-dev-runtime": "https://esm.sh/react@18.3.1/jsx-dev-runtime",
  "react-dom": "https://esm.sh/react-dom@18.3.1",
  "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
  clsx: "https://esm.sh/clsx@2.1.1",
};

/**
 * Mirrors the library set available inside Claude's React artifacts (lucide,
 * recharts, framer-motion, d3, three / r3f, react-router), giving the model a
 * familiar palette.
 *
 * Every React-consuming library is loaded with `?external=react,react-dom` so
 * esm.sh does not bundle its own React copy; without it each library ships its
 * own instance and the artifact crashes with React error #31 (the element
 * symbol differs across instances).
 */
export const claudeParityImportMap: Record<string, string> = {
  ...minimalImportMap,
  classnames: "https://esm.sh/classnames@2.5.1",
  "lucide-react":
    "https://esm.sh/lucide-react@0.469.0?external=react,react-dom",
  recharts: "https://esm.sh/recharts@2.13.3?external=react,react-dom",
  "framer-motion":
    "https://esm.sh/framer-motion@11.15.0?external=react,react-dom",
  d3: "https://esm.sh/d3@7.9.0",
  three: "https://esm.sh/three@0.171.0",
  "@react-three/fiber":
    "https://esm.sh/@react-three/fiber@8.17.10?external=react,react-dom,three",
  "@react-three/drei":
    "https://esm.sh/@react-three/drei@9.121.4?external=react,react-dom,three,@react-three/fiber",
  "react-router-dom":
    "https://esm.sh/react-router-dom@6.28.0?external=react,react-dom",
};
