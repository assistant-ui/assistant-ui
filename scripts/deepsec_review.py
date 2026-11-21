import os
import re
import subprocess
import sys
from pathlib import Path


def manifest_name(raw):
    name = raw.decode("utf-8")
    # DeepSec's --files-from splits on newlines, trims entries and normalizes backslashes.
    if (
        name != name.strip()
        or name.startswith("\ufeff")
        or name.endswith("\ufeff")
        or any(c in name for c in "\r\n\\")
    ):
        raise ValueError("The changed path cannot be represented in a DeepSec file list.")
    return name


def prepare(repo, base, head, destination):
    def git(*args):
        return subprocess.check_output(["git", *args], cwd=repo)

    changed = set(
        git(
            "diff", "--name-only", "--no-renames", "--diff-filter=AMT", "-z", base, head, "--"
        ).split(b"\0")
    )
    tree = git("ls-tree", "-rz", head)
    source = destination / "source"
    source.mkdir()
    targets = []

    # Read raw blobs so Git filters, executable bits and symbolic links never enter the scanner workspace.
    with subprocess.Popen(
        ["git", "cat-file", "--batch"], cwd=repo, stdin=subprocess.PIPE, stdout=subprocess.PIPE
    ) as blobs:
        try:
            for entry in tree.split(b"\0"):
                if not entry:
                    continue
                info, name = entry.split(b"\t", 1)
                mode, _, oid = info.split()
                if mode not in (b"100644", b"100755"):
                    continue
                if any(part.lower() in (b"", b".", b"..", b".git") for part in name.split(b"/")):
                    raise ValueError("Invalid path in the PR tree.")
                path = source / os.fsdecode(name)
                path.parent.mkdir(parents=True, exist_ok=True)
                blobs.stdin.write(oid + b"\n")
                blobs.stdin.flush()
                returned_oid, kind, size = blobs.stdout.readline().split()
                if returned_oid != oid or kind != b"blob":
                    raise ValueError("Git did not return the requested blob.")
                with path.open("xb") as output:
                    output.write(blobs.stdout.read(int(size)))
                if blobs.stdout.read(1) != b"\n":
                    raise ValueError("Git returned an incomplete blob.")
                if name in changed:
                    targets.append(manifest_name(name))
        finally:
            blobs.stdin.close()
        if blobs.wait():
            raise RuntimeError("Git could not export the PR tree.")
    (destination / "files.txt").write_text(
        "".join(name + "\n" for name in targets), encoding="utf-8"
    )


def classify(status, root):
    if status == 0:
        return "clean"
    report = root / "review.md"
    if status == 1 and report.is_file() and report.stat().st_size:
        with (root / "scanner.log").open("rb") as log:
            last = b""
            for last in log:
                pass
        # DeepSec 2.3.16 also exits 1 on provider errors, before printing its final findings count.
        plain = re.sub(rb"\x1b\[[0-9;]*m", b"", last).rstrip(b"\r\n")
        if re.fullmatch(
            r"[1-9][0-9]* new finding\(s\) — exiting 1", plain.decode("utf8", "replace")
        ):
            return "finding"
    return "error"


def run_review():
    root = Path.cwd()
    key = os.environ.get("AI_GATEWAY_API_KEY")
    if not key:
        sys.exit(
            "Set DEEPSEC_GATEWAY_KEY in the protected deepsec environment before enabling reviews."
        )
    cli = "./deepsec/node_modules/.bin/deepsec"
    with (root / "scanner.log").open("wb") as log:
        status = subprocess.run(
            [
                cli,
                "process",
                "--agent",
                "pi",
                "--root",
                str(root / "source"),
                "--files-from",
                "files.txt",
                "--comment-out",
                "review.md",
            ],
            check=False,
            stdout=log,
            stderr=subprocess.STDOUT,
        ).returncode
    outcome = classify(status, root)
    if outcome == "clean":
        return
    if outcome == "finding":
        filename = "review.md"
        contents = (root / filename).read_bytes()
    else:
        filename = "diagnostics.log"
        contents = (root / "scanner.log").read_bytes()
        partial = root / "completed-findings.json"
        export = subprocess.run(
            [cli, "export", "--project-id", "source", "--format", "json", "--out", str(partial)],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        contents += b"\n\nCompleted findings from this partial run:\n"
        contents += (
            partial.read_bytes() if export.returncode == 0 and partial.is_file() else export.stdout
        )
    subprocess.run(
        [
            "gpg",
            "--batch",
            "--recipient-file",
            "security-team.asc",
            "--output",
            filename + ".gpg",
            "--encrypt",
        ],
        input=contents.replace(key.encode(), b"[redacted]"),
        check=True,
    )
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
        print("file=" + filename + ".gpg", file=output)
        print("outcome=" + outcome, file=output)
    if outcome == "error":
        sys.exit(
            f"DeepSec failed with exit code {status}. The security team can decrypt the diagnostics artifact."
        )


if __name__ == "__main__":
    if sys.argv[1:] == ["review"]:
        run_review()
    elif len(sys.argv) == 5 and sys.argv[1] == "prepare":
        prepare(Path.cwd(), sys.argv[2], sys.argv[3], Path(sys.argv[4]))
    else:
        sys.exit("Usage: deepsec_review.py prepare BASE HEAD DIRECTORY | review")
