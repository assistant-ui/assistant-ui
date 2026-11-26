"""Check every Python code block in the docs against Python and the repo's
Python packages. Used by docs-python-blocks.test.ts; needs only the standard
library.

Usage: python3 -I python-blocks.py <doc file>...   (paths from the repo root)

Prints one JSON object per line, one per block:
  file, line        where the block starts (1-based, the line after the fence)
  syntax            the SyntaxError, if the block does not compile
  undefined         names the block uses that neither it, an earlier block on
                    the same page, nor Python defines
  imports           `from <local package> import x` names that the package's
                    source does not define
  keywords          keyword arguments that the called function or class in a
                    local package does not accept

Blocks may use top-level `await`, as in a notebook. Each block sees the
module-level names of the blocks above it on the same page, as a reader would.

`blocks` and `check` are importable, so a test can run the same blocks.
"""

import ast
import builtins
import json
import re
import symtable
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

# Python packages this repo ships, by import name.
LOCAL_PACKAGES = {
    "assistant_stream": ROOT / "python/assistant-stream/src/assistant_stream",
    "assistant_ui": ROOT / "python/assistant-ui-sync-server-api/src/assistant_ui",
}

FENCE = re.compile(r"^(\s*)(`{3,}|~{3,})(?:python|py|python3)(?:\s|$)")


def blocks(text):
    lines = text.split("\n")
    i = 0
    while i < len(lines):
        match = FENCE.match(lines[i])
        if not match:
            i += 1
            continue
        fence = match.group(2)
        close = re.compile(rf"^\s*{re.escape(fence)}\s*$")
        start = i + 1
        end = start
        while end < len(lines) and not close.match(lines[end]):
            end += 1
        yield start + 1, textwrap.dedent("\n".join(lines[start:end]))
        i = end + 1


class _NoTopLevelAwait(ast.NodeTransformer):
    """symtable rejects top-level await; scoping is the same without it."""

    def visit_Await(self, node):
        return self.visit(node.value)

    def visit_AsyncWith(self, node):
        self.generic_visit(node)
        return ast.With(**{f: getattr(node, f) for f in node._fields}, **_pos(node))

    def visit_AsyncFor(self, node):
        self.generic_visit(node)
        return ast.For(**{f: getattr(node, f) for f in node._fields}, **_pos(node))

    def visit_FunctionDef(self, node):
        return node

    visit_AsyncFunctionDef = visit_FunctionDef
    visit_Lambda = visit_FunctionDef


def _pos(node):
    return {a: getattr(node, a) for a in ("lineno", "col_offset") if hasattr(node, a)}


def _defines(symbol):
    return symbol.is_assigned() or symbol.is_imported() or symbol.is_namespace()


def names(source, tree):
    """(names defined at module level, names used from module scope)."""
    try:
        top = symtable.symtable(source, "<block>", "exec")
    except SyntaxError:
        stripped = ast.fix_missing_locations(_NoTopLevelAwait().visit(tree))
        top = symtable.symtable(ast.unparse(stripped), "<block>", "exec")
    defined = {s.get_name() for s in top.get_symbols() if _defines(s)}
    used = set()

    def walk(table):
        for symbol in table.get_symbols():
            if not symbol.is_referenced():
                continue
            if table is top and _defines(symbol):
                continue
            if table is top or symbol.is_global():
                used.add(symbol.get_name())
        for child in table.get_children():
            walk(child)

    walk(top)
    return defined, used


# --- local package lookups -------------------------------------------------

_parsed = {}


def module_file(dotted):
    head, *rest = dotted.split(".")
    base = LOCAL_PACKAGES.get(head)
    if base is None:
        return None
    path = base.joinpath(*rest)
    if (path / "__init__.py").is_file():
        return path / "__init__.py"
    if path.with_suffix(".py").is_file():
        return path.with_suffix(".py")
    return None


def parse(path):
    if path not in _parsed:
        _parsed[path] = ast.parse(path.read_text())
    return _parsed[path]


def top_level(body):
    for stmt in body:
        if isinstance(stmt, ast.If):
            yield from top_level(stmt.body)
            yield from top_level(stmt.orelse)
        elif isinstance(stmt, ast.Try):
            yield from top_level(stmt.body)
            for handler in stmt.handlers:
                yield from top_level(handler.body)
            yield from top_level(stmt.orelse)
        elif isinstance(stmt, ast.With):
            yield from top_level(stmt.body)
        else:
            yield stmt


