import os
import unittest
from unittest.mock import patch
from backend.observability import configure_tracing, handoff_span, tracing_enabled


class TraceTests(unittest.TestCase):
    def test_off_by_default_and_without_credentials(self):
        with patch.dict(os.environ, {"MATCHWORK_TRACING_ENABLED": "false"}):
            self.assertFalse(tracing_enabled())
            self.assertFalse(configure_tracing())
            with handoff_span("tactical_analyst"):
                self.assertTrue(True)

    def test_enabled_without_exporter_configuration_fails_closed(self):
        env = {"MATCHWORK_TRACING_ENABLED": "true"}
        with patch.dict(os.environ, env):
            with patch.dict(os.environ, {"APPLICATIONINSIGHTS_CONNECTION_STRING": ""}):
                with self.assertRaises(RuntimeError):
                    configure_tracing()


if __name__ == "__main__":
    unittest.main()
