import { StreamdownTextPrimitive } from '@assistant-ui/react-streamdown';
import { code } from '@streamdown/code';

const plugins = { code };

export function MarkdownText() {
  return <StreamdownTextPrimitive plugins={plugins} />;
}
