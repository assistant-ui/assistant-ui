"""The docs' Python samples run against this package.

Each page that imports assistant_stream runs top to bottom, one block after
another in one namespace, the way a reader pastes them into one file. A block
may leave names to the reader (the docs' Python block check lists them); a
block that needs one of those at import time, or a package this environment
lacks, is skipped. Everything else has to run.
"""

import ast
import asyncio
import importlib.util
import inspect
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
CHECKER = REPO / "apps/docs/lib/python-blocks.py"

if not CHECKER.is_file():
    pytest.skip("needs the assistant-ui repository", allow_module_level=True)

_spec = importlib.util.spec_from_file_location("docs_python_blocks", CHECKER)
checker = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(checker)


def pages():
    candidates = sorted((REPO / "apps/docs/content").rglob("*.md*"))
    candidates += sorted(REPO.glob("python/*/README*.md"))
    for path in candidates:
        text = path.read_text()
        if any(
            "assistant_stream" in source for _, source in checker.blocks(text)
        ):
            yield path.relative_to(REPO).as_posix()


PAGES = list(pages())


def missing_dependency(error):
    """The package this environment lacks, when that is why the import failed.

    None means the import failed for another reason, such as a name the sample
    imports that the package no longer has, and the sample is wrong.
    """
    for cause in (error, error.__cause__):
        if isinstance(cause, ModuleNotFoundError) and cause.name:
            package = cause.name.partition(".")[0]
            if package != "assistant_stream" and importlib.util.find_spec(package) is None:
                return package
    return None


def run_page(file):
    """Run a page's blocks in order. Returns (namespace, ran, skipped)."""
    namespace = {"__name__": "docs_sample"}
    unavailable = set()  # names only a skipped block would have defined
    ran, skipped = [], []
    text = (REPO / file).read_text()
    for (line, source), report in zip(checker.blocks(text), checker.check(file)):
        assert "syntax" not in report, report
        tree = ast.parse(source)
        defined, _ = checker.names(source, tree)
        code = compile(
            source, f"{file}:{line}", "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT
        )
        try:
            result = eval(code, namespace)
            if inspect.iscoroutine(result):
                asyncio.run(result)
        except ImportError as error:
            missing = missing_dependency(error)
            if missing is None:
                raise
            skipped.append((line, f"needs {missing}"))
            unavailable |= defined
            continue
        except NameError as error:
            if error.name in unavailable:
                skipped.append((line, f"needs {error.name} from a skipped block"))
            elif error.name in report["undefined"]:
                skipped.append((line, f"leaves {error.name} to the reader"))
            else:
                raise
            unavailable |= defined
            continue
        ran.append(line)
    return namespace, ran, skipped


def test_finds_the_pages():
    assert "apps/docs/content/docs/runtimes/custom/assistant-transport.mdx" in PAGES


@pytest.mark.parametrize("file", PAGES)
def test_page_runs(file, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    # Pages build an OpenAI-backed Agent at import time; no request is made.
    monkeypatch.setenv("OPENAI_API_KEY", "sk-docs-sample")
    _, ran, skipped = run_page(file)
    if not ran:
        pytest.skip(f"no block ran: {skipped}")


def test_assistant_transport_commands_sample_serves_commands(tmp_path, monkeypatch):
    """The "Handling commands" sample, posted the commands the page describes."""
    pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient

    file = "apps/docs/content/docs/runtimes/custom/assistant-transport.mdx"
    text = (REPO / file).read_text()
    [(line, sample)] = [
        block for block in checker.blocks(text) if "class ChatRequest" in block[1]
    ]
    namespace = {"__name__": "docs_sample"}
    exec(compile(sample, f"{file}:{line}", "exec"), namespace)

    state = {
        "messages": [
            {
                "role": "assistant",
                "parts": [{"type": "tool-call", "toolCallId": "call_1"}],
            }
        ]
    }
    response = TestClient(namespace["app"]).post(
        "/assistant",
        json={
            "state": state,
            "commands": [
                {
                    "type": "add-tool-result",
                    "toolCallId": "call_1",
                    "toolName": "get_weather",
                    "result": {"temp": 21},
                },
                {
                    "type": "add-message",
                    "message": {
                        "role": "user",
                        "parts": [{"type": "text", "text": "thanks"}],
                    },
                },
                {"type": "my-custom-command", "data": "hello"},
            ],
        },
    )

    assert response.status_code == 200
    operations = [
        op
        for line in response.text.splitlines()
        if line.startswith("aui-state:")
        for op in json.loads(line[len("aui-state:"):])
    ]
    by_path = {tuple(op["path"]): op["value"] for op in operations}
    assert by_path[("messages", "0", "parts", "0", "result")] == {"temp": 21}
    assert by_path[("messages", "1")]["parts"][0]["text"] == "thanks"
    assert by_path[("custom_data",)] == "hello"
