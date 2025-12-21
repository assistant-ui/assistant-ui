declare module "postcss-prefix-selector" {
  import { PluginCreator } from "postcss";

  interface Options {
    prefix: string;
    transform?: (prefix: string, selector: string) => string;
  }

  const plugin: PluginCreator<Options>;
  export default plugin;
}
