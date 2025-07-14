from typing import Dict, List, Any, Optional, Union, Callable, Awaitable
import httpx
from .types import Message, Tool


class ThreadClient:
    """Client for interacting with a specific thread."""
    
    def __init__(self, client: "AssistantClient", thread_id: str):
        self._client = client
        self._thread_id = thread_id
    
    async def chat(
        self,
        messages: List[Message],
        system: Optional[str] = None,
        tools: Optional[Dict[str, Tool]] = None,
        unstable_assistantMessageId: Optional[str] = None,
        runConfig: Optional[Dict[str, Any]] = None,
        state: Optional[Any] = None,
        **kwargs: Any
    ) -> httpx.Response:
        """
        Send a chat request for this thread.
        
        Args:
            messages: List of messages in the conversation
            system: System prompt
            tools: Dictionary of available tools
            unstable_assistantMessageId: Optional assistant message ID
            runConfig: Optional run configuration
            state: Optional state data
            **kwargs: Additional parameters to include in the request body
            
        Returns:
            httpx.Response object containing the backend response
        """
        # Build request payload
        payload = {
            "threadId": self._thread_id,
            "messages": messages,
        }
        
        if system is not None:
            payload["system"] = system
        
        if tools is not None:
            payload["tools"] = tools
        
        if unstable_assistantMessageId is not None:
            payload["unstable_assistantMessageId"] = unstable_assistantMessageId
        
        if runConfig is not None:
            payload["runConfig"] = runConfig
        
        if state is not None:
            payload["state"] = state
        
        # Add any additional kwargs
        payload.update(kwargs)
        
        # Make the request
        return await self._client._make_request("POST", "/api/chat", json=payload)
    
    def chat_sync(
        self,
        messages: List[Message],
        system: Optional[str] = None,
        tools: Optional[Dict[str, Tool]] = None,
        unstable_assistantMessageId: Optional[str] = None,
        runConfig: Optional[Dict[str, Any]] = None,
        state: Optional[Any] = None,
        **kwargs: Any
    ) -> httpx.Response:
        """
        Synchronous version of chat method.
        
        Args:
            messages: List of messages in the conversation
            system: System prompt
            tools: Dictionary of available tools
            unstable_assistantMessageId: Optional assistant message ID
            runConfig: Optional run configuration
            state: Optional state data
            **kwargs: Additional parameters to include in the request body
            
        Returns:
            httpx.Response object containing the backend response
        """
        # Build request payload
        payload = {
            "threadId": self._thread_id,
            "messages": messages,
        }
        
        if system is not None:
            payload["system"] = system
        
        if tools is not None:
            payload["tools"] = tools
        
        if unstable_assistantMessageId is not None:
            payload["unstable_assistantMessageId"] = unstable_assistantMessageId
        
        if runConfig is not None:
            payload["runConfig"] = runConfig
        
        if state is not None:
            payload["state"] = state
        
        # Add any additional kwargs
        payload.update(kwargs)
        
        # Make the request
        return self._client._make_request_sync("POST", "/api/chat", json=payload)
    
    async def cancel(self) -> httpx.Response:
        """
        Cancel the current operation for this thread.
        
        Returns:
            httpx.Response object containing the backend response
        """
        return await self._client._make_request(
            "POST", 
            "/api/cancel",
            json={"threadId": self._thread_id}
        )
    
    def cancel_sync(self) -> httpx.Response:
        """
        Synchronous version of cancel method.
        
        Returns:
            httpx.Response object containing the backend response
        """
        return self._client._make_request_sync(
            "POST", 
            "/api/cancel",
            json={"threadId": self._thread_id}
        )


