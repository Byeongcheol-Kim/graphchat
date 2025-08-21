"""
OpenRouter API 서비스
"""

import json
import logging
from collections.abc import AsyncGenerator
from typing import Any

import httpx

# get_settings는 __init__에서 동적으로 import

logger = logging.getLogger(__name__)


class OpenRouterService:
    """OpenRouter API 클라이언트"""

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "deepseek/deepseek-r1:free",
        site_url: str = "http://localhost:3000",
        site_name: str = "Branching AI",
    ):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1"
        self.site_url = site_url
        self.site_name = site_name

        # 무료 모델 목록 - DeepSeek R1만 사용
        self.free_models = [
            "deepseek/deepseek-r1:free",  # DeepSeek R1 - 강력한 추론 모델 (무료)
        ]

        # 기본 모델 설정 - DeepSeek R1 (강력한 추론 능력의 무료 모델)
        self.default_model = model

        # Rate limit 추적
        self._rate_limited = False
        self._rate_limit_reset_time = None

        # HTTP 헤더 설정
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": self.site_url,
            "X-Title": self.site_name,
            "Content-Type": "application/json",
        }

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        stream: bool = False,
        response_format: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """채팅 완성 API 호출 - Rate Limit 처리 및 Structured Output 지원"""
        try:
            if not self.api_key or self.api_key == "your-openrouter-api-key":
                # API 키가 없으면 모의 응답 (개발/테스트용)
                logger.warning("OpenRouter API 키가 설정되지 않았습니다. 모의 응답을 사용합니다.")
                return self._mock_response(messages, response_format)

            # Rate limit 상태 확인 (이미 제한된 경우 바로 모의 응답)
            if self._rate_limited:
                logger.info("이전 Rate limit 상태 유지 중. 모의 응답을 사용합니다.")
                return self._mock_response(messages, response_format)

            # 단일 모델 사용
            use_model = model or self.default_model

            # 디버그 로깅: LLM 입력
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(f"\n{'=' * 50}\n[OpenRouter API 호출]\n{'=' * 50}")
                logger.debug(f"모델: {use_model}")
                logger.debug(f"온도: {temperature}")
                logger.debug(f"max_tokens: {max_tokens}")
                logger.debug(f"response_format: {response_format}")
                logger.debug(f"입력 메시지 수: {len(messages)}개")
                for _i, msg in enumerate(messages[-3:], 1):  # 최근 3개 메시지만 표시
                    logger.debug(
                        f"  [{msg.get('role', 'unknown')}]: {str(msg.get('content', ''))[:200]}{'...' if len(str(msg.get('content', ''))) > 200 else ''}"
                    )

            async with httpx.AsyncClient() as client:
                payload = {
                    "model": use_model,
                    "messages": messages,
                    "temperature": temperature,
                    "stream": stream,
                }

                # max_tokens가 지정된 경우에만 추가
                if max_tokens is not None:
                    payload["max_tokens"] = max_tokens

                # Structured Output 지원 (response_format 추가)
                if response_format:
                    payload["response_format"] = response_format

                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                    timeout=30.0,
                )

                if response.status_code == 200:
                    data = response.json()

                    # 디버그 로깅: LLM 출력
                    if logger.isEnabledFor(logging.DEBUG):
                        logger.debug(f"\n[OpenRouter 응답]\n{'-' * 50}")
                        if "choices" in data and len(data["choices"]) > 0:
                            content = data["choices"][0].get("message", {}).get("content", "")
                            logger.debug(f"응답 길이: {len(content)} 문자")
                            logger.debug(
                                f"응답 내용: {content[:500]}{'...' if len(content) > 500 else ''}"
                            )
                        if "usage" in data:
                            logger.debug(
                                f"토큰 사용량: 입력={data['usage'].get('prompt_tokens', 0)}, 출력={data['usage'].get('completion_tokens', 0)}, 총={data['usage'].get('total_tokens', 0)}"
                            )
                        logger.debug(f"{'=' * 50}\n")

                    return data
                elif response.status_code == 429:
                    # Rate limit 도달 - 일일 무료 한도 초과
                    error_data = response.json()
                    logger.warning(
                        f"일일 무료 한도 초과: {error_data.get('error', {}).get('message', 'Unknown error')}"
                    )
                    logger.info("Rate limit 도달. 모의 응답을 사용합니다.")
                    return self._mock_response(messages, response_format)
                else:
                    logger.error(f"OpenRouter API 에러: {response.status_code} - {response.text}")
                    return self._mock_response(messages, response_format)

        except Exception as e:
            logger.error(f"OpenRouter API 호출 실패: {e}")
            return self._mock_response(messages, response_format)

    async def stream_chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> AsyncGenerator[str, None]:
        """스트리밍 채팅 완성"""
        try:
            if not self.api_key or self.api_key == "your-openrouter-api-key":
                # API 키가 없으면 모의 스트리밍 (개발/테스트용)
                logger.warning(
                    "OpenRouter API 키가 설정되지 않았습니다. 모의 스트리밍을 사용합니다."
                )
                async for chunk in self._mock_stream(messages):
                    yield chunk
                return

            async with httpx.AsyncClient() as client:
                payload = {
                    "model": model or self.default_model,
                    "messages": messages,
                    "temperature": temperature,
                    "stream": True,
                }

                # max_tokens가 지정된 경우에만 추가
                if max_tokens is not None:
                    payload["max_tokens"] = max_tokens

                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                    timeout=30.0,
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            if line == "data: [DONE]":
                                break

                            try:
                                data = json.loads(line[6:])
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    if "content" in delta:
                                        yield delta["content"]
                            except json.JSONDecodeError:
                                continue

        except Exception as e:
            logger.error(f"OpenRouter 스트리밍 실패: {e}")
            async for chunk in self._mock_stream(messages):
                yield chunk

    async def get_available_models(self) -> list[dict[str, Any]]:
        """사용 가능한 모델 목록 조회"""
        try:
            if not self.api_key or self.api_key == "your-openrouter-api-key":
                return [{"id": model, "name": model} for model in self.free_models]

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/models", headers=self.headers, timeout=10.0
                )

                if response.status_code == 200:
                    data = response.json()
                    models = data.get("data", [])

                    # 무료 모델만 필터링
                    free_models = [
                        model
                        for model in models
                        if model.get("id", "").endswith(":free")
                        or model.get("pricing", {}).get("prompt", "0") == "0"
                    ]

                    return free_models if free_models else models[:10]
                else:
                    return [{"id": model, "name": model} for model in self.free_models]

        except Exception as e:
            logger.error(f"모델 목록 조회 실패: {e}")
            return [{"id": model, "name": model} for model in self.free_models]

    def _mock_response(
        self, messages: list[dict[str, str]], response_format: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """모의 응답 생성"""
        last_message = messages[-1]["content"] if messages else "안녕하세요"

        # Structured output 요청시 모의 구조화 응답
        if response_format and response_format.get("type") == "json_schema":
            mock_structured = {
                "complexity_score": 0.5,
                "branch_types": {
                    "topics": ["모의 주제 1"],
                    "details": [],
                    "alternatives": [],
                    "questions": ["모의 질문 1"],
                    "examples": [],
                },
            }
            content = json.dumps(mock_structured, ensure_ascii=False)
        else:
            content = f"[모의 응답] '{last_message}'에 대한 답변입니다. OpenRouter API 키를 설정하면 실제 AI 응답을 받을 수 있습니다."

        return {
            "id": "mock-response",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": content},
                    "finish_reason": "stop",
                }
            ],
            "model": "mock-model",
            "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
        }

    async def _mock_stream(self, messages: list[dict[str, str]]) -> AsyncGenerator[str, None]:
        """모의 스트리밍 응답"""
        mock_text = "[모의 스트리밍] 이것은 테스트 응답입니다. "
        for char in mock_text:
            yield char
