import { streamPartDecoderStream } from "./streamPartDecoderStream";
import { streamPartEncoderStream } from "./streamPartEncoderStream";
import { StreamPart } from "./StreamPart";

export declare namespace StreamUtils {
  export { StreamPart };
}

/**
 * @deprecated `streamUtils` will be replaced with `assistant-stream` once it is ready.
 */
export const streamUtils = {
  streamPartEncoderStream,
  streamPartDecoderStream,
};
