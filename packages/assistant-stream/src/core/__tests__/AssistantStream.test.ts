import { AssistantStream, AssistantStreamChunk } from '../AssistantStream';

describe('AssistantStream', () => {
  const createMockStream = (chunks: AssistantStreamChunk[]) => {
    return new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        chunks.forEach(chunk => controller.enqueue(chunk));
        controller.close();
      }
    });
  };

  const mockTransformer = {
    writable: new WritableStream<AssistantStreamChunk>({
      write(chunk) {
        // Mock transformer that converts chunks to Uint8Array
        return Promise.resolve();
      }
    }),
    readable: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('test'));
        controller.close();
      }
    })
  };

  const mockReverseTransformer = {
    writable: new WritableStream<Uint8Array>({
      write(chunk) {
        return Promise.resolve();
      }
    }),
    readable: new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        controller.enqueue({ type: 'text-delta', textDelta: 'test' });
        controller.close();
      }
    })
  };

  it('should create an AssistantStream instance', () => {
    const chunks = [{ type: 'text-delta', textDelta: 'hello' } as AssistantStreamChunk];
    const stream = new AssistantStream(createMockStream(chunks));
    expect(stream).toBeInstanceOf(AssistantStream);
    expect(stream.readable).toBeInstanceOf(ReadableStream);
  });

  it('should convert stream to Response', async () => {
    const chunks = [{ type: 'text-delta', textDelta: 'hello' } as AssistantStreamChunk];
    const stream = new AssistantStream(createMockStream(chunks));
    const response = stream.toResponse(mockTransformer);
    expect(response).toBeInstanceOf(Response);
  });

  it('should create AssistantStream from byte stream', async () => {
    const byteStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('test'));
        controller.close();
      }
    });
    const stream = AssistantStream.fromByteStream(byteStream, mockReverseTransformer);
    expect(stream).toBeInstanceOf(AssistantStream);
  });

  it('should tee the stream into two identical streams', async () => {
    const chunks = [{ type: 'text-delta', textDelta: 'hello' } as AssistantStreamChunk];
    const stream = new AssistantStream(createMockStream(chunks));
    const [stream1, stream2] = stream.tee();
    
    expect(stream1).toBeInstanceOf(AssistantStream);
    expect(stream2).toBeInstanceOf(AssistantStream);
  });
});