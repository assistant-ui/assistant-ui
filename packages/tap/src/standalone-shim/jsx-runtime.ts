// React-free stand-in for "react/jsx-runtime": react-coupled modules stay
// loadable under the standalone alias, while actually rendering their JSX
// still requires real React.
export const throwRender = (): never => {
  throw new Error(
    "JSX from @assistant-ui/tap/standalone-shim was rendered without React. The standalone shim only makes react-coupled modules loadable; rendering them requires real React.",
  );
};

export const Fragment = Symbol.for("react.fragment");
export const jsx = throwRender;
export const jsxs = throwRender;
