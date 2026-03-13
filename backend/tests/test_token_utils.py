from app.models.transcriber_model import TranscriptSegment
from app.utils.token_utils import chunk_segments, estimate_tokens, format_time


def _make_segments(count: int, repeat: int = 3):
    return [
        TranscriptSegment(
            start=i * 10.0,
            end=(i + 1) * 10.0,
            text=(f"第{i}段內容，這是一段測試文字。" * repeat),
        )
        for i in range(count)
    ]


def test_format_time():
    assert format_time(0) == "00:00"
    assert format_time(65) == "01:05"
    assert format_time(3661) == "1:01:01"
    assert format_time(65.9) == "01:05"


def test_estimate_tokens():
    assert estimate_tokens("") == 0
    assert estimate_tokens("Hello, world!") >= 1
    assert estimate_tokens("你好，世界") >= 1


def test_chunk_segments_short_text_no_chunk():
    segments = _make_segments(5, repeat=1)
    chunks = chunk_segments(segments, max_tokens=3000)
    assert len(chunks) == 1
    assert chunks[0] == segments


def test_chunk_segments_long_text_with_overlap():
    segments = _make_segments(120, repeat=8)
    chunks = chunk_segments(segments, max_tokens=600, overlap=2)
    assert len(chunks) > 1
    assert chunks[0][-2:] == chunks[1][:2]


def test_chunk_segments_without_overlap():
    segments = _make_segments(120, repeat=8)
    chunks = chunk_segments(segments, max_tokens=600, overlap=0)
    assert len(chunks) > 1
    assert chunks[0][-1] != chunks[1][0]


def test_chunk_segments_empty():
    assert chunk_segments([], max_tokens=1000) == []


def test_chunk_segments_single_oversized_segment():
    long_segment = TranscriptSegment(start=0.0, end=10.0, text="長文本" * 2000)
    chunks = chunk_segments([long_segment], max_tokens=100)
    assert len(chunks) == 1
    assert chunks[0] == [long_segment]
