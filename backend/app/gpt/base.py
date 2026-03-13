from __future__ import annotations

import logging
from abc import ABC
from typing import Callable, List, Optional

from app.gpt.chunked_summarizer import ChunkedSummarizer
from app.models.gpt_model import GPTSource
from app.models.transcriber_model import TranscriptSegment

logger = logging.getLogger(__name__)


class GPT(ABC):
    def summarize(self, source: GPTSource) -> str:
        """
        Generate markdown notes from a GPTSource.
        """
        raise NotImplementedError

    def create_messages(self, segments: list, **kwargs) -> list:
        raise NotImplementedError

    def list_models(self):
        raise NotImplementedError

    def _should_use_chunked_summary(
        self,
        segments: List[TranscriptSegment],
        format_fn: Callable[[List[TranscriptSegment]], str],
    ) -> bool:
        if not segments:
            return False
        if not hasattr(self, "client") or not hasattr(self, "model"):
            return False

        summarizer = ChunkedSummarizer(
            client=self.client,
            model=self.model,
            temperature=getattr(self, "temperature", 0.7),
        )
        return summarizer.needs_chunking(segments, format_fn)

    def _build_extra_instructions(self, source: GPTSource) -> str:
        extra_parts: List[str] = []

        from app.gpt.prompt_builder import get_format_function, get_style_format

        if source._format:
            for fmt in source._format:
                format_text = get_format_function(fmt)
                if format_text:
                    extra_parts.append(format_text)

        if source.style:
            style_text = get_style_format(source.style)
            if style_text:
                extra_parts.append(style_text)

        if source.extras:
            extra_parts.append(source.extras)

        return "\n".join(extra_parts)

    def _try_chunked_summarize(
        self,
        source: GPTSource,
        format_fn: Callable[[List[TranscriptSegment]], str],
    ) -> Optional[str]:
        if not hasattr(self, "client") or not hasattr(self, "model"):
            return None
        if not source.segment:
            return None

        summarizer = ChunkedSummarizer(
            client=self.client,
            model=self.model,
            temperature=getattr(self, "temperature", 0.7),
        )

        if not summarizer.needs_chunking(source.segment, format_fn):
            return None

        logger.info("文本超過 token 上限，使用分段摘要模式")
        extra_instructions = self._build_extra_instructions(source)
        tags = source.tags
        if isinstance(tags, (list, tuple, set)):
            tags = ", ".join(str(tag) for tag in tags if tag)
        elif tags is None:
            tags = ""

        return summarizer.summarize_chunks(
            segments=source.segment,
            title=source.title,
            tags=str(tags),
            format_fn=format_fn,
            extra_instructions=extra_instructions,
            on_chunk_complete=source.on_chunk_progress,
        )
