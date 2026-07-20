from typing import Any

import pytest

from assistant_stream.gorp import (
    Flusher,
    Gorp,
    GorpDraft,
    GorpProxy,
    deep_apply,
    lookup_state,
)


def test_deep_apply_set_root() -> None:
    op = {"type": "set", "path": [], "value": {"a": 1}}
    assert deep_apply({"old": True}, op["path"], op) == {"a": 1}


def test_deep_apply_set_nested_copies_containers() -> None:
    state = {"user": {"name": "John"}, "other": {"kept": True}}
    op = {"type": "set", "path": ["user", "name"], "value": "Bob"}
    result = deep_apply(state, op["path"], op)

    assert result == {"user": {"name": "Bob"}, "other": {"kept": True}}
    assert state == {"user": {"name": "John"}, "other": {"kept": True}}
    assert result["other"] is state["other"]


def test_deep_apply_creates_missing_dict_entries() -> None:
    op = {"type": "set", "path": ["a", "b"], "value": 1}
    assert deep_apply({}, op["path"], op) == {"a": {"b": 1}}


def test_deep_apply_list_index_updates_element() -> None:
    op = {"type": "set", "path": ["items", "1"], "value": "b2"}
    state = {"items": ["a", "b", "c"]}
    assert deep_apply(state, op["path"], op) == {"items": ["a", "b2", "c"]}
    assert state["items"] == ["a", "b", "c"]


def test_deep_apply_list_index_equal_to_length_appends() -> None:
    op = {"type": "set", "path": ["items", "2"], "value": "c"}
    assert deep_apply({"items": ["a", "b"]}, op["path"], op) == {
        "items": ["a", "b", "c"]
    }


def test_deep_apply_list_index_beyond_length_raises() -> None:
    op = {"type": "set", "path": ["items", "3"], "value": "x"}
    with pytest.raises(KeyError):
        deep_apply({"items": ["a", "b"]}, op["path"], op)


def test_deep_apply_list_non_numeric_key_raises() -> None:
    op = {"type": "set", "path": ["items", "x"], "value": 1}
    with pytest.raises(KeyError):
        deep_apply({"items": []}, op["path"], op)


def test_deep_apply_append_text_concatenates() -> None:
    op = {"type": "append-text", "path": ["text"], "value": "lo"}
    assert deep_apply({"text": "Hel"}, op["path"], op) == {"text": "Hello"}


def test_deep_apply_append_text_to_missing_value_sets() -> None:
    op = {"type": "append-text", "path": ["text"], "value": "Hi"}
    assert deep_apply({}, op["path"], op) == {"text": "Hi"}


def test_deep_apply_append_text_to_non_string_raises() -> None:
    op = {"type": "append-text", "path": ["text"], "value": "Hi"}
    with pytest.raises(TypeError):
        deep_apply({"text": 42}, op["path"], op)


def test_lookup_state_resolves_nested_paths() -> None:
    state = {"messages": [{"text": "hi"}]}
    assert lookup_state(state, []) is state
    assert lookup_state(state, ["messages", "0", "text"]) == "hi"


def test_lookup_state_raises_for_invalid_paths() -> None:
    state = {"messages": [{"text": "hi"}]}
    with pytest.raises(KeyError):
        lookup_state(state, ["missing"])
    with pytest.raises(KeyError):
        lookup_state(state, ["messages", "5"])
    with pytest.raises(KeyError):
        lookup_state(None, ["anything"])


def test_gorp_apply_updates_state() -> None:
    gorp = Gorp({"count": 0})
    gorp.apply([{"type": "set", "path": ["count"], "value": 1}])
    assert gorp.state == {"count": 1}


def test_draft_writes_apply_and_forward_ops() -> None:
    ops: list[dict[str, Any]] = []
    gorp = Gorp({"user": {"name": "John"}})
    draft = gorp.draft(ops.extend)

    draft["user"]["name"] = "Bob"

    assert gorp.state == {"user": {"name": "Bob"}}
    assert ops == [{"type": "set", "path": ["user", "name"], "value": "Bob"}]


def test_draft_reads_through_live_state() -> None:
    gorp = Gorp({"user": {"name": "John"}})
    draft = gorp.draft(lambda _ops: None)
    user = draft["user"]

    gorp.apply([{"type": "set", "path": ["user", "name"], "value": "Jane"}])

    assert user["name"] == "Jane"


def test_draft_string_extension_infers_append_text() -> None:
    ops: list[dict[str, Any]] = []
    gorp = Gorp({"messages": [{"text": ""}]})
    draft = gorp.draft(ops.extend)

    draft["messages"][0]["text"] = "Hel"
    draft["messages"][0]["text"] = "Hello"
    draft["messages"][0]["text"] += "!"

    assert ops == [
        {"type": "set", "path": ["messages", "0", "text"], "value": "Hel"},
        {"type": "append-text", "path": ["messages", "0", "text"], "value": "lo"},
        {"type": "append-text", "path": ["messages", "0", "text"], "value": "!"},
    ]
    assert gorp.state["messages"][0]["text"] == "Hello!"


def test_draft_string_non_extension_emits_set() -> None:
    ops: list[dict[str, Any]] = []
    gorp = Gorp({"text": "hello"})
    draft = gorp.draft(ops.extend)

    draft["text"] = "goodbye"

    assert ops == [{"type": "set", "path": ["text"], "value": "goodbye"}]


