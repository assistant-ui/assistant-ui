import pytest

from assistant_stream.serialization.data_stream import DataStreamEncoder
from tests.generate_data_stream_interop_fixture import CHUNKS, FIXTURE_PATH


@pytest.mark.anyio
async def test_encoder_matches_committed_fixture():
    async def stream():
        for chunk in CHUNKS:
            yield chunk

    encoder = DataStreamEncoder()
    encoded = "".join([line async for line in encoder.encode_stream(stream())])
    assert encoded.encode("utf-8") == FIXTURE_PATH.read_bytes()
