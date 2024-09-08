import dynamic from "next/dynamic";
import { FC, PropsWithChildren } from "react";

const NoSSRWrapper: FC<PropsWithChildren> = (props) => <>{props.children}</>;

export default dynamic(() => Promise.resolve(NoSSRWrapper), {
  ssr: false,
});
