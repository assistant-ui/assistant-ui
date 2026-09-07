import json
import unittest

from server import dict_test, list_test, string_test


class StateDemoTests(unittest.IsolatedAsyncioTestCase):
    async def test_routes_emit_state_updates_and_complete(self):
        cases = [
            (string_test, ["length"], 12),
            (list_test, ["count"], 7),
            (dict_test, ["theme_unchanged"], True),
        ]
        for handler, path, value in cases:
            with self.subTest(route=handler.__name__):
                response = await handler()
                operations = []
                async for chunk in response.body_iterator:
                    for line in chunk.splitlines():
                        kind, payload = line.split(":", 1)
                        self.assertNotEqual(kind, "3", payload)
                        if kind == "aui-state":
                            operations.extend(json.loads(payload))
                self.assertIn(
                    {"type": "set", "path": path, "value": value},
                    operations,
                )


if __name__ == "__main__":
    unittest.main()
