/**
 * Import maps for the React artifact iframe.
 *
 * `safe-content-frame`'s iframe is a fresh document on a content-hashed origin.
 * It has no module resolution by default; an `<script type="importmap">` in
 * the rendered HTML tells the browser where to fetch each ESM specifier.
 *
 * Entries here are URL strings only — they are NOT preloaded. The browser
 * fetches each one lazily when the user's source `import`s the specifier,
 * so a large map costs only the JSON bytes in the iframe document.
 *
 * Identical artifact content reuses the same SCF origin (per the content-hash
 * salt), so the browser caches these resources across re-renders of the same
 * artifact.
 */

/**
 * The bare minimum to render a React component:
 *   - `react`
 *   - `react-dom` (and `react-dom/client` for the `createRoot` API)
 *   - `clsx` (commonly used by hand-written components)
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
 * Mirrors the library set available inside Claude's `application/vnd.ant.react`
 * artifacts. Picking this map gives the model a familiar palette to draw from
 * (lucide icons, recharts, framer-motion, three.js / r3f, d3, etc.).
 *
 * Every React-consuming library is loaded with `?external=react,react-dom`
 * so esm.sh does NOT bundle its own copy of React. Without this flag, each
 * library ships its own React instance and the artifact crashes with React
 * error #31 ("object as React child") because the React element symbol differs
 * across instances.
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
