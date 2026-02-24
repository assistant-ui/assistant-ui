import json

from assistant_stream.assistant_stream_chunk import UpdateStateChunk
from assistant_stream.serialization.data_stream import DataStreamEncoder


def test_data_stream_encoder_update_state_shape() -> None:
    encoder = DataStreamEncoder()
    operations = [
        {"type": "append-text", "path": ["messages", "0", "text"], "value": "hi"}
    ]

    encoded = encoder.encode_chunk(UpdateStateChunk(operations=operations))

    assert encoded.startswith("aui-state:")
    assert encoded.endswith("\n")
    assert json.loads(encoded[len("aui-state:") :].strip()) == operations
