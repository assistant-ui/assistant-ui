"""Tests for the LangGraph integration."""

import unittest
from unittest.mock import MagicMock, patch

from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage

from assistant_stream.modules.langgraph import append_langgraph_event


class MockRunController:
    """Mock RunController for testing."""
    
    def __init__(self, state=None):
        self.state = state or {}


class TestLangGraphIntegration(unittest.TestCase):
    """Test the LangGraph integration."""
    
    def test_append_message_to_empty_state(self):
        """Test appending a message to an empty state."""
        controller = MockRunController({})
        message = HumanMessage(content="Hello", id="msg1")
        append_langgraph_event(controller, "test", "message", ([message], {}))
        
        self.assertIn("messages", controller.state)
        self.assertEqual(len(controller.state["messages"]), 1)
        self.assertEqual(controller.state["messages"][0]["content"], "Hello")
        self.assertEqual(controller.state["messages"][0]["id"], "msg1")
        self.assertEqual(controller.state["messages"][0]["type"], "human")
    
    def test_append_message_list(self):
        """Test appending a list of messages."""
        controller = MockRunController({"messages": []})
        messages = [
            HumanMessage(content="Hello", id="msg1"),
            AIMessage(content="Hi there", id="msg2")
        ]
        append_langgraph_event(controller, "test", "message", (messages, {}))
        
        self.assertEqual(len(controller.state["messages"]), 2)
        self.assertEqual(controller.state["messages"][0]["content"], "Hello")
        self.assertEqual(controller.state["messages"][1]["content"], "Hi there")
    
    def test_merge_ai_message_chunk(self):
        """Test merging an AI message chunk with an existing message."""
        controller = MockRunController({
            "messages": [
                {"type": "ai", "id": "msg1", "content": "Hello"}
            ]
        })
        
        message = AIMessageChunk(content=" world", id="msg1")
        append_langgraph_event(controller, "test", "message", ([message], {}))
        
        self.assertEqual(len(controller.state["messages"]), 1)
        self.assertEqual(controller.state["messages"][0]["content"], "Hello world")
        self.assertEqual(controller.state["messages"][0]["id"], "msg1")
    
    def test_replace_non_ai_message(self):
        """Test replacing a non-AI message."""
        controller = MockRunController({
            "messages": [
                {"type": "human", "id": "msg1", "content": "old content"}
            ]
        })
        
        message = HumanMessage(content="new content", id="msg1")
        append_langgraph_event(controller, "test", "message", ([message], {}))
        
        self.assertEqual(len(controller.state["messages"]), 1)
        self.assertEqual(controller.state["messages"][0]["content"], "new content")
    
    def test_updates_event(self):
        """Test handling updates event."""
        controller = MockRunController({})
        
        updates = {
            "node1": {
                "channel1": "value1",
                "messages": "should be ignored"
            },
            "node2": {
                "channel2": "value2"
            }
        }
        
        append_langgraph_event(controller, "test", "updates", updates)
        
        self.assertIn("node1", controller.state)
        self.assertIn("node2", controller.state)
        self.assertIn("channel1", controller.state["node1"])
        self.assertIn("channel2", controller.state["node2"])
        self.assertEqual(controller.state["node1"]["channel1"], "value1")
        self.assertEqual(controller.state["node2"]["channel2"], "value2")
        
        # Check that messages channel is ignored
        self.assertNotIn("messages", controller.state["node1"])
    
    def test_error_no_state(self):
        """Test error when controller has no state."""
        controller = MagicMock()
        delattr(controller, "state")
        
        with self.assertRaises(ValueError):
            append_langgraph_event(controller, "test", "message", ([], {}))
    
    def test_skip_none_message(self):
        """Test that None messages are skipped."""
        controller = MockRunController({"messages": []})
        messages = [None, HumanMessage(content="Hello", id="msg1"), None]
        append_langgraph_event(controller, "test", "message", (messages, {}))
        
        self.assertEqual(len(controller.state["messages"]), 1)
        self.assertEqual(controller.state["messages"][0]["content"], "Hello")
    
    def test_message_without_id(self):
        """Test handling a message without an ID."""
        controller = MockRunController({"messages": []})
        # Create a message without an ID
        message = HumanMessage(content="No ID message")
        append_langgraph_event(controller, "test", "message", ([message], {}))
        
        self.assertEqual(len(controller.state["messages"]), 1)
        self.assertEqual(controller.state["messages"][0]["content"], "No ID message")
        self.assertNotIn("id", controller.state["messages"][0])
    
    def test_invalid_message_payload(self):
        """Test handling invalid message payload format."""
        controller = MockRunController({})
        
        with self.assertRaises(TypeError):
            # Not a tuple
            append_langgraph_event(controller, "test", "message", "invalid")
        
        with self.assertRaises(TypeError):
            # Tuple with wrong length
            append_langgraph_event(controller, "test", "message", ([], {}, "extra"))
    
    def test_invalid_updates_payload(self):
        """Test handling invalid updates payload format."""
        controller = MockRunController({})
        
        with self.assertRaises(TypeError):
            # Not a dict
            append_langgraph_event(controller, "test", "updates", "invalid")
    
    def test_updates_with_invalid_channels(self):
        """Test handling updates with invalid channels format."""
        controller = MockRunController({})
        
        # Node with non-dict channels should be skipped
        updates = {
            "node1": "not a dict",
            "node2": {
                "channel2": "value2"
            }
        }
        
        append_langgraph_event(controller, "test", "updates", updates)
        
        self.assertNotIn("node1", controller.state)
        self.assertIn("node2", controller.state)
        self.assertEqual(controller.state["node2"]["channel2"], "value2")
    
    def test_ignore_other_event_types(self):
        """Test that other event types are ignored."""
        controller = MockRunController({"original": "value"})
        
        # This should be ignored
        append_langgraph_event(controller, "test", "unknown_type", "payload")
        
        # State should remain unchanged
        self.assertEqual(controller.state, {"original": "value"})
        
    def test_single_message_normalization(self):
        """Test that a single message is normalized to a list."""
        controller = MockRunController({"messages": []})
        message = HumanMessage(content="Single message", id="msg1")
        
        # Pass a single message, not in a list
        append_langgraph_event(controller, "test", "message", (message, {}))
        
        self.assertEqual(len(controller.state["messages"]), 1)
        self.assertEqual(controller.state["messages"][0]["content"], "Single message")
        self.assertEqual(controller.state["messages"][0]["id"], "msg1")
        self.assertEqual(controller.state["messages"][0]["type"], "human")


if __name__ == "__main__":
    unittest.main()
