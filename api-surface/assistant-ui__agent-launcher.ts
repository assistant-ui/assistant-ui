interface LaunchOptions {
  pluginDir: string;
  skillName?: string;
  prompt: string;
  dry?: boolean;
}

declare function launch(options: LaunchOptions): void;

declare namespace index_d_exports {
  export { LaunchOptions, launch };
}

export { index_d_exports as entry_0_root };