class AssistantClient:
    """Main client for interacting with Assistant UI backends."""
    
    def __init__(
        self,
        base_url: str,
        headers: Optional[Union[Dict[str, str], Callable[[], Union[Dict[str, str], Awaitable[Dict[str, str]]]]]] = None,
        timeout: Optional[float] = None,
        **kwargs: Any
    ):
        """
        Initialize the AssistantClient.
        
        Args:
            base_url: Base URL for the API (e.g., "https://api.example.com")
            headers: Optional headers to include with requests
            timeout: Optional timeout for requests
            **kwargs: Additional arguments passed to httpx client
        """
        self.base_url = base_url.rstrip("/")
        self._headers = headers
        self._timeout = timeout
        self._client_kwargs = kwargs
        self._async_client: Optional[httpx.AsyncClient] = None
        self._sync_client: Optional[httpx.Client] = None
    
    def threads(self, thread_id: str) -> ThreadClient:
        """
        Get a ThreadClient for a specific thread.
        
        Args:
            thread_id: The ID of the thread
            
        Returns:
            ThreadClient instance for the specified thread
        """
        return ThreadClient(self, thread_id)
    
    async def _get_headers(self) -> Dict[str, str]:
        """Get headers, resolving async functions if needed."""
        if self._headers is None:
            return {"Content-Type": "application/json"}
        
        if callable(self._headers):
            headers = self._headers()
            if hasattr(headers, "__await__"):
                headers = await headers
        else:
            headers = self._headers
        
        if isinstance(headers, dict):
            headers = dict(headers)  # Make a copy
            headers.setdefault("Content-Type", "application/json")
        else:
            headers = {"Content-Type": "application/json"}
        
        return headers
    
    def _get_headers_sync(self) -> Dict[str, str]:
        """Get headers synchronously."""
        if self._headers is None:
            return {"Content-Type": "application/json"}
        
        if callable(self._headers):
            headers = self._headers()
            if hasattr(headers, "__await__"):
                raise ValueError("Synchronous methods do not support async header functions")
        else:
            headers = self._headers
        
        if isinstance(headers, dict):
            headers = dict(headers)  # Make a copy
            headers.setdefault("Content-Type", "application/json")
        else:
            headers = {"Content-Type": "application/json"}
        
        return headers
    
    async def _ensure_async_client(self) -> httpx.AsyncClient:
        """Ensure async client is initialized."""
        if self._async_client is None:
            self._async_client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self._timeout,
                **self._client_kwargs
            )
        return self._async_client
    
    def _ensure_sync_client(self) -> httpx.Client:
        """Ensure sync client is initialized."""
        if self._sync_client is None:
            self._sync_client = httpx.Client(
                base_url=self.base_url,
                timeout=self._timeout,
                **self._client_kwargs
            )
        return self._sync_client
    
    async def _make_request(
        self,
        method: str,
        path: str,
        **kwargs: Any
    ) -> httpx.Response:
        """Make an async HTTP request."""
        client = await self._ensure_async_client()
        headers = await self._get_headers()
        
        # Merge headers
        if "headers" in kwargs:
            headers.update(kwargs["headers"])
        kwargs["headers"] = headers
        
        response = await client.request(method, path, **kwargs)
        
        if not response.is_success:
            raise Exception(f"Request failed with status {response.status_code}: {response.text}")
        
        return response
    
    def _make_request_sync(
        self,
        method: str,
        path: str,
        **kwargs: Any
    ) -> httpx.Response:
        """Make a synchronous HTTP request."""
        client = self._ensure_sync_client()
        headers = self._get_headers_sync()
        
        # Merge headers
        if "headers" in kwargs:
            headers.update(kwargs["headers"])
        kwargs["headers"] = headers
        
        response = client.request(method, path, **kwargs)
        
        if not response.is_success:
            raise Exception(f"Request failed with status {response.status_code}: {response.text}")
        
        return response
    
    async def close(self):
        """Close the async client if it's open."""
        if self._async_client:
            await self._async_client.aclose()
            self._async_client = None
    
    def close_sync(self):
        """Close the sync client if it's open."""
        if self._sync_client:
            self._sync_client.close()
            self._sync_client = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    def __enter__(self):
        """Sync context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Sync context manager exit."""
        self.close_sync()