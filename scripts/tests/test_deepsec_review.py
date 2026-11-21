import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import deepsec_review as review


class SourceTests(unittest.TestCase):
    def test_review_targets_and_context_are_immutable_git_blobs(self):
        with tempfile.TemporaryDirectory() as tmp:
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
                [".gitattributes", "with space.ts"],
            )


class TriageTests(unittest.TestCase):
    def test_approval_must_match_the_environment_and_report(self):
        workflow = (
            Path(__file__).resolve().parents[2] / ".github/workflows/deepsec.yaml"
        ).read_text()
        query = workflow.split('jq -e --arg id "$REPORT_ID" \'')[1].split("'")[0]
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
