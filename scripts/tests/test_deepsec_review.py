import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import deepsec_review as review


def fixture_repo(tmp):
    repo = Path(tmp) / "repo"
    repo.mkdir()
    destination = Path(tmp) / "export"
    destination.mkdir()

    def git(*args):
        return subprocess.check_output(
            [
                "git",
                "-c",
                "user.name=Fixture",
                "-c",
                "user.email=test@example.invalid",
                *args,
            ],
            cwd=repo,
            text=True,
        ).strip()

    git("init", "-q")
    return repo, destination, git


class SourceTests(unittest.TestCase):
    def test_review_targets_and_context_are_immutable_git_blobs(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo, destination, git = fixture_repo(tmp)
            (repo / "context.ts").write_text("original\n")
            (repo / "removed.ts").write_text("removed\n")
            git("add", ".")
            git("commit", "-qm", "base")
            base = git("rev-parse", "HEAD")
            (repo / "removed.ts").unlink()
            (repo / "with space.ts").write_text("new\n")
            (repo / "with space.ts").chmod(0o755)
            (repo / "link").symlink_to("../outside")
            (repo / ".gitattributes").write_text("context.ts export-ignore\n")
            git("add", "-A")
            git("commit", "-qm", "pr")
            head = git("rev-parse", "HEAD")
            git("checkout", "-q", "--detach", base)
            (repo / "context.ts").write_text("newer base checkout\n")
            (repo / "base-only.ts").write_text("base only\n")
            git("add", ".")
            git("commit", "-qm", "advance base")
            review.prepare(repo, base, head, destination)
            source = destination / "source"
            self.assertEqual((source / "context.ts").read_text(), "original\n")
            self.assertEqual((source / "with space.ts").read_text(), "new\n")
            self.assertFalse((source / "removed.ts").exists())
            self.assertFalse((source / "base-only.ts").exists())
            self.assertFalse(os.path.lexists(source / "link"))
            self.assertEqual((source / "with space.ts").stat().st_mode & 0o111, 0)
            self.assertFalse((source / ".git").exists())
            self.assertEqual(
                (destination / "files.txt").read_text().splitlines(),
                [".gitattributes", "with space.ts", ".deepsec-deleted/removed.ts"],
            )

    def test_deletion_only_changes_are_reviewed_from_the_merge_base(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo, destination, git = fixture_repo(tmp)
            (repo / "auth.ts").write_text("requireUser()\n")
            (repo / "headers.ts").write_text("strictCsp()\n")
            (repo / "kept.ts").write_text("kept\n")
            git("add", ".")
            git("commit", "-qm", "base")
            base = git("rev-parse", "HEAD")
            (repo / "auth.ts").unlink()
            (repo / "headers.ts").unlink()
            (repo / "headers.ts").symlink_to("kept.ts")
            git("add", "-A")
            git("commit", "-qm", "pr")
            review.prepare(repo, base, git("rev-parse", "HEAD"), destination)
            source = destination / "source"
            self.assertEqual(
                (destination / "files.txt").read_text().splitlines(),
                [".deepsec-deleted/auth.ts", ".deepsec-deleted/headers.ts"],
            )
            self.assertEqual((source / ".deepsec-deleted/auth.ts").read_text(), "requireUser()\n")
            self.assertFalse(os.path.lexists(source / "auth.ts"))
            self.assertFalse(os.path.lexists(source / "headers.ts"))
            self.assertIn("`.deepsec-deleted/`", (destination / "data/source/INFO.md").read_text())

    def test_pr_trees_cannot_use_the_deleted_file_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo, destination, git = fixture_repo(tmp)
            (repo / "kept.ts").write_text("kept\n")
            git("add", ".")
            git("commit", "-qm", "base")
            base = git("rev-parse", "HEAD")
            (repo / ".deepsec-deleted").mkdir()
            (repo / ".deepsec-deleted/kept.ts").write_text("spoofed\n")
            git("add", ".")
            git("commit", "-qm", "pr")
            with self.assertRaises(ValueError):
                review.prepare(repo, base, git("rev-parse", "HEAD"), destination)


WORKFLOW = Path(__file__).resolve().parents[2] / ".github/workflows/deepsec.yaml"


def approval_query():
    return re.search(r"^  REPORT_APPROVED: '(.*)'$", WORKFLOW.read_text(), re.M).group(1)


def step_script(name):
    lines = WORKFLOW.read_text().splitlines()
    start = lines.index(f"      - name: {name}")
    run = next(i for i in range(start, len(lines)) if lines[i].strip() == "run: |")
    indent = len(lines[run]) - len(lines[run].lstrip()) + 2
    body = []
    for line in lines[run + 1 :]:
        if line.strip() and len(line) - len(line.lstrip()) < indent:
            break
        body.append(line[indent:])
    return "\n".join(body)


class TriageTests(unittest.TestCase):
    def test_approval_must_match_the_environment_and_report(self):
        query = approval_query()
        approval = {
            "state": "approved",
            "comment": "42",
            "environments": [{"name": "deepsec-triage"}],
        }
        for record, accepted in [
            (approval, True),
            ({**approval, "state": "rejected"}, False),
            ({**approval, "comment": "41"}, False),
            ({**approval, "environments": []}, False),
        ]:
            with self.subTest(record=record):
                result = subprocess.run(
                    ["jq", "-e", "--arg", "id", "42", query],
                    input=json.dumps([record]),
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertEqual(result.returncode, 0 if accepted else 1)

    def test_review_fails_on_a_finding_until_its_report_is_approved(self):
        script = step_script("Require a clean scan or an approved report")
        approval = {
            "state": "approved",
            "comment": "42",
            "environments": [{"name": "deepsec-triage"}],
        }
        for scan, report, approvals, passes in [
            ("success", "", [], True),
            ("failure", "", [], False),
            ("success", "42", [], False),
            ("success", "42", [{**approval, "comment": "41"}], False),
            ("success", "42", [approval], True),
        ]:
            with (
                self.subTest(scan=scan, report=report, approvals=approvals),
                tempfile.TemporaryDirectory() as tmp,
            ):
                (Path(tmp) / "approvals.json").write_text(json.dumps(approvals))
                gh = Path(tmp) / "gh"
                gh.write_text(f"#!/bin/sh\ncat '{tmp}/approvals.json'\n")
                gh.chmod(0o755)
                result = subprocess.run(
                    ["bash", "-c", script],
                    env={
                        **os.environ,
                        "PATH": f"{tmp}{os.pathsep}{os.environ['PATH']}",
                        "GITHUB_REPOSITORY": "assistant-ui/assistant-ui",
                        "GITHUB_RUN_ID": "1",
                        "REPORT_APPROVED": approval_query(),
                        "REPORT_ID": report,
                        "SCAN_RESULT": scan,
                    },
                    capture_output=True,
                    check=False,
                )
                self.assertEqual(result.returncode == 0, passes, result.stdout)


class ResultTests(unittest.TestCase):
    def test_outcomes_keep_findings_and_errors_private(self):
        marker = "\033[31m1 new finding(s) — exiting 1\033[0m\n"
        cases = [
            (0, "", "", "clean"),
            (1, marker, "private fixture", "finding"),
            (1, "provider error", "partial report", "error"),
            (1, marker, "", "error"),
            (2, marker, "partial report", "error"),
        ]
        for status, output, report, expected in cases:
            with (
                self.subTest(status=status, output=output, report=report),
                tempfile.TemporaryDirectory() as tmp,
            ):
                root = Path(tmp)
                (root / "review.md").write_text(report)
                (root / "scanner.log").write_text(output)
                self.assertEqual(review.classify(status, root), expected)

    def test_incomplete_scan_keeps_diagnostics_and_completed_findings(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cli = root / "deepsec/node_modules/.bin/deepsec"
            cli.parent.mkdir(parents=True)
            cli.write_text(
                "#!/bin/sh\n"
                'if [ "$1" = export ]; then printf partial-finding > "$7"; exit 0; fi\n'
                'echo "provider failure $AI_GATEWAY_API_KEY" >&2\nexit 1\n'
            )
            cli.chmod(0o755)
            output = root / "outputs"
            environment = {
                "AI_GATEWAY_API_KEY": "fixture-gateway-credential",
                "GITHUB_OUTPUT": str(output),
            }
            keys = root / "keys"
            keys.mkdir(mode=0o700)
            environment["GNUPGHOME"] = str(keys)
            with patch.dict(os.environ, environment):
                subprocess.run(
                    [
                        "gpg",
                        "--batch",
                        "--pinentry-mode",
                        "loopback",
                        "--passphrase",
                        "",
                        "--quick-generate-key",
                        "Review Fixture",
                        "rsa2048",
                        "encr",
                        "1d",
                    ],
                    check=True,
                    capture_output=True,
                )
                (root / "security-team.asc").write_bytes(
                    subprocess.check_output(
                        ["gpg", "--batch", "--armor", "--export", "Review Fixture"]
                    )
                )
                run = subprocess.run(
                    [sys.executable, review.__file__, "review"],
                    cwd=root,
                    check=False,
                    capture_output=True,
                )
                self.assertNotEqual(run.returncode, 0)
                self.assertNotIn(b"provider failure", run.stderr)
                self.assertIn("outcome=error", output.read_text())
                decoded = subprocess.check_output(
                    ["gpg", "--batch", "--decrypt", str(root / "diagnostics.log.gpg")],
                    stderr=subprocess.DEVNULL,
                )
                self.assertIn(b"partial-finding", decoded)
                self.assertIn(b"provider failure [redacted]", decoded)
                self.assertNotIn(environment["AI_GATEWAY_API_KEY"].encode(), decoded)

    def test_unsupported_manifest_paths_fail_closed(self):
        for name in ["two\nlines.ts", " x.ts", "a\\b.ts", "\ufeffbom.ts"]:
            with self.subTest(name=name), self.assertRaises(ValueError):
                review.manifest_name(os.fsencode(name))


if __name__ == "__main__":
    unittest.main()
