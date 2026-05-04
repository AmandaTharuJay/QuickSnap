from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from .ai_client import fetch_ai_review, findings_to_prompt
from .heuristics import Finding, Severity, analyze, dedupe
from .scanner import read_sources


def _severity_order(s: Severity) -> int:
    return {Severity.HIGH: 0, Severity.MEDIUM: 1, Severity.LOW: 2, Severity.INFO: 3}[s]


def format_markdown(findings: list[Finding], ai_text: str | None, repo_root: Path) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "# QA report",
        "",
        f"- **Repository:** `{repo_root}`",
        f"- **Generated:** {now}",
        "",
        "## Summary",
        "",
    ]
    counts: dict[str, int] = {}
    for f in findings:
        counts[f.severity.value] = counts.get(f.severity.value, 0) + 1
    if not findings:
        lines.append("No issues reported by static heuristics.")
    else:
        for sev in ("high", "medium", "low", "info"):
            n = counts.get(sev, 0)
            if n:
                lines.append(f"- **{sev}:** {n}")
    lines.append("")
    lines.append("## Static findings")
    lines.append("")
    if not findings:
        lines.append("_None._")
    else:
        for f in sorted(findings, key=lambda x: (_severity_order(x.severity), x.file, x.line or 0)):
            loc = f":{f.line}" if f.line else ""
            lines.append(f"- **[{f.severity.value}]** `{f.file}{loc}` — **{f.code}**: {f.message}")
    lines.append("")
    lines.append("## AI review")
    lines.append("")
    if ai_text:
        lines.append(ai_text)
    else:
        lines.append("_Not generated (no API key or `--no-ai`)._")
    lines.append("")
    return "\n".join(lines)


def build_code_excerpt(sources: list, root: Path, max_total_chars: int = 24000) -> str:
    chunks: list[str] = []
    total = 0
    for sf in sources:
        header = f"// --- {sf.path.relative_to(root)} ---\n"
        body = "\n".join(sf.lines[:200])
        piece = header + body + ("\n// ... (truncated)\n" if len(sf.lines) > 200 else "\n")
        if total + len(piece) > max_total_chars:
            break
        chunks.append(piece)
        total += len(piece)
    return "\n".join(chunks)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description="AI QA Assistant: static C# checks plus optional OpenAI review (OPENAI_API_KEY)."
    )
    p.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[2],
        help="Repository root to scan (default: repository root containing ai-qa-assistant/)",
    )
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Write markdown report to this path (default: print to stdout)",
    )
    p.add_argument("--no-ai", action="store_true", help="Skip OpenAI API call")
    p.add_argument("--json", action="store_true", help="Print findings as JSON to stdout (after report if -o set)")
    args = p.parse_args(argv)

    root = args.root.resolve()
    if not root.is_dir():
        print(f"error: root is not a directory: {root}", file=sys.stderr)
        return 2

    sources = read_sources(root)
    findings = dedupe(analyze(sources, root))
    excerpt = build_code_excerpt(sources, root)
    ai_text: str | None = None
    ai_error: str | None = None

    if not args.no_ai:
        prompt = findings_to_prompt(findings, excerpt)
        result = fetch_ai_review(prompt)
        if result.error and not result.text:
            ai_error = result.error
            ai_text = f"_{result.error}_"
        else:
            ai_text = result.text
            if result.error:
                ai_text = result.text + f"\n\n_Note: {result.error}_"

    report = format_markdown(findings, ai_text, root)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(report, encoding="utf-8")
        print(f"Wrote {args.output}", file=sys.stderr)
    else:
        print(report)

    if args.json:
        import json

        payload = [
            {"severity": f.severity.value, "code": f.code, "message": f.message, "file": f.file, "line": f.line}
            for f in findings
        ]
        print(json.dumps({"findings": payload, "ai_error": ai_error}, indent=2))

    return 1 if any(f.severity == Severity.HIGH for f in findings) else 0


def run() -> None:
    raise SystemExit(main())


if __name__ == "__main__":
    run()
