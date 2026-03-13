"""
Token utilities for long transcript processing.

This module provides:
1. token estimation with graceful fallbacks
2. transcript segment chunking based on token budgets
"""

from __future__ import annotations

import logging
from typing import Callable, List, Optional

from app.models.transcriber_model import TranscriptSegment

logger = logging.getLogger(__name__)
_ENCODING_CACHE = {}
_DISABLE_TIKTOKEN = False
_HAS_LOGGED_TIKTOKEN_FALLBACK = False


def format_time(seconds: float) -> str:
    """
    Convert seconds to `mm:ss` or `h:mm:ss` format.
    """
    total = int(seconds)
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def estimate_tokens(text: str, model: str = "gpt-4") -> int:
    """
    Estimate token count for a given text.

    Fallback order:
    1. tiktoken.encoding_for_model(model)
    2. tiktoken.get_encoding("cl100k_base")
    3. rough estimate len(text) // 3
    """
    if not text:
        return 0

    encoding = _resolve_encoding(model)
    if encoding is not None:
        try:
            return len(encoding.encode(text))
        except Exception as exc:  # pragma: no cover - defensive fallback
            _mark_tiktoken_unavailable(f"Token estimation failed with tiktoken: {exc}")

    return max(1, len(text) // 3)


def _resolve_encoding(model: str):
    global _DISABLE_TIKTOKEN

    if _DISABLE_TIKTOKEN:
        return None

    if model in _ENCODING_CACHE:
        return _ENCODING_CACHE[model]

    try:
        import tiktoken
    except ImportError:
        _mark_tiktoken_unavailable("tiktoken is not installed, using rough estimate (len // 3)")
        return None

    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        try:
            encoding = tiktoken.get_encoding("cl100k_base")
        except Exception as exc:  # pragma: no cover - defensive fallback
            _mark_tiktoken_unavailable(f"Failed to load cl100k_base encoding: {exc}")
            return None
    except Exception as exc:  # pragma: no cover - defensive fallback
        _mark_tiktoken_unavailable(f"Token model encoding lookup failed: {exc}")
        return None

    _ENCODING_CACHE[model] = encoding
    return encoding


def _mark_tiktoken_unavailable(message: str) -> None:
    global _DISABLE_TIKTOKEN
    global _HAS_LOGGED_TIKTOKEN_FALLBACK

    _DISABLE_TIKTOKEN = True
    if not _HAS_LOGGED_TIKTOKEN_FALLBACK:
        logger.warning(message)
        _HAS_LOGGED_TIKTOKEN_FALLBACK = True


def _default_format(segments: List[TranscriptSegment]) -> str:
    return "\n".join(f"{format_time(seg.start)} - {seg.text.strip()}" for seg in segments)


def chunk_segments(
    segments: List[TranscriptSegment],
    max_tokens: int = 3000,
    format_fn: Optional[Callable[[List[TranscriptSegment]], str]] = None,
    overlap: int = 2,
) -> List[List[TranscriptSegment]]:
    """
    Split transcript segments into chunks constrained by token budget.
    """
    if not segments:
        return []
    if max_tokens <= 0:
        raise ValueError("max_tokens must be greater than 0")

    formatter = format_fn or _default_format
    overlap = max(0, overlap)

    full_text = formatter(segments)
    if estimate_tokens(full_text) <= max_tokens:
        return [segments]

    chunks: List[List[TranscriptSegment]] = []
    current_chunk: List[TranscriptSegment] = []

    for seg in segments:
        candidate = current_chunk + [seg]
        candidate_tokens = estimate_tokens(formatter(candidate))

        if candidate_tokens <= max_tokens:
            current_chunk = candidate
            continue

        # Current chunk is full, flush it first.
        if current_chunk:
            chunks.append(current_chunk)
            overlap_segs = current_chunk[-overlap:] if overlap > 0 else []
            current_chunk = overlap_segs + [seg]
            if estimate_tokens(formatter(current_chunk)) <= max_tokens:
                continue

        # A single segment can exceed max_tokens; keep it as a standalone chunk.
        seg_tokens = estimate_tokens(formatter([seg]))
        if seg_tokens > max_tokens:
            chunks.append([seg])
            current_chunk = []
        else:
            current_chunk = [seg]

    if current_chunk:
        chunks.append(current_chunk)

    return chunks
