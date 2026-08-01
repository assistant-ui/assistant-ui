import pytest

from assistant_stream.serialization.assistant_transport import AssistantTransportEncoder
from tests.generate_interop_fixture import CHUNKS, FIXTURE_PATH


@pytest.mark.anyio
async def test_encoder_matches_committed_fixture():
    async def stream():
        for chunk in CHUNKS:
            yield chunk

    encoder = AssistantTransportEncoder()
    encoded = "".join([line async for line in encoder.encode_stream(stream())])
    assert encoded == FIXTURE_PATH.read_text()
