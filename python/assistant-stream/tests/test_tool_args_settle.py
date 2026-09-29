from assistant_stream.serialization.tool_args_settle import ToolCallArgsSettler


def create_settler(
    *, emit_empty_args_text: bool
) -> tuple[ToolCallArgsSettler[str], list[tuple[str, str, bool]], list[tuple[str, str]]]:
    finished: list[tuple[str, str, bool]] = []
    warnings: list[tuple[str, str]] = []

    def finish_frames(
        tool_call_id: str, args_text_delta: str, has_args_text: bool
    ) -> list[str]:
        finished.append((tool_call_id, args_text_delta, has_args_text))
        return [f"{tool_call_id}:{args_text_delta}"]

    def warn(reason: str, detail: str) -> None:
        warnings.append((reason, detail))

    return (
        ToolCallArgsSettler(
            finish_frames,
            warn,
            emit_empty_args_text=emit_empty_args_text,
        ),
        finished,
        warnings,
    )


def test_tool_call_args_settler_tracks_begin_append_and_finish() -> None:
    settler, finished, _ = create_settler(emit_empty_args_text=True)

    settler.begin("t1")

    appended = settler.append("t1")
    frames = settler.finish("t1", "}")

    assert appended is True
    assert frames == ["t1:}"]
    assert finished == [("t1", "}", True)]


def test_tool_call_args_settler_configures_empty_args_completion() -> None:
    emitting, emitting_finished, _ = create_settler(emit_empty_args_text=True)
    non_emitting, non_emitting_finished, _ = create_settler(
        emit_empty_args_text=False
    )

    emitting.begin("emitting")
    non_emitting.begin("non-emitting")

    assert emitting.finish("emitting") == ["emitting:{}"]
    assert non_emitting.finish("non-emitting") == ["non-emitting:"]
    assert emitting_finished == [("emitting", "{}", False)]
    assert non_emitting_finished == [("non-emitting", "", False)]


def test_tool_call_args_settler_drops_settled_ids_and_warns_once() -> None:
    settler, _, warnings = create_settler(emit_empty_args_text=True)

    settler.begin("t1")
    settler.finish("t1")

    first_append = settler.append("t1")
    second_append = settler.append("t1")

    assert first_append is False
    assert second_append is False
    assert warnings == [("settled-tool-call-id", "tool-call-delta for t1")]


def test_tool_call_args_settler_flushes_open_calls() -> None:
    settler, finished, _ = create_settler(emit_empty_args_text=True)

    settler.begin("first")
    settler.begin("second")
    appended = settler.append("second")

    assert appended is True
    assert settler.finish_open() == ["first:{}", "second:"]
    assert finished == [("first", "{}", False), ("second", "", True)]
