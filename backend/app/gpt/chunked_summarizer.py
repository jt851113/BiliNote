"""
Chunked summarizer for long transcript notes generation.
"""

from __future__ import annotations

import logging
from typing import Callable, List, Optional

from app.gpt.prompt import CHUNK_SUMMARY_PROMPT, MERGE_SUMMARY_PROMPT
from app.models.transcriber_model import TranscriptSegment
from app.utils.token_utils import chunk_segments, estimate_tokens, format_time

logger = logging.getLogger(__name__)

MODEL_CONTEXT_WINDOWS = {
    "gpt-4": 128000,
    "gpt-4-turbo": 128000,
    "gpt-4o": 128000,
    "gpt-4o-mini": 128000,
    "gpt-3.5-turbo": 16385,
    "gpt-3.5-turbo-16k": 16385,
    "deepseek-chat": 128000,
    "deepseek-reasoner": 128000,
    "qwen-turbo": 131072,
    "qwen-plus": 131072,
    "qwen-max": 32768,
    "claude-3-5-sonnet": 200000,
    "claude-3-haiku": 200000,
}
DEFAULT_CONTEXT_WINDOW = 8000

# 各模型單次回應的最大輸出 token 數
MODEL_MAX_OUTPUT_TOKENS = {
    "gpt-4": 8192,
    "gpt-4-turbo": 4096,
    "gpt-4o": 16384,
    "gpt-4o-mini": 16384,
    "gpt-3.5-turbo": 4096,
    "gpt-3.5-turbo-16k": 4096,
    "deepseek-chat": 8192,
    "deepseek-reasoner": 65536,
    "qwen-turbo": 8192,
    "qwen-plus": 8192,
    "qwen-max": 8192,
    "claude-3-5-sonnet": 8192,
    "claude-3-haiku": 8192,
}
DEFAULT_MAX_OUTPUT = 4096