def test_draft_list_append_emits_index_set() -> None:
    ops: list[dict[str, Any]] = []
    gorp = Gorp({"items": ["a"]})
    draft = gorp.draft(ops.extend)

    draft["items"].append("b")

    assert ops == [{"type": "set", "path": ["items", "1"], "value": "b"}]
    assert gorp.state["items"] == ["a", "b"]


def test_draft_mutating_list_methods_raise() -> None:
    gorp = Gorp({"items": ["a", "b"]})
    draft = gorp.draft(lambda _ops: None)

    with pytest.raises(NotImplementedError):
        draft["items"].pop()
    with pytest.raises(NotImplementedError):
        draft["items"].remove("a")
    with pytest.raises(NotImplementedError):
        draft["items"].insert(0, "x")


def test_draft_rejects_storing_proxy_in_state() -> None:
    gorp = Gorp({"orig": {"a": 1}, "copy": None, "items": []})
    draft = gorp.draft(lambda _ops: None)

    with pytest.raises(ValueError):
        draft["copy"] = draft["orig"]
    with pytest.raises(ValueError):
        draft["copy"] = {"nested": draft["orig"]}
    with pytest.raises(ValueError):
        draft["items"].append(draft["orig"])
    with pytest.raises(ValueError):
        draft["items"] += [draft["orig"]]

    assert gorp.state == {"orig": {"a": 1}, "copy": None, "items": []}


def test_draft_list_iadd_plain_values_emits_indexed_sets() -> None:
    ops: list[dict[str, Any]] = []
    gorp = Gorp({"items": ["a"]})
    draft = gorp.draft(ops.extend)

    draft["items"] += ["b", "c"]

    assert ops == [
        {"type": "set", "path": ["items", "1"], "value": "b"},
        {"type": "set", "path": ["items", "2"], "value": "c"},
    ]
    assert gorp.state["items"] == ["a", "b", "c"]


def test_add_operations_rejects_proxy_values() -> None:
    gorp = Gorp({"orig": {"a": 1}, "copy": None})
    proxy = gorp.draft(lambda _ops: None)["orig"]
    host = GorpDraft(gorp, lambda _ops: None)

    with pytest.raises(ValueError):
        host.add_operations([{"type": "set", "path": ["copy"], "value": proxy}])
    with pytest.raises(ValueError):
        host.add_operations(
            [{"type": "set", "path": [], "value": {"copy": proxy}}]
        )

    assert gorp.state == {"orig": {"a": 1}, "copy": None}


def test_draft_returns_gorp_proxy() -> None:
    gorp = Gorp({"user": {}})
    assert isinstance(gorp.draft(lambda _ops: None), GorpProxy)


def test_flusher_batches_until_flush() -> None:
    emitted: list[list[dict[str, Any]]] = []
    flusher = Flusher(emitted.append)

    flusher.add([{"type": "set", "path": ["a"], "value": 1}])
    flusher.add([{"type": "set", "path": ["b"], "value": 2}])
    assert emitted == []

    flusher.flush()
    assert emitted == [
        [
            {"type": "set", "path": ["a"], "value": 1},
            {"type": "set", "path": ["b"], "value": 2},
        ]
    ]

    flusher.flush()
    assert len(emitted) == 1


def test_flusher_schedules_once_per_batch() -> None:
    emitted: list[list[dict[str, Any]]] = []
    scheduled: list[Any] = []
    flusher = Flusher(emitted.append, scheduled.append)

    flusher.add([{"type": "set", "path": ["a"], "value": 1}])
    flusher.add([{"type": "set", "path": ["b"], "value": 2}])
    assert len(scheduled) == 1
    assert emitted == []

    scheduled[0]()
    assert emitted == [
        [
            {"type": "set", "path": ["a"], "value": 1},
            {"type": "set", "path": ["b"], "value": 2},
        ]
    ]

    flusher.add([{"type": "set", "path": ["c"], "value": 3}])
    assert len(scheduled) == 2


def test_flusher_add_during_drain_reschedules_and_emits() -> None:
    emitted: list[list[dict[str, Any]]] = []
    scheduled: list[Any] = []

    def emit(operations: list[dict[str, Any]]) -> None:
        emitted.append(operations)
        if len(emitted) == 1:
            flusher.add([{"type": "set", "path": ["b"], "value": 2}])

    flusher = Flusher(emit, scheduled.append)
    flusher.add([{"type": "set", "path": ["a"], "value": 1}])
    assert len(scheduled) == 1

    scheduled[0]()
    assert emitted == [[{"type": "set", "path": ["a"], "value": 1}]]
    assert len(scheduled) == 2

    scheduled[1]()
    assert emitted == [
        [{"type": "set", "path": ["a"], "value": 1}],
        [{"type": "set", "path": ["b"], "value": 2}],
    ]


def test_flusher_manual_flush_before_scheduled_callback() -> None:
    emitted: list[list[dict[str, Any]]] = []
    scheduled: list[Any] = []
    flusher = Flusher(emitted.append, scheduled.append)

    flusher.add([{"type": "set", "path": ["a"], "value": 1}])
    flusher.flush()
    assert emitted == [[{"type": "set", "path": ["a"], "value": 1}]]

    scheduled[0]()
    assert len(emitted) == 1
