import { Children, Fragment, isValidElement, type ReactNode } from "react";
import type { TabProps, TabsProps } from "./tabs";

// Tab bodies concatenate in text and read as sequential steps ("install all 11
// SDKs") unless labeled. Frame as "Choose one:" and label each body by its
// `value` prop, falling back to the parent `items` entry by position.
export function TabsLLM({ items, children }: TabsProps): ReactNode {
  const tabs = Children.toArray(children).filter(isValidElement);
  return (
    <>
      <p>Choose one:</p>
      {tabs.map((tab, index) => {
        const label = (tab.props as { value?: string }).value ?? items?.[index];
        return (
          <Fragment key={index}>
            {label ? (
              <p>
                <strong>{label}</strong>
              </p>
            ) : null}
            {tab}
          </Fragment>
        );
      })}
    </>
  );
}

export function TabLLM({ children }: TabProps): ReactNode {
  return <>{children}</>;
}