class ChunkedSummarizer:
    CONTINUE_PROMPT = (
        "你上一則回覆被截斷了。請從中斷處繼續輸出剩餘的 Markdown 內容，"
        "不要重複已輸出內容，不要加入任何額外說明。"
    )

    COMPRESS_PROMPT = (
        "以下是一篇正在生成中的 Markdown 筆記，由於上下文空間不足，"
        "請將其壓縮為較短的版本。要求：\n"
        "1. 保留所有章節標題和結構\n"
        "2. 保留所有 `*Content-[mm:ss]` 時間標記\n"
        "3. 保留關鍵論點和事實，刪除冗餘描述\n"
        "4. 壓縮後長度應不超過原文的 50%\n"
        "5. 僅返回壓縮後的 Markdown 內容\n\n"
        "---\n{text}\n---"
    )

    def __init__(self, client, model: str, temperature: float = 0.7):
        self.client = client
        self.model = model
        self.temperature = temperature

    def get_max_segment_tokens(self) -> int:
        context_window = self._get_context_window(self.model)
        return context_window // 2

    def needs_chunking(
        self,
        segments: List[TranscriptSegment],
        format_fn: Callable[[List[TranscriptSegment]], str],
    ) -> bool:
        full_text = format_fn(segments)
        total_tokens = estimate_tokens(full_text, model=self.model)
        max_tokens = self.get_max_segment_tokens()
        need_chunking = total_tokens > max_tokens
        logger.info(
            "Token 估算：total=%s, max=%s, 需要分段=%s",
            total_tokens,
            max_tokens,
            need_chunking,
        )
        return need_chunking

    def summarize_chunks(
        self,
        segments: List[TranscriptSegment],
        title: str,
        tags: str,
        format_fn: Callable[[List[TranscriptSegment]], str],
        extra_instructions: str = "",
        on_chunk_complete: Optional[Callable[[int, int], None]] = None,
    ) -> str:
        max_tokens = self.get_max_segment_tokens()
        chunks = chunk_segments(
            segments=segments,
            max_tokens=max_tokens,
            format_fn=format_fn,
            overlap=2,
        )

        total_chunks = len(chunks)
        logger.info("已切分為 %s 個 chunk", total_chunks)
        if total_chunks == 0:
            return ""

        chunk_summaries: List[str] = []
        for i, chunk in enumerate(chunks, start=1):
            logger.info("正在摘要 chunk %s/%s", i, total_chunks)
            time_start = format_time(chunk[0].start)
            time_end = format_time(chunk[-1].end)
            time_range = f"{time_start} ~ {time_end}"
            segment_text = format_fn(chunk)

            prompt = CHUNK_SUMMARY_PROMPT.format(
                chunk_index=i,
                total_chunks=total_chunks,
                video_title=title,
                time_range=time_range,
                segment_text=segment_text,
            )

            chunk_tokens = self._get_chunk_output_tokens()
            try:
                response = self._create_completion(
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=chunk_tokens,
                )
            except Exception as exc:
                logger.error("Chunk %s/%s 摘要失敗: %s", i, total_chunks, exc, exc_info=True)
                raise

            summary, finish_reason = self._extract_content_and_reason(response)
            if finish_reason == "length":
                logger.warning("Chunk %s/%s 輸出被截斷，啟用續寫", i, total_chunks)
                parts = [summary]
                context_limit = int(self._get_context_window(self.model) * 0.8)
                for cont_attempt in range(1, 3):
                    accumulated = "".join(parts)
                    cont_messages = [
                        {"role": "user", "content": prompt},
                        {"role": "assistant", "content": accumulated},
                        {"role": "user", "content": self.CONTINUE_PROMPT},
                    ]
                    total_est = estimate_tokens(
                        prompt + accumulated + self.CONTINUE_PROMPT,
                        model=self.model,
                    )
                    if total_est > context_limit:
                        logger.warning(
                            "Chunk 續寫上下文 (%s tokens) 接近限制 (%s)，壓縮已生成內容",
                            total_est, context_limit,
                        )
                        compressed = self._compress_accumulated(
                            accumulated, prompt, context_limit,
                        )
                        cont_messages = [
                            {"role": "user", "content": prompt},
                            {"role": "assistant", "content": compressed},
                            {"role": "user", "content": self.CONTINUE_PROMPT},
                        ]
                    cont_resp = self._create_completion(
                        messages=cont_messages,
                        max_tokens=chunk_tokens,
                    )
                    cont_text, cont_reason = self._extract_content_and_reason(cont_resp)
                    cont_text = cont_text.strip()
                    if not cont_text:
                        break
                    parts.append("\n" + cont_text)
                    if cont_reason != "length":
                        break
                summary = "".join(parts)
            summary = summary.strip()
            chunk_summaries.append(summary)
            logger.info("Chunk %s/%s 摘要完成", i, total_chunks)

            if on_chunk_complete:
                on_chunk_complete(i, total_chunks)

        logger.info("開始合併所有 chunk 摘要")
        combined = "\n\n---\n\n".join(
            f"### 第 {i + 1} 段摘要\n\n{summary}"
            for i, summary in enumerate(chunk_summaries)
        )
        merge_prompt = MERGE_SUMMARY_PROMPT.format(
            video_title=title,
            tags=tags,
            combined_summaries=combined,
            extra_instructions=extra_instructions,
        )

        final_markdown = self._generate_merge_markdown(merge_prompt)
        logger.info("合併摘要完成")
        return final_markdown.strip()

    @staticmethod
    def _extract_content(content) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            text_parts = [
                part.get("text", "")
                for part in content
                if isinstance(part, dict)
            ]
            return "".join(text_parts)
        return str(content)

    def _extract_content_and_reason(self, response) -> tuple[str, Optional[str]]:
        choice = response.choices[0]
        content = self._extract_content(choice.message.content)
        finish_reason = getattr(choice, "finish_reason", None)
        return content, finish_reason

    def _generate_merge_markdown(self, merge_prompt: str) -> str:
        merge_tokens = self._get_merge_output_tokens()
        response = self._create_completion(
            messages=[{"role": "user", "content": merge_prompt}],
            max_tokens=merge_tokens,
        )
        text, finish_reason = self._extract_content_and_reason(response)
        if finish_reason != "length":
            return text

        logger.warning("合併摘要輸出被截斷，啟用續寫機制")
        parts = [text]
        context_limit = int(self._get_context_window(self.model) * 0.8)

        for attempt in range(1, 6):
            accumulated = "".join(parts)
            # 帶上原始 prompt 讓 LLM 知道完整上下文
            continuation_messages = [
                {"role": "user", "content": merge_prompt},
                {"role": "assistant", "content": accumulated},
                {"role": "user", "content": self.CONTINUE_PROMPT},
            ]
            # 如果總 token 數接近 context window，主動壓縮已生成內容
            total_est = estimate_tokens(
                merge_prompt + accumulated + self.CONTINUE_PROMPT,
                model=self.model,
            )
            if total_est > context_limit:
                logger.warning(
                    "續寫上下文 (%s tokens) 接近限制 (%s)，壓縮已生成內容",
                    total_est, context_limit,
                )
                compressed = self._compress_accumulated(
                    accumulated, merge_prompt, context_limit,
                )
                continuation_messages = [
                    {"role": "user", "content": merge_prompt},
                    {"role": "assistant", "content": compressed},
                    {"role": "user", "content": self.CONTINUE_PROMPT},
                ]

            response = self._create_completion(
                messages=continuation_messages,
                max_tokens=merge_tokens,
            )
            continuation, finish_reason = self._extract_content_and_reason(response)
            continuation = continuation.strip()
            if not continuation:
                break
            parts.append("\n" + continuation)
            logger.info("續寫第 %s 次完成，累計長度 %s 字元", attempt, len("".join(parts)))
            if finish_reason != "length":
                break
            logger.warning("合併摘要續寫第 %s 次後仍截斷，繼續嘗試", attempt)

        return "".join(parts)

    def _compress_accumulated(
        self,
        accumulated: str,
        original_prompt: str,
        context_limit: int,
    ) -> str:
        """壓縮已累積的筆記內容以控制 context window 用量。

        使用 LLM 將已生成的筆記壓縮到約 50% 長度，保留結構和關鍵資訊。
        如果壓縮失敗，fallback 到尾部截取。
        """
        compress_prompt_text = self.COMPRESS_PROMPT.format(text=accumulated)
        # 壓縮目標：留出空間給 original_prompt + compressed + CONTINUE_PROMPT + output
        prompt_tokens = estimate_tokens(
            original_prompt + self.CONTINUE_PROMPT, model=self.model,
        )
        output_reserve = self._get_max_output_tokens(self.model)
        target_tokens = max(
            512,
            context_limit - prompt_tokens - output_reserve,
        )
        # 壓縮 max_tokens 不超過目標，也不超過模型 max output
        compress_max_tokens = min(target_tokens, output_reserve)

        try:
            resp = self._create_completion(
                messages=[{"role": "user", "content": compress_prompt_text}],
                max_tokens=compress_max_tokens,
            )
            compressed, _ = self._extract_content_and_reason(resp)
            compressed = compressed.strip()
            if compressed:
                compressed_tokens = estimate_tokens(compressed, model=self.model)
                logger.info(
                    "壓縮完成：%s tokens → %s tokens (%.0f%%)",
                    estimate_tokens(accumulated, model=self.model),
                    compressed_tokens,
                    compressed_tokens / max(1, estimate_tokens(accumulated, model=self.model)) * 100,
                )
                return compressed
            logger.warning("壓縮結果為空，fallback 到尾部截取")
        except Exception as exc:
            logger.warning("壓縮失敗 (%s)，fallback 到尾部截取", exc)

        # Fallback: 尾部截取（保留原有安全網邏輯）
        tail_budget = context_limit - prompt_tokens
        acc_tokens = estimate_tokens(accumulated, model=self.model)
        chars_per_token = max(1, len(accumulated) // max(1, acc_tokens))
        tail_chars = tail_budget * chars_per_token
        logger.info("尾部截取：保留最後 %s 字元", tail_chars)
        return accumulated[-tail_chars:]

    def _create_completion(self, messages: List[dict], max_tokens: Optional[int] = None):
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
        }
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens

        try:
            return self.client.chat.completions.create(**kwargs)
        except Exception as exc:
            # Some OpenAI-compatible providers may not support max_tokens on chat endpoints.
            if max_tokens is not None and self._is_max_tokens_unsupported(exc):
                logger.warning("Provider 不支援 max_tokens 參數，改用預設輸出長度")
                kwargs.pop("max_tokens", None)
                return self.client.chat.completions.create(**kwargs)
            raise

    def _get_chunk_output_tokens(self) -> int:
        model_max = self._get_max_output_tokens(self.model)
        return max(2048, min(model_max, self._get_context_window(self.model) // 4))

    def _get_merge_output_tokens(self) -> int:
        # 合併步驟使用模型的最大輸出能力，靠續寫機制處理超出部分
        return self._get_max_output_tokens(self.model)

    @staticmethod
    def _is_max_tokens_unsupported(exc: Exception) -> bool:
        message = str(exc).lower()
        if "max_tokens" not in message:
            return False
        keywords = (
            "unsupported",
            "unknown",
            "invalid",
            "extra",
            "not allowed",
            "unexpected keyword",
        )
        return any(keyword in message for keyword in keywords)

    @staticmethod
    def _get_context_window(model: str) -> int:
        if model in MODEL_CONTEXT_WINDOWS:
            return MODEL_CONTEXT_WINDOWS[model]

        lowered = model.lower()
        for key, window in MODEL_CONTEXT_WINDOWS.items():
            if lowered.startswith(key):
                return window
        return DEFAULT_CONTEXT_WINDOW

    @staticmethod
    def _get_max_output_tokens(model: str) -> int:
        if model in MODEL_MAX_OUTPUT_TOKENS:
            return MODEL_MAX_OUTPUT_TOKENS[model]

        lowered = model.lower()
        for key, limit in MODEL_MAX_OUTPUT_TOKENS.items():
            if lowered.startswith(key):
                return limit
        return DEFAULT_MAX_OUTPUT
