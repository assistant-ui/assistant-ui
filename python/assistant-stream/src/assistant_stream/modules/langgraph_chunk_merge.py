from typing import Any, Dict, List, Optional, Union

from assistant_stream.create_run import RunController
from langchain_core.messages.base import BaseMessage, message_to_dict


# def merge_ai_message_chunk_dicts(
#     chunk1_dict: Dict[str, Any], chunk2_dict: Dict[str, Any]
# ) -> None:
#     """
#     Merge two AIMessageChunk dictionaries by modifying chunk1_dict in-place.

#     This function is designed to work with proxy objects that send updates
#     over the network, so it only sets complete values at each field path.

#     Args:
#         chunk1_dict: Dictionary representation of first AIMessageChunk (will be modified)
#         chunk2_dict: Dictionary representation of second AIMessageChunk

#     Returns:
#         None (modifies chunk1_dict in-place)
#     """
#     # Merge content following merge_content logic
#     _merge_content_inplace(chunk1_dict, chunk2_dict)

#     # Merge additional_kwargs
#     _merge_dict_field_inplace(chunk1_dict, chunk2_dict, "additional_kwargs")

#     # Merge response_metadata
#     _merge_dict_field_inplace(chunk1_dict, chunk2_dict, "response_metadata")

#     # Merge tool call chunks
#     _merge_tool_call_chunks_inplace(chunk1_dict, chunk2_dict)

#     # Merge usage metadata
#     _merge_usage_metadata_inplace(chunk1_dict, chunk2_dict)

#     # Handle ID selection (prefer non-run IDs)
#     _merge_id_inplace(chunk1_dict, chunk2_dict)

#     # Ensure type is set
#     if "type" not in chunk1_dict:
#         chunk1_dict["type"] = "AIMessageChunk"

#     # Handle example field - check they match if both present
#     _merge_example_inplace(chunk1_dict, chunk2_dict)


# def _merge_content_inplace(
#     chunk1_dict: Dict[str, Any], chunk2_dict: Dict[str, Any]
# ) -> None:
#     """Merge content fields following merge_content logic."""
#     content1 = chunk1_dict.get("content", "")
#     content2 = chunk2_dict.get("content", "")

#     if isinstance(content1, str):
#         if isinstance(content2, str):
#             # Both are strings - concatenate
#             chunk1_dict["content"] += content2
#         elif isinstance(content2, list):
#             # First is string, second is list - prepend string to list
#             chunk1_dict["content"] = [content1] + content2
#         # If content2 is empty string, it's a no-op
#     elif isinstance(content1, list):
#         if isinstance(content2, str):
#             # First is list, second is string
#             if content1 and isinstance(content1[-1], str):
#                 # If last element of list is string, append to it
#                 content1[-1] += content2
#             elif content2 == "":
#                 # Empty string is a no-op
#                 pass
#             else:
#                 # Otherwise append as new element
#                 content1.append(content2)
#         elif isinstance(content2, list):
#             # Both are lists - merge them
#             chunk1_dict["content"] = _merge_lists(content1, content2)


# def _merge_dict_field_inplace(
#     chunk1_dict: Dict[str, Any],
#     chunk2_dict: Dict[str, Any],
#     field_name: str
# ) -> None:
#     """Merge a dictionary field from chunk2_dict into chunk1_dict."""
#     if field_name not in chunk2_dict:
#         return

#     if field_name not in chunk1_dict:
#         chunk1_dict[field_name] = {}

#     dict1 = chunk1_dict[field_name]
#     dict2 = chunk2_dict[field_name]

#     for key, value in dict2.items():
#         if key not in dict1 or (value is not None and dict1[key] is None):
#             dict1[key] = value
#         elif value is None:
#             continue
#         elif type(dict1[key]) is not type(value):
#             raise TypeError(
#                 f'{field_name}["{key}"] already exists in this message, '
#                 "but with a different type."
#             )
#         elif isinstance(dict1[key], str):
#             dict1[key] += value
#         elif isinstance(dict1[key], dict):
#             # Recursively merge nested dictionaries
#             _merge_dicts_inplace(dict1[key], value)
#         elif isinstance(dict1[key], list):
#             # Merge lists following merge_lists logic
#             dict1[key] = _merge_lists(dict1[key], value)
#         elif dict1[key] == value:
#             continue
#         else:
#             raise TypeError(
#                 f"{field_name} key {key} already exists in left dict and "
#                 f"value has unsupported type {type(dict1[key])}."
#             )


# def _merge_tool_call_chunks_inplace(
#     chunk1_dict: Dict[str, Any], chunk2_dict: Dict[str, Any]
# ) -> None:
#     """Merge tool call chunks from chunk2_dict into chunk1_dict."""
#     tool_call_chunks1 = chunk1_dict.get("tool_call_chunks", [])
#     tool_call_chunks2 = chunk2_dict.get("tool_call_chunks", [])

#     if tool_call_chunks2:
#         chunk1_dict["tool_call_chunks"] = _merge_lists(
#             tool_call_chunks1, tool_call_chunks2
#         )


# def _merge_usage_metadata_inplace(
#     chunk1_dict: Dict[str, Any], chunk2_dict: Dict[str, Any]
# ) -> None:
#     """Merge usage metadata following add_usage logic."""
#     usage1 = chunk1_dict.get("usage_metadata")
#     usage2 = chunk2_dict.get("usage_metadata")

