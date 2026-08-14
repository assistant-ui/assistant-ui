export { Fragment } from "./jsx-runtime";

const throwRender = (): never => {
  throw new Error(
    "JSX from @assistant-ui/tap/standalone-shim was rendered without React. The standalone shim only makes react-coupled modules loadable; rendering them requires real React.",
  );
};

export const jsxDEV = throwRender;
