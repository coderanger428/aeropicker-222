"""One completion call for whichever provider is stored on the API key."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request

MODELS = {
    "Google": ("gemini-3.8-flash", "gemini-3.6-flash"),
    "OpenAI": ("gpt-4.1-mini", "gpt-4o-mini"),
    "Anthropic": ("claude-sonnet-4-5", "claude-3-5-sonnet-latest"),
}

# A missing model, a rate limit, or a temporary capacity error can use the next model.
_FALLBACK_STATUSES = {404, 429, 503}


class AiError(Exception):
    def __init__(self, message: str, status: int = 502) -> None:
        super().__init__(message)
        self.status = status


def complete(key: dict, instructions: str, content: str) -> tuple[dict, dict]:
    text, usage = _call(key, f"{instructions.strip()}\n\nReply with one JSON object and no markdown.", content, json_mode=True)
    return _parse_object(text), usage


def complete_text(key: dict, instructions: str, content: str) -> tuple[str, dict]:
    text, usage = _call(key, instructions.strip(), content, json_mode=False)
    cleaned = text.strip()
    if not cleaned:
        raise AiError("The model returned no text.")
    return cleaned, usage


def complete_json(key: dict, instructions: str, parts: list[dict]) -> tuple[dict, dict]:
    text, usage = _call(key, instructions.strip(), parts, json_mode=True)
    return _parse_object(text), usage


def _call(key: dict, system: str, content: str | list[dict], *, json_mode: bool) -> tuple[str, dict]:
    provider = key.get("provider") or ""
    models = MODELS.get(provider)
    if not models:
        raise AiError(f"{provider or 'That'} is not a supported provider.", 400)
    secret = key.get("secret") or ""
    if not secret:
        raise AiError("That API key has no secret.", 400)
    last: AiError | None = None
    for index, model in enumerate(models):
        try:
            return _dispatch(provider, model, secret, key, system, content, json_mode=json_mode)
        except AiError as exc:
            last = exc
            retry = index < len(models) - 1 and exc.status in _FALLBACK_STATUSES
            if not retry:
                raise
    raise last or AiError("The model provider did not respond.")


def _dispatch(
    provider: str,
    model: str,
    secret: str,
    key: dict,
    system: str,
    content: str | list[dict],
    *,
    json_mode: bool,
) -> tuple[str, dict]:
    if provider == "Google":
        return _google(model, secret, system, content, json_mode=json_mode)
    if provider == "OpenAI":
        return _openai(model, secret, key, system, content, json_mode=json_mode)
    if provider == "Anthropic":
        return _anthropic(model, secret, system, content, json_mode=json_mode)
    raise AiError(f"{provider} is not a supported provider.", 400)


def _google(model: str, secret: str, system: str, content: str | list[dict], *, json_mode: bool) -> tuple[str, dict]:
    if isinstance(content, list):
        try:
            return _google_interaction(model, secret, system, content, json_mode=json_mode)
        except AiError as exc:
            if exc.status != 502:
                raise
            return _google_generate(model, secret, system, content, json_mode=json_mode)
    return _google_generate(model, secret, system, content, json_mode=json_mode)


def _google_generate(model: str, secret: str, system: str, content: str | list[dict], *, json_mode: bool) -> tuple[str, dict]:
    if isinstance(content, list):
        user_parts = [{"text": str(part.get("text") or "")} for part in content]
    else:
        user_parts = [{"text": content}]
    generation: dict = {
        "maxOutputTokens": 8192 if json_mode else 256,
        "thinkingConfig": {"thinkingLevel": "low" if isinstance(content, list) or not json_mode else "medium"},
    }
    if json_mode:
        generation["responseMimeType"] = "application/json"
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": user_parts}],
        "generationConfig": generation,
    }
    body = _post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        payload,
        {"Content-Type": "application/json", "x-goog-api-key": secret},
        secret,
        timeout=180 if json_mode else 45,
    )
    candidates = body.get("candidates") or []
    if not candidates:
        feedback = body.get("promptFeedback") or {}
        raise AiError(str(feedback.get("blockReason") or "The model returned no text."))
    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "".join(str(part.get("text") or "") for part in parts)
    usage_meta = body.get("usageMetadata") or {}
    return text, {
        "model": model,
        "prompt_tokens": int(usage_meta.get("promptTokenCount") or 0),
        "output_tokens": int(usage_meta.get("candidatesTokenCount") or 0),
        "thought_tokens": int(usage_meta.get("thoughtsTokenCount") or 0),
    }


def _google_interaction(model: str, secret: str, system: str, parts: list[dict], *, json_mode: bool) -> tuple[str, dict]:
    payload: dict = {
        "model": model,
        "system_instruction": system,
        # v1beta accepts text parts. v1 expects a user_input step at this position.
        "input": parts,
        "store": False,
        "generation_config": {
            "max_output_tokens": 8192 if json_mode else 256,
            "thinking_level": "low",
        },
    }
    if json_mode:
        payload["response_format"] = {"type": "text", "mime_type": "application/json"}
    body = _post(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        payload,
        {"Content-Type": "application/json", "x-goog-api-key": secret},
        secret,
        timeout=180 if json_mode else 45,
    )
    usage_meta = body.get("usage") or {}
    return _interaction_text(body), {
        "model": str(body.get("model") or model),
        "prompt_tokens": int(usage_meta.get("total_input_tokens") or 0),
        "output_tokens": int(usage_meta.get("total_output_tokens") or 0),
        "thought_tokens": int(usage_meta.get("total_thought_tokens") or 0),
    }


def _interaction_text(body: dict) -> str:
    chunks: list[str] = []
    for step in body.get("steps") or []:
        if not isinstance(step, dict) or step.get("type") != "model_output":
            continue
        for block in step.get("content") or []:
            if isinstance(block, dict) and block.get("type") == "text":
                chunks.append(str(block.get("text") or ""))
    text = "".join(chunks).strip()
    if text:
        return text
    status = str(body.get("status") or "")
    if status and status != "completed":
        raise AiError(f"The model did not finish ({status}).", 503)
    raise AiError("The model returned no text.")


def _openai(model: str, secret: str, key: dict, system: str, content: str | list[dict], *, json_mode: bool) -> tuple[str, dict]:
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {secret}"}
    if key.get("organization_id"):
        headers["OpenAI-Organization"] = key["organization_id"]
    if key.get("project_id"):
        headers["OpenAI-Project"] = key["project_id"]
    payload = {
        "model": model,
        "temperature": 0.2,
        "max_completion_tokens": 8192 if json_mode else 1024,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ],
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    body = _post("https://api.openai.com/v1/chat/completions", payload, headers, secret)
    choices = body.get("choices") or []
    if not choices:
        raise AiError("The model returned no text.")
    text = str((choices[0].get("message") or {}).get("content") or "")
    usage_meta = body.get("usage") or {}
    return text, {
        "model": model,
        "prompt_tokens": int(usage_meta.get("prompt_tokens") or 0),
        "output_tokens": int(usage_meta.get("completion_tokens") or 0),
        "thought_tokens": 0,
    }


def _anthropic(model: str, secret: str, system: str, content: str | list[dict], *, json_mode: bool) -> tuple[str, dict]:
    payload = {
        "model": model,
        "max_tokens": 8192 if json_mode else 1024,
        "temperature": 0.2,
        "system": system,
        "messages": [{"role": "user", "content": content}],
    }
    headers = {
        "Content-Type": "application/json",
        "x-api-key": secret,
        "anthropic-version": "2023-06-01",
    }
    body = _post("https://api.anthropic.com/v1/messages", payload, headers, secret)
    blocks = body.get("content") or []
    text = "".join(str(block.get("text") or "") for block in blocks if isinstance(block, dict))
    usage_meta = body.get("usage") or {}
    return text, {
        "model": model,
        "prompt_tokens": int(usage_meta.get("input_tokens") or 0),
        "output_tokens": int(usage_meta.get("output_tokens") or 0),
        "thought_tokens": 0,
    }


def _post(url: str, payload: dict, headers: dict, secret: str, timeout: int = 180) -> dict:
    request = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode())
    except TimeoutError as exc:
        raise AiError("The model provider did not respond in time.", 503) from exc
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        status = exc.code if exc.code in {400, 401, 403, 404, 429, 503} else 502
        raise AiError(_public_error(detail, secret), status) from exc
    except urllib.error.URLError as exc:
        reason = re.sub(r"\s+", " ", str(getattr(exc, "reason", exc) or exc)).strip()[:200]
        timed_out = "timed out" in reason.lower()
        message = "The model provider did not respond in time." if timed_out else f"The model provider could not be reached. {reason}".strip()
        raise AiError(message, 503 if timed_out else 502) from exc
    except json.JSONDecodeError as exc:
        raise AiError("The model provider returned a response that was not JSON.") from exc


def _public_error(detail: str, secret: str) -> str:
    text = detail.replace(secret, "") if secret else detail
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = None
    if isinstance(parsed, dict):
        error = parsed.get("error")
        if isinstance(error, dict) and error.get("message"):
            text = str(error["message"])
        elif isinstance(error, str):
            text = error
        elif parsed.get("message"):
            text = str(parsed["message"])
    text = re.sub(r"\s+", " ", text).strip()
    return text[:1000] or "The model provider rejected the request."


def _parse_object(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start < 0 or end <= start:
            raise AiError("The model did not return JSON.")
        try:
            value = json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError as exc:
            raise AiError("The model did not return JSON.") from exc
    if not isinstance(value, dict):
        raise AiError("The model did not return a JSON object.")
    return value
