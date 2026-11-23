type ComposerHost = {
  thread: {
    composer(): {
      getState(): { text: string };
      setText(text: string): void;
    };
  };
};

/**
 * Adds `text` to the thread composer, after what the user already typed, so
 * the user reviews it and sends it. The default for a widget's `sendPrompt`
 * and a spec's `sendMessage`: a frame or a component can ask without a user
 * gesture, so neither sends on its own.
 */
export const fillComposer = (aui: ComposerHost, text: string) => {
  const composer = aui.thread.composer();
  composer.setText(
    [composer.getState().text, text].filter((part) => part.trim()).join(" "),
  );
};
