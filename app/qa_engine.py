from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any


PROTOCOL_PROFILES: dict[str, dict[str, Any]] = {
    "QCOM": {
        "focus": "authorization timing, host response codes, reversal behavior, and terminal state transitions",
        "evidence": ["transaction id", "auth request/response pair", "timeout window", "terminal firmware"],
        "checks": [
            "Confirm approved auths complete within the expected response window.",
            "Verify reversal messages are emitted when completion fails.",
            "Capture host and terminal timestamps for drift.",
        ],
    },
    "SAS": {
        "focus": "polling cadence, event acknowledgements, meter deltas, and exception recovery",
        "evidence": ["poll sequence", "event id", "meter snapshot", "cabinet state"],
        "checks": [
            "Validate every event receives the expected acknowledgement.",
            "Compare meter deltas before and after the event.",
            "Check for duplicate polls during recovery.",
        ],
    },
    "ASP": {
        "focus": "session negotiation, message framing, payload validation, and retry handling",
        "evidence": ["session id", "frame length", "payload checksum", "retry count"],
        "checks": [
            "Confirm frame boundaries match the declared length.",
            "Validate checksum failures trigger a bounded retry.",
            "Record negotiated capabilities.",
        ],
    },
    "X-Series": {
        "focus": "device orchestration, command sequencing, telemetry freshness, and failover",
        "evidence": ["device id", "command sequence", "telemetry sample", "failover state"],
        "checks": [
            "Ensure commands are idempotent across retries.",
            "Compare telemetry age against freshness thresholds.",
            "Capture failover transition markers.",
        ],
    },
    "All Protocols": {
        "focus": "test setup, reproducibility, clear evidence capture, and risk-based triage",
        "evidence": ["environment", "test data", "timestamps", "expected and actual behavior"],
        "checks": [
            "Define the protocol under test before triage.",
            "Preserve raw logs with timestamps.",
            "Document the smallest reproducible path.",
        ],
    },
}


def supported_protocols() -> list[str]:
    return list(PROTOCOL_PROFILES.keys())


