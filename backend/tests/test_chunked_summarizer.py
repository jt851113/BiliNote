from types import SimpleNamespace
from unittest.mock import patch

from app.gpt.chunked_summarizer import ChunkedSummarizer
from app.models.transcriber_model import TranscriptSegment


def _response(content: str, finish_reason: str = "stop"):
    message = SimpleNamespace(content=content)
    choice = SimpleNamespace(message=message, finish_reason=finish_reason)
    return SimpleNamespace(choices=[choice])


class DummyCompletions:
    def __init__(self):
        self.prompts = []
        self.call_count = 0

    def create(self, model, messages, temperature, **kwargs):
        prompt = messages[0]["content"]
        self.prompts.append(prompt)
        self.call_count += 1
        if "以下是各段的摘要" in prompt:
            return _response("# FINAL")
        if "壓縮為較短的版本" in prompt:
            return _response("## COMPRESSED CONTENT")
        return _response("## CHUNK")


class DummyClient:
    def __init__(self):
        self.chat = SimpleNamespace(completions=DummyCompletions())


def _segments(count: int, repeat: int = 8):
    return [
        TranscriptSegment(
            start=i * 10.0,
            end=(i + 1) * 10.0,
            text=(f"第{i}段測試內容。" * repeat),
        )
        for i in range(count)
    ]


def test_needs_chunking_false_for_short_input():
    client = DummyClient()
    summarizer = ChunkedSummarizer(client=client, model="gpt-4o")
    segments = _segments(3, repeat=1)
    assert summarizer.needs_chunking(segments, lambda segs: "\n".join(s.text for s in segs)) is False


def test_summarize_chunks_calls_chunk_and_merge():
    client = DummyClient()
    summarizer = ChunkedSummarizer(client=client, model="unknown-model")
    summarizer.get_max_segment_tokens = lambda: 80

    progress = []

    result = summarizer.summarize_chunks(
        segments=_segments(25, repeat=12),
        title="測試影片",
        tags="tag1,tag2",
        format_fn=lambda segs: "\n".join(f"{s.start:.0f} - {s.text}" for s in segs),
        extra_instructions="保持重點",
        on_chunk_complete=lambda current, total: progress.append((current, total)),
    )

    assert result == "# FINAL"
    assert len(client.chat.completions.prompts) >= 2
    assert progress
    assert progress[-1][0] == progress[-1][1]


def test_context_window_fallback():
    assert ChunkedSummarizer._get_context_window("gpt-4o-mini-2024-07-18") == 128000
    assert ChunkedSummarizer._get_context_window("not-listed-model") == 8000


# ---------- 壓縮功能測試 ----------


def test_compress_accumulated_reduces_text():
    """驗證 _compress_accumulated 呼叫 LLM 並返回壓縮內容。"""
    client = DummyClient()
    summarizer = ChunkedSummarizer(client=client, model="deepseek-chat")

    accumulated = "## 章節一\n長內容..." * 100
    result = summarizer._compress_accumulated(
        accumulated=accumulated,
        original_prompt="你是筆記助手...",
        context_limit=50000,
    )

    assert result == "## COMPRESSED CONTENT"
    # 確認用了壓縮 prompt
    assert any("壓縮為較短的版本" in p for p in client.chat.completions.prompts)


def test_merge_triggers_compression_on_overflow():
    """模擬 context overflow 場景，驗證觸發壓縮而非尾部截取。"""

    call_count = 0

    class OverflowCompletions:
        def __init__(self):
            self.prompts = []

        def create(self, model, messages, temperature, **kwargs):
            nonlocal call_count
            call_count += 1
            prompt = messages[0]["content"]
            self.prompts.append(prompt)

            if "壓縮為較短的版本" in prompt:
                return _response("COMPRESSED")

            # 第一次 merge 調用：返回大量內容，被 "length" 截斷
            if call_count == 1:
                return _response("A" * 5000, finish_reason="length")

            # 後續續寫調用：正常結束
            return _response(" remaining content", finish_reason="stop")

    client = SimpleNamespace(
        chat=SimpleNamespace(completions=OverflowCompletions())
    )
    summarizer = ChunkedSummarizer(client=client, model="deepseek-chat")

    # 使用一個非常小的 context window 來強制觸發壓縮
    with patch.object(
        ChunkedSummarizer, '_get_context_window', return_value=200
    ):
        result = summarizer._generate_merge_markdown("test merge prompt")

    assert "remaining content" in result
    # 確認壓縮被觸發
    assert any("壓縮為較短的版本" in p for p in client.chat.completions.prompts)


def test_compress_fallback_on_failure():
    """驗證壓縮失敗時 fallback 到尾部截取。"""

    class FailingCompletions:
        def create(self, model, messages, temperature, **kwargs):
            prompt = messages[0]["content"]
            if "壓縮為較短的版本" in prompt:
                raise RuntimeError("LLM API error")
            return _response("ok")

    client = SimpleNamespace(
        chat=SimpleNamespace(completions=FailingCompletions())
    )
    summarizer = ChunkedSummarizer(client=client, model="deepseek-chat")

    accumulated = "A" * 10000
    result = summarizer._compress_accumulated(
        accumulated=accumulated,
        original_prompt="prompt text",
        context_limit=50000,
    )

    # 壓縮失敗後應返回尾部截取的結果（仍是累積文字的子字串）
    assert result
    assert result == accumulated[-len(result):]