def absolute(dotted, path, node):
    if not node.level:
        return node.module
    package = dotted if path.name == "__init__.py" else dotted.rpartition(".")[0]
    for _ in range(node.level - 1):
        package = package.rpartition(".")[0]
    return f"{package}.{node.module}" if node.module else package


def lookup(dotted, name, depth=0):
    """Where `name` in local module `dotted` comes from.

    Returns a list of def/class nodes (several for overloads), "module",
    "value", or None when the source does not define the name.
    """
    path = module_file(dotted)
    if path is None or depth > 8:
        return "value"
    defs = []
    for stmt in top_level(parse(path).body):
        if isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if stmt.name == name:
                defs.append(stmt)
        elif isinstance(stmt, (ast.Assign, ast.AnnAssign, ast.AugAssign)):
            targets = stmt.targets if isinstance(stmt, ast.Assign) else [stmt.target]
            for target in targets:
                for node in ast.walk(target):
                    if isinstance(node, ast.Name) and node.id == name:
                        return "value"
        elif isinstance(stmt, ast.ImportFrom):
            for alias in stmt.names:
                if (alias.asname or alias.name) == name:
                    source = absolute(dotted, path, stmt)
                    if module_file(source) is None:
                        return "value"
                    return lookup(source, alias.name, depth + 1)
        elif isinstance(stmt, ast.Import):
            for alias in stmt.names:
                if (alias.asname or alias.name.partition(".")[0]) == name:
                    return "module"
    if defs:
        return defs
    if module_file(f"{dotted}.{name}") is not None:
        return "module"
    if any(
        isinstance(s, ast.FunctionDef) and s.name == "__getattr__"
        for s in parse(path).body
    ):
        return "value"
    return None


def accepted_keywords(defs):
    """Keyword names the defs accept, or None when any of them takes **kwargs
    or the signature can't be read from the source."""
    accepted = set()
    for node in defs:
        if isinstance(node, ast.ClassDef):
            init = [
                s
                for s in node.body
                if isinstance(s, (ast.FunctionDef, ast.AsyncFunctionDef))
                and s.name == "__init__"
            ]
            if init:
                inner = accepted_keywords(init)
                if inner is None:
                    return None
                accepted |= inner
            elif any(
                "dataclass" in ast.unparse(d) for d in node.decorator_list
            ):
                accepted |= {
                    s.target.id
                    for s in node.body
                    if isinstance(s, ast.AnnAssign) and isinstance(s.target, ast.Name)
                }
            else:
                return None
            continue
        args = node.args
        if args.kwarg is not None:
            return None
        accepted |= {a.arg for a in args.args + args.kwonlyargs}
    return accepted


def check_locals(tree):
    imports, keywords = [], []
    bound = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and not node.level and node.module:
            if module_file(node.module) is None:
                if node.module.partition(".")[0] in LOCAL_PACKAGES:
                    imports.append(node.module)
                continue
            for alias in node.names:
                found = lookup(node.module, alias.name)
                if found is None:
                    imports.append(f"{node.module}.{alias.name}")
                elif isinstance(found, list):
                    bound[alias.asname or alias.name] = found
        elif isinstance(node, ast.Import):
            for alias in node.names:
                if (
                    alias.name.partition(".")[0] in LOCAL_PACKAGES
                    and module_file(alias.name) is None
                ):
                    imports.append(alias.name)
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id in bound
        ):
            accepted = accepted_keywords(bound[node.func.id])
            if accepted is None:
                continue
            for keyword in node.keywords:
                if keyword.arg is not None and keyword.arg not in accepted:
                    keywords.append(f"{node.func.id}({keyword.arg}=)")
    return imports, keywords


def check(file):
    page_names = set()
    for line, source in blocks((ROOT / file).read_text()):
        result = {"file": file, "line": line}
        try:
            tree = ast.parse(source)
            compile(
                source, file, "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT, dont_inherit=True
            )
        except SyntaxError as error:
            result["syntax"] = f"line {line + (error.lineno or 1) - 1}: {error.msg}"
            yield result
            continue
        defined, used = names(source, tree)
        result["undefined"] = sorted(
            name
            for name in used - defined - page_names
            if not hasattr(builtins, name)
            and not (name.startswith("__") and name.endswith("__"))
        )
        page_names |= defined
        result["imports"], result["keywords"] = check_locals(tree)
        yield result


if __name__ == "__main__":
    for file in sys.argv[1:]:
        for result in check(file):
            print(json.dumps(result))
