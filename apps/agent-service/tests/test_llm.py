import os
import sys
import types
import unittest
from unittest.mock import patch


class FakeResponses:
    def __init__(self, output_text="fake-openai"):
        self.output_text = output_text

    def create(self, **kwargs):
        FakeOpenAI.last_request = kwargs
        return FakeResponses()


class FakeOpenAI:
    last_request = None

    def __init__(self, **kwargs):
        self.responses = FakeResponses()


fake_openai = types.ModuleType("openai")
fake_openai.OpenAI = FakeOpenAI
sys.modules["openai"] = fake_openai

from app import llm


class ProviderRoutingTests(unittest.TestCase):
    def setUp(self):
        for key in (
            "OPENAI_API_KEY",
            "ANTHROPIC_API_KEY",
            "GEMINI_API_KEY",
            "OPENAI_MODEL",
            "ANTHROPIC_MODEL",
            "GEMINI_MODEL",
        ):
            os.environ.pop(key, None)

    def test_default_models_are_current(self):
        self.assertEqual(llm._model("openai", None), "gpt-5.6-luna")
        self.assertEqual(llm._model("anthropic", None), "claude-sonnet-5-5")
        self.assertEqual(llm._model("gemini", None), "gemini-3.8-flash")

    def test_environment_model_overrides_default(self):
        os.environ["OPENAI_MODEL"] = "configured-model"
        self.assertEqual(llm._model("openai", None), "configured-model")

    def test_explicit_model_overrides_environment(self):
        os.environ["OPENAI_MODEL"] = "configured-model"
        self.assertEqual(llm._model("openai", "custom-model"), "custom-model")

    def test_openai_uses_responses_api_and_selected_model(self):
        os.environ["OPENAI_API_KEY"] = "test-key"
        result = llm.chat_text(
            provider="openai",
            model="gpt-test",
            system="system",
            user="hello",
        )
        self.assertEqual(result, "fake-openai")
        self.assertEqual(FakeOpenAI.last_request["model"], "gpt-test")
        self.assertEqual(FakeOpenAI.last_request["instructions"], "system")
        self.assertEqual(FakeOpenAI.last_request["input"], "hello")
        self.assertFalse(FakeOpenAI.last_request["store"])

    def test_anthropic_uses_selected_model(self):
        captured = {}

        def fake_http(url, headers, payload):
            captured.update({"url": url, "headers": headers, "payload": payload})
            return {"content": [{"type": "text", "text": "claude-result"}]}

        os.environ["ANTHROPIC_API_KEY"] = "test-key"
        with patch.object(llm, "_http_json", side_effect=fake_http):
            result = llm.chat_text(
                provider="anthropic",
                model="claude-test",
                system="system",
                user="hello",
            )

        self.assertEqual(result, "claude-result")
        self.assertEqual(captured["payload"]["model"], "claude-test")
        self.assertEqual(captured["headers"]["x-api-key"], "test-key")

    def test_gemini_uses_selected_model(self):
        captured = {}

        def fake_http(url, headers, payload):
            captured.update({"url": url, "headers": headers, "payload": payload})
            return {"candidates": [{"content": {"parts": [{"text": "gemini-result"}]}}]}

        os.environ["GEMINI_API_KEY"] = "test-key"
        with patch.object(llm, "_http_json", side_effect=fake_http):
            result = llm.chat_text(
                provider="gemini",
                model="gemini-test",
                system="system",
                user="hello",
            )

        self.assertEqual(result, "gemini-result")
        self.assertIn("/models/gemini-test:generateContent", captured["url"])
        self.assertEqual(captured["payload"]["contents"][0]["parts"][0]["text"], "hello")

    def test_missing_key_returns_safe_configuration_marker(self):
        result = llm.chat_text(
            provider="anthropic",
            model="claude-test",
            system="system",
            user="hello",
        )
        self.assertTrue(result.startswith("[LLM_NOT_CONFIGURED] anthropic:"))

    def test_unknown_provider_is_rejected(self):
        with self.assertRaises(ValueError):
            llm.chat_text(provider="unknown", system="system", user="hello")


if __name__ == "__main__":
    unittest.main()
