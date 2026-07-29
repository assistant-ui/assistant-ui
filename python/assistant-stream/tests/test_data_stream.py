import json

from assistant_stream.assistant_stream_chunk import (
    AnnotationsChunk,
    FileChunk,
    StepFinishChunk,
    StepStartChunk,
    UpdateStateChunk,
)
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


def test_data_stream_encoder_annotations_frame() -> None:
    encoder = DataStreamEncoder()

    encoded = encoder.encode_chunk(
        AnnotationsChunk(annotations=[{"type": "citation", "id": "a1"}])
    )

    assert encoded == '8:[{"type": "citation", "id": "a1"}]\n'


def test_data_stream_encoder_step_start_frame() -> None:
    encoder = DataStreamEncoder()

    encoded = encoder.encode_chunk(StepStartChunk(message_id="msg_1"))

    assert encoded == 'f:{"messageId": "msg_1"}\n'


def test_data_stream_encoder_step_finish_frame() -> None:
    encoder = DataStreamEncoder()

    encoded = encoder.encode_chunk(
        StepFinishChunk(
            finish_reason="stop",
            input_tokens=12,
            output_tokens=34,
            is_continued=False,
        )
    )

    assert encoded == (
        'e:{"finishReason": "stop", '
        '"usage": {"inputTokens": 12, "outputTokens": 34}, '
        '"isContinued": false}\n'
    )


def test_data_stream_encoder_file_frame() -> None:
    encoder = DataStreamEncoder()

    encoded = encoder.encode_chunk(FileChunk(data="aGVsbG8=", mime_type="image/png"))

    assert encoded == 'k:{"data": "aGVsbG8=", "mimeType": "image/png"}\n'


def test_data_stream_encoder_file_frame_has_no_parent_id_field() -> None:
    encoder = DataStreamEncoder()

    encoded = encoder.encode_chunk(
        FileChunk(data="x", mime_type="text/plain", parent_id="p1")
    )

    assert encoded == 'k:{"data": "x", "mimeType": "text/plain"}\n'
