from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass

from .heuristics import Finding, Severity


@dataclass
class AIReviewResult:
    text: str
    model: str
    error: str | None = None


def _severity_order(s: Severity) -> int:
    return {Severity.HIGH: 0, Severity.MEDIUM: 1, Severity.LOW: 2, Severity.INFO: 3}[s]


def findings_to_prompt(findings: list[Finding], code_excerpt: str, max_finding_chars: int = 8000) -> str:
    lines = [
        "You are a senior QA engineer reviewing a C# card game (SwinGame / Mono).",
        "Give: (1) top risks, (2) suggested test cases, (3) any false positives in the static findings.",
        "",
        "## Static analysis findings",
    ]
    for f in sorted(findings, key=lambda x: (_severity_order(x.severity), x.file)):
        loc = f" line {f.line}" if f.line else ""
        lines.append(f"- [{f.severity.value}] {f.code} ({f.file}{loc}): {f.message}")

    body = "\n".join(lines)
    if len(body) > max_finding_chars:
        body = body[: max_finding_chars - 20] + "\n... (truncated)"

    return body + "\n\n## Code excerpt (for context)\n\n```csharp\n" + code_excerpt + "\n```\n"


def fetch_ai_review(prompt: str, *, model: str | None = None, timeout: int = 120) -> AIReviewResult:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        return AIReviewResult(
            text="",
            model="",
            error="OPENAI_API_KEY is not set; skipping AI narrative. Static report still generated.",
        )

    use_model = model or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": use_model,
        "messages": [
            {"role": "system", "content": "Be concise and actionable. Use markdown headings."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 2000,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:2000]
        return AIReviewResult(text="", model=use_model, error=f"HTTP {e.code}: {err_body}")
    except urllib.error.URLError as e:
        return AIReviewResult(text="", model=use_model, error=f"Network error: {e.reason}")

    try:
        text = raw["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as e:
        return AIReviewResult(text="", model=use_model, error=f"Unexpected API response: {e!s}")

    return AIReviewResult(text=text.strip(), model=use_model, error=None)