#     if usage1 or usage2:
#         if not usage1:
#             # Only usage2 exists
#             chunk1_dict["usage_metadata"] = dict(usage2)
#         elif not usage2:
#             # Only usage1 exists, already in place
#             pass
#         else:
#             # Both exist - merge them by adding numeric fields
#             merged_usage = {}

#             # Start with all keys from usage1
#             for key, value in usage1.items():
#                 merged_usage[key] = value

#             # Add or merge keys from usage2
#             for key, value in usage2.items():
#                 if key in merged_usage:
#                     # For numeric values, add them
#                     if isinstance(value, (int, float)) and isinstance(
#                         merged_usage[key], (int, float)
#                     ):
#                         merged_usage[key] += value
#                     # For dicts (like input_token_details), recursively merge
#                     elif isinstance(value, dict) and isinstance(
#                         merged_usage[key], dict
#                     ):
#                         merged_dict = dict(merged_usage[key])
#                         for sub_key, sub_value in value.items():
#                             if sub_key in merged_dict and isinstance(
#                                 sub_value, (int, float)
#                             ):
#                                 merged_dict[sub_key] += sub_value
#                             else:
#                                 merged_dict[sub_key] = sub_value
#                         merged_usage[key] = merged_dict
#                     else:
#                         # For other types, take the new value
#                         merged_usage[key] = value
#                 else:
#                     merged_usage[key] = value

#             chunk1_dict["usage_metadata"] = merged_usage


# def _merge_id_inplace(
#     chunk1_dict: Dict[str, Any], chunk2_dict: Dict[str, Any]
# ) -> None:
#     """Handle ID selection, preferring non-run IDs."""
#     if "id" not in chunk2_dict:
#         return

#     chunk2_id = chunk2_dict.get("id")
#     chunk1_id = chunk1_dict.get("id")

#     # Only update ID if chunk2 has a better ID
#     if chunk2_id:
#         if not chunk1_id:
#             # No ID in chunk1, use chunk2's ID
#             chunk1_dict["id"] = chunk2_id
#         elif chunk1_id.startswith("run-") and not chunk2_id.startswith("run-"):
#             # Prefer non-run IDs
#             chunk1_dict["id"] = chunk2_id


# def _merge_example_inplace(
#     chunk1_dict: Dict[str, Any], chunk2_dict: Dict[str, Any]
# ) -> None:
#     """Handle example field merging with validation."""
#     if "example" in chunk1_dict and "example" in chunk2_dict:
#         if chunk1_dict["example"] != chunk2_dict["example"]:
#             raise ValueError(
#                 "Cannot concatenate AIMessageChunks with different example values."
#             )
#     elif "example" in chunk2_dict:
#         chunk1_dict["example"] = chunk2_dict["example"]


# def _merge_dicts_inplace(dict1: Dict[str, Any], dict2: Dict[str, Any]) -> None:
#     """
#     Recursively merge dict2 into dict1 in-place.

#     Args:
#         dict1: Target dictionary (will be modified)
#         dict2: Source dictionary
#     """
#     for key, value in dict2.items():
#         if key not in dict1 or (value is not None and dict1[key] is None):
#             dict1[key] = value
#         elif value is None:
#             continue
#         elif type(dict1[key]) is not type(value):
#             raise TypeError(
#                 f'Key "{key}" already exists in dictionary, '
#                 "but with a different type."
#             )
#         elif isinstance(dict1[key], str):
#             dict1[key] += value
#         elif isinstance(dict1[key], dict):
#             _merge_dicts_inplace(dict1[key], value)
#         elif isinstance(dict1[key], list):
#             dict1[key] = _merge_lists(dict1[key], value)
#         elif dict1[key] == value:
#             continue
#         else:
#             raise TypeError(
#                 f"Key {key} already exists in left dict and "
#                 f"value has unsupported type {type(dict1[key])}."
#             )


# def _merge_lists(
#     left: Optional[List[Any]], right: Optional[List[Any]]
# ) -> Optional[List[Any]]:
#     """
#     Merge two lists following merge_lists logic.

#     Handles special merging for elements with 'index' fields.

#     Args:
#         left: First list (or None)
#         right: Second list (or None)

#     Returns:
#         Merged list (or None if both inputs are None)
#     """
#     if right is None:
#         return left
#     if left is None:
#         return right.copy() if isinstance(right, list) else right

#     merged = left.copy() if isinstance(left, list) else list(left)

#     for e in right:
#         if isinstance(e, dict) and "index" in e and isinstance(e["index"], int):
#             # Find existing element with same index
#             to_merge = [
#                 i
#                 for i, e_left in enumerate(merged)
#                 if isinstance(e_left, dict) and e_left.get("index") == e["index"]
#             ]
#             if to_merge:
#                 # Merge with existing element at same index
#                 # Remove 'type' key if present (following TODO in merge_lists)
#                 new_e = (
#                     {k: v for k, v in e.items() if k != "type"} if "type" in e else e
#                 )
#                 # Merge dictionaries
#                 for key, value in new_e.items():
#                     if key not in merged[to_merge[0]]:
#                         merged[to_merge[0]][key] = value
#                     elif isinstance(merged[to_merge[0]][key], str) and isinstance(
#                         value, str
#                     ):
#                         merged[to_merge[0]][key] += value
#                     else:
#                         merged[to_merge[0]][key] = value
#             else:
#                 merged.append(e)
#         else:
#             merged.append(e)

#     return merged