def normalize_protocol(protocol: str | None) -> str:
    if protocol in PROTOCOL_PROFILES:
        return str(protocol)
    return "QCOM"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def extract_knowledge_hits(question: str, documents: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    if not documents:
        return []

    terms = {
        term.lower()
        for term in re.findall(r"[A-Za-z0-9_-]{4,}", question)
        if term.lower() not in {"what", "when", "with", "from", "that", "this", "should", "protocol"}
    }
    hits: list[dict[str, str]] = []
    for document in documents:
        title = str(document.get("title") or "Untitled document")
        content = str(document.get("content") or "")
        haystack = f"{title}\n{content}".lower()
        if terms and not any(term in haystack for term in terms):
            continue
        excerpt = " ".join(content.split())[:260]
        hits.append({
            "title": title,
            "excerpt": excerpt or "No document content available.",
        })
        if len(hits) == 3:
            break
    return hits


def search_knowledge_base(
    query: str,
    documents: list[dict[str, Any]] | None,
    protocol: str | None = None,
) -> list[dict[str, str]]:
    selected = normalize_protocol(protocol)
    scoped_documents = [
        document
        for document in documents or []
        if document.get("protocol") in (selected, "All Protocols", None)
    ]
    return extract_knowledge_hits(query, scoped_documents)


def answer_question(protocol: str, question: str, documents: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    selected = normalize_protocol(protocol)
    cleaned_question = question.strip()
    if not cleaned_question:
        raise ValueError("Question is required")
    profile = PROTOCOL_PROFILES[selected]
    lower_question = cleaned_question.lower()

    if any(term in lower_question for term in ("timeout", "fail", "failure", "reject", "invalid")):
        risk = "High"
    elif any(term in lower_question for term in ("defect", "bug", "reproduce", "evidence")):
        risk = "Medium"
    else:
        risk = "Normal"

    knowledge_hits = search_knowledge_base(cleaned_question, documents, selected)
    knowledge_matches = [
        f"{hit['title']}: {hit['excerpt']}"
        for hit in knowledge_hits
    ]

    return {
        "type": "answer",
        "protocol": selected,
        "question": cleaned_question,
        "risk": risk,
        "guidance": (
            f"Focus this investigation on {profile['focus']}. "
            f"{'I found related knowledge-base context below.' if knowledge_hits else 'No matching knowledge-base document was found, so this answer uses protocol guidance.'}"
        ),
        "recommended_checks": profile["checks"],
        "evidence_to_capture": profile["evidence"],
        "knowledge_hits": knowledge_hits,
        "knowledge_matches": knowledge_matches,
        "follow_up_questions": [
            f"What raw {selected} evidence proves the expected behavior?",
            "Which timestamp or state transition is the first point of divergence?",
            "Can the same result be reproduced with the same setup and test data?",
        ],
        "note": (
            "If the issue is intermittent, run the same scenario at least twice "
            "and compare timestamps before changing the test setup."
        ),
        "created_at": now_iso(),
    }


def analyze_log(protocol: str, log_text: str) -> dict[str, Any]:
    selected = normalize_protocol(protocol)
    profile = PROTOCOL_PROFILES[selected]
    lines = [line.strip() for line in re.split(r"\r?\n", log_text) if line.strip()]
    if not lines:
        raise ValueError("Protocol log text is required")
    error_lines = [line for line in lines if re.search(r"error|fail|timeout|reject|invalid", line, re.I)]
    warning_lines = [line for line in lines if re.search(r"warn|retry|slow|delay", line, re.I)]
    identifiers: set[str] = set()

    for line in lines:
        for match in re.findall(r"\b(?:txn|transaction|session|device)[=: -]?([A-Za-z0-9_-]+)", line, re.I):
            identifiers.add(match)

    if error_lines:
        severity = "High"
    elif warning_lines:
        severity = "Medium"
    else:
        severity = "Low"

    return {
        "type": "log-analysis",
        "protocol": selected,
        "line_count": len(lines),
        "error_count": len(error_lines),
        "warning_count": len(warning_lines),
        "severity": severity,
        "identifiers": sorted(identifiers),
        "flagged_lines": (error_lines + warning_lines)[:8],
        "timeline": lines[:12],
        "risk_areas": [
            profile["focus"],
            (
                f"{len(identifiers)} identifiers found for correlation."
                if identifiers
                else "No explicit transaction or session identifiers found."
            ),
            (
                "Prioritize the first error before later cascading failures."
                if error_lines
                else "No hard error markers found; inspect timing and state transitions."
            ),
        ],
        "next_actions": profile["checks"],
        "summary": (
            f"{len(lines)} lines scanned, {len(error_lines)} errors, "
            f"{len(warning_lines)} warnings, severity {severity}."
        ),
        "created_at": now_iso(),
    }


def draft_defect(protocol: str, summary: str, notes: str) -> dict[str, Any]:
    selected = normalize_protocol(protocol)
    profile = PROTOCOL_PROFILES[selected]
    title = summary.strip() or f"{selected} protocol behavior differs from expected result"
    cleaned_notes = notes.strip()
    if not summary.strip() and not cleaned_notes:
        raise ValueError("Defect summary or notes are required")

    return {
        "type": "defect",
        "protocol": selected,
        "title": title,
        "impact": "Test execution may produce inconsistent certification evidence until the behavior is explained or corrected.",
        "steps": [
            f"Configure the test environment for {selected} validation.",
            "Run the scenario using the same device, host, and test data captured in the notes.",
            "Observe the response, timing, and state transitions around the failure point.",
        ],
        "expected": (
            "The protocol exchange completes according to the specification and produces "
            "consistent acknowledgements, timing, and state updates."
        ),
        "expected_result": (
            "The protocol exchange completes according to the specification and produces "
            "consistent acknowledgements, timing, and state updates."
        ),
        "actual": cleaned_notes or "Actual result not provided. Add log excerpts and observed behavior before filing.",
        "actual_result": cleaned_notes or "Actual result not provided. Add log excerpts and observed behavior before filing.",
        "evidence": profile["evidence"],
        "required_evidence": profile["evidence"],
        "acceptance_criteria": [
            "The defect includes environment, protocol, and test data details.",
            "The reproduction steps can be followed by another QA engineer.",
            "Expected and actual results are supported by log evidence.",
        ],
        "created_at": now_iso(),
    }


def summarize_result(result: dict[str, Any]) -> str:
    if result["type"] == "answer":
        return f"{result['protocol']} question answered with {result['risk']} triage risk."
    if result["type"] == "log-analysis":
        return result["summary"]
    if result["type"] == "defect":
        return f"Drafted defect: {result['title']}"
    return "Application activity recorded."


def history_entry(activity_type: str, result: dict[str, Any]) -> dict[str, str]:
    return {
        "type": activity_type,
        "created_at": result.get("created_at", now_iso()),
        "summary": summarize_result(result),
    }


def summarize_history(history: list[dict[str, Any]]) -> list[dict[str, str]]:
    return [
        history_entry(entry.get("type", "activity"), entry.get("result", {}))
        for entry in history[-10:]
    ]


def generate_session_report(session: dict[str, Any]) -> dict[str, Any]:
    history = session.get("history", [])
    documents = session.get("knowledgeBase", session.get("documents", []))
    summarized = summarize_history(history)
    protocol = normalize_protocol(session.get("protocol"))
    user = session.get("user", "QA Tester")

    counts = {
        "questions": sum(1 for entry in history if entry.get("type") == "question"),
        "log_analyses": sum(1 for entry in history if entry.get("type") == "log"),
        "defects": sum(1 for entry in history if entry.get("type") == "defect"),
    }
    high_severity_logs = [
        entry["result"]
        for entry in history
        if entry.get("type") == "log" and entry.get("result", {}).get("severity") == "High"
    ]

    lines = [
        "# AI QA Assistant Session Report",
        "",
        f"- User: {user}",
        f"- Current protocol: {protocol}",
        f"- Generated at: {now_iso()}",
        f"- Questions answered: {counts['questions']}",
        f"- Logs analyzed: {counts['log_analyses']}",
        f"- Defects drafted: {counts['defects']}",
        f"- Knowledge documents: {len(documents)}",
        f"- High severity log analyses: {len(high_severity_logs)}",
        "",
        "## Recent activity",
    ]

    if summarized:
        for entry in summarized:
            lines.append(f"- {entry['created_at']} [{entry['type']}] {entry['summary']}")
    else:
        lines.append("- No activity recorded yet.")

    return {
        "type": "session-report",
        "protocol": protocol,
        "user": user,
        "counts": counts,
        "document_count": len(documents),
        "high_severity_log_count": len(high_severity_logs),
        "history": summarized,
        "markdown": "\n".join(lines),
        "created_at": now_iso(),
    }
