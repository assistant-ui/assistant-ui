"""Tests for the assistant-ui-sync-server-api client."""

import pytest
import httpx
import warnings
from unittest.mock import AsyncMock, Mock, patch
from assistant_ui import AssistantClient
from assistant_ui.types import Message, AssistantTransportCommand


@pytest.mark.asyncio
async def test_basic_chat():
    """Test basic async chat functionality."""
    client = AssistantClient(
        base_url="https://api.example.com",
        headers={"Authorization": "Bearer test"}
    )
    
    messages: list[Message] = [
        {
            "role": "user",
            "content": [{"type": "text", "text": "Hello"}],
        }
    ]
    
    mock_response = AsyncMock()
    mock_response.is_success = True
    mock_response.status_code = 200
    mock_response.json.return_value = {"response": "Hi there!"}
    mock_response.text = "Success"
    
    with patch.object(client, "_ensure_async_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_ensure.return_value = mock_client
        
        thread = client.threads("thread-123")

        # Suppress deprecation warning for this test
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            response = await thread.chat(
                messages=messages,
                system="You are helpful"
            )

        assert response.status_code == 200

        # Check the request was made correctly
        call_args = mock_client.request.call_args
        payload = call_args[1]["json"]

        assert payload["threadId"] == "thread-123"
        assert payload["messages"] == messages
        assert payload["system"] == "You are helpful"
        # Commands should also be present due to conversion
        assert "commands" in payload
    
    await client.close()


@pytest.mark.asyncio
async def test_chat_with_tools():
    """Test chat with tools."""
    async with AssistantClient(base_url="https://api.example.com") as client:
        messages: list[Message] = []
        tools = {"search": {"description": "Search the web"}}
        
        mock_response = AsyncMock()
        mock_response.is_success = True
        mock_response.status_code = 200
        
        with patch.object(client, "_ensure_async_client") as mock_ensure:
            mock_client = AsyncMock()
            mock_client.request = AsyncMock(return_value=mock_response)
            mock_ensure.return_value = mock_client
            
            thread = client.threads("thread-456")
            await thread.chat(messages=messages, tools=tools)
            
            # Check tools were included
            call_args = mock_client.request.call_args
            assert call_args[1]["json"]["tools"] == tools


@pytest.mark.asyncio
async def test_cancel():
    """Test cancel functionality."""
    client = AssistantClient(base_url="https://api.example.com")
    
    mock_response = AsyncMock()
    mock_response.is_success = True
    mock_response.status_code = 200
    
    with patch.object(client, "_ensure_async_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_ensure.return_value = mock_client
        
        thread = client.threads("thread-789")
        await thread.cancel()
        
        # Check cancel request was made
        mock_client.request.assert_called_once_with(
            "POST",
            "/api/cancel",
            headers={"Content-Type": "application/json"},
            json={"threadId": "thread-789"}
        )
    
    await client.close()


def test_sync_chat():
    """Test synchronous chat."""
    with AssistantClient(base_url="https://api.example.com") as client:
        messages: list[Message] = [
            {
                "role": "assistant",
                "content": [
                    {"type": "text", "text": "I can help."},
                    {
                        "type": "tool-call",
                        "toolCallId": "call-123",
                        "toolName": "search",
                        "args": {"query": "weather"}
                    }
                ],
            }
        ]
        
        mock_response = Mock()
        mock_response.is_success = True
        mock_response.status_code = 200
        mock_response.text = "Success"
        
        with patch.object(client, "_ensure_sync_client") as mock_ensure:
            mock_client = Mock()
            mock_client.request = Mock(return_value=mock_response)
            mock_ensure.return_value = mock_client
            
            thread = client.threads("thread-sync")
            response = thread.chat_sync(messages=messages)
            
            assert response.status_code == 200


@pytest.mark.asyncio
async def test_async_headers():
    """Test with async header function."""
    async def get_headers():
        return {"Authorization": "Bearer dynamic-token"}
    
    client = AssistantClient(
        base_url="https://api.example.com",
        headers=get_headers
    )
    
    mock_response = AsyncMock()
    mock_response.is_success = True
    mock_response.status_code = 200
    
    with patch.object(client, "_ensure_async_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_ensure.return_value = mock_client
        
        thread = client.threads("thread-async-headers")
        await thread.chat(messages=[])
        
        # Check dynamic headers were used
        call_args = mock_client.request.call_args
        assert call_args[1]["headers"]["Authorization"] == "Bearer dynamic-token"
    
    await client.close()


def test_sync_with_async_headers_raises():
    """Test that sync methods raise error with async headers."""
    async def get_headers():
        return {"Authorization": "Bearer token"}
    
    client = AssistantClient(
        base_url="https://api.example.com",
        headers=get_headers
    )
    
    thread = client.threads("thread-123")
    
    with pytest.raises(ValueError) as exc_info:
        thread.chat_sync(messages=[])
    
    assert "async header functions" in str(exc_info.value)


@pytest.mark.asyncio
async def test_error_handling():
    """Test error handling."""
    client = AssistantClient(base_url="https://api.example.com")
    
    mock_response = AsyncMock()
    mock_response.is_success = False
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"
    
    with patch.object(client, "_ensure_async_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_ensure.return_value = mock_client
        
        thread = client.threads("thread-error")
        
        with pytest.raises(Exception) as exc_info:
            await thread.chat(messages=[])
        
        assert "Request failed with status 500" in str(exc_info.value)
    
    await client.close()


@pytest.mark.asyncio
async def test_context_manager():
    """Test async context manager."""
    async with AssistantClient(base_url="https://api.example.com") as client:
        assert client._async_client is None  # Not created until first use
        
        # Force client creation
        mock_response = AsyncMock()
        mock_response.is_success = True
        
        with patch("httpx.AsyncClient") as mock_async_client_class:
            mock_instance = AsyncMock()
            mock_instance.request = AsyncMock(return_value=mock_response)
            mock_async_client_class.return_value = mock_instance
            
            thread = client.threads("test")
            await thread.chat(messages=[])
            
            assert client._async_client is not None
    
    # After context exit, client should be closed
    assert client._async_client is None


def test_sync_context_manager():
    """Test sync context manager."""
    with AssistantClient(base_url="https://api.example.com") as client:
        assert client._sync_client is None  # Not created until first use
        
        # Force client creation
        mock_response = Mock()
        mock_response.is_success = True
        
        with patch("httpx.Client") as mock_client_class:
            mock_instance = Mock()
            mock_instance.request = Mock(return_value=mock_response)
            mock_client_class.return_value = mock_instance
            
            thread = client.threads("test")
            thread.chat_sync(messages=[])
            
            assert client._sync_client is not None
    
    # After context exit, client should be closed
    assert client._sync_client is None


@pytest.mark.asyncio
async def test_all_parameters():
    """Test chat with all possible parameters."""
    client = AssistantClient(
        base_url="https://api.example.com",
        headers={"X-API-Key": "test-key"},
        timeout=30.0
    )
    
    messages: list[Message] = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Analyze this:"},
                {"type": "image", "image": "https://example.com/img.jpg"},
                {"type": "file", "data": "https://example.com/doc.pdf", "mimeType": "application/pdf"}
            ],
            "unstable_id": "msg-123",
        }
    ]
    
    tools = {
        "analyze": {
            "description": "Analyze content",
            "parameters": {
                "type": "object",
                "properties": {"content": {"type": "string"}},
                "required": ["content"]
            }
        }
    }
    
    mock_response = AsyncMock()
    mock_response.is_success = True
    mock_response.status_code = 200
    
    with patch.object(client, "_ensure_async_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_ensure.return_value = mock_client
        
        thread = client.threads("thread-all-params")
        await thread.chat(
            messages=messages,
            tools=tools,
            system="You are an analyzer",
            unstable_assistantMessageId="asst-456",
            runConfig={"model": "gpt-4"},
            state={"session": "abc"},
            custom_field="custom_value"
        )
        
        # Check all parameters were included
        call_args = mock_client.request.call_args
        payload = call_args[1]["json"]
        
        assert payload["threadId"] == "thread-all-params"
        assert payload["system"] == "You are an analyzer"
        assert payload["messages"] == messages
        assert payload["tools"] == tools
        assert payload["unstable_assistantMessageId"] == "asst-456"
        assert payload["runConfig"] == {"model": "gpt-4"}
        assert payload["state"] == {"session": "abc"}
        assert payload["custom_field"] == "custom_value"

    await client.close()


@pytest.mark.asyncio
async def test_chat_with_commands():
    """Test chat with commands instead of messages."""
    client = AssistantClient(
        base_url="https://api.example.com",
        headers={"Authorization": "Bearer test"}
    )

    commands: list[AssistantTransportCommand] = [
        {
            "type": "add-message",
            "message": {
                "role": "user",
                "parts": [{"type": "text", "text": "Hello with commands"}]
            }
        },
        {
            "type": "add-tool-result",
            "toolCallId": "call-789",
            "toolName": "search",
            "result": {"data": "search results"},
            "isError": False,
            "artifact": None
        }
    ]

    mock_response = AsyncMock()
    mock_response.is_success = True
    mock_response.status_code = 200

    with patch.object(client, "_ensure_async_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_ensure.return_value = mock_client

        thread = client.threads("thread-cmd")
        response = await thread.chat(commands=commands)

        assert response.status_code == 200

        # Check the request was made with commands
        call_args = mock_client.request.call_args
        payload = call_args[1]["json"]

        assert payload["threadId"] == "thread-cmd"
        assert payload["commands"] == commands
        assert "messages" not in payload

    await client.close()


@pytest.mark.asyncio
async def test_chat_with_deprecated_messages():
    """Test that messages parameter shows deprecation warning."""
    client = AssistantClient(base_url="https://api.example.com")

    messages: list[Message] = [
        {
            "role": "user",
            "content": [{"type": "text", "text": "Using deprecated API"}],
        }
    ]

    mock_response = AsyncMock()
    mock_response.is_success = True
    mock_response.status_code = 200

    with patch.object(client, "_ensure_async_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_ensure.return_value = mock_client

        thread = client.threads("thread-deprecated")

        # Check deprecation warning
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            await thread.chat(messages=messages)

            assert len(w) == 1
            assert issubclass(w[0].category, DeprecationWarning)
            assert "messages' parameter is deprecated" in str(w[0].message)

        # Check both messages and commands were sent
        call_args = mock_client.request.call_args
        payload = call_args[1]["json"]

        assert payload["messages"] == messages
        assert "commands" in payload
        assert len(payload["commands"]) > 0

    await client.close()


@pytest.mark.asyncio
async def test_chat_messages_and_commands_together():
    """Test using both messages and commands together."""
    client = AssistantClient(base_url="https://api.example.com")

    messages: list[Message] = [
        {
            "role": "assistant",
            "content": [{"type": "text", "text": "Previous message"}],
        }
    ]

    commands: list[AssistantTransportCommand] = [
        {
            "type": "add-message",
            "message": {
                "role": "user",
                "parts": [{"type": "text", "text": "New command"}]
            }
        }
    ]

    mock_response = AsyncMock()
    mock_response.is_success = True
    mock_response.status_code = 200

    with patch.object(client, "_ensure_async_client") as mock_ensure:
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_ensure.return_value = mock_client

        thread = client.threads("thread-both")

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            await thread.chat(messages=messages, commands=commands)

        # Check both were merged
        call_args = mock_client.request.call_args
        payload = call_args[1]["json"]

        assert payload["messages"] == messages
        assert "commands" in payload
        # Should have original command plus converted message
        assert len(payload["commands"]) >= 2

    await client.close()


def test_sync_chat_with_commands():
    """Test synchronous chat with commands."""
    with AssistantClient(base_url="https://api.example.com") as client:
        commands: list[AssistantTransportCommand] = [
            {
                "type": "add-message",
                "message": {
                    "role": "assistant",
                    "parts": [{"type": "text", "text": "Sync command test"}]
                }
            }
        ]

        mock_response = Mock()
        mock_response.is_success = True
        mock_response.status_code = 200

        with patch.object(client, "_ensure_sync_client") as mock_ensure:
            mock_client = Mock()
            mock_client.request = Mock(return_value=mock_response)
            mock_ensure.return_value = mock_client

            thread = client.threads("thread-sync-cmd")
            response = thread.chat_sync(commands=commands)

            assert response.status_code == 200

            # Check commands were sent
            call_args = mock_client.request.call_args
            payload = call_args[1]["json"]

            assert payload["commands"] == commands