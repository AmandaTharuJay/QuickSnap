from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

from .scanner import SourceFile


class Severity(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


@dataclass(frozen=True)
class Finding:
    severity: Severity
    code: str
    message: str
    file: str
    line: int | None = None


_TODO = re.compile(r"\bTODO\b", re.IGNORECASE)


def _rel(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root.resolve()))
    except ValueError:
        return str(path)


def analyze(files: list[SourceFile], root: Path) -> list[Finding]:
    findings: list[Finding] = []
    root = root.resolve()
    by_name: dict[str, SourceFile] = {f.path.name: f for f in files}

    for sf in files:
        rel = _rel(sf.path, root)
        for i, line in enumerate(sf.lines, start=1):
            if _TODO.search(line):
                findings.append(
                    Finding(
                        Severity.LOW,
                        "TODO",
                        "Unresolved TODO — track or implement before release.",
                        rel,
                        i,
                    )
                )

    snap = by_name.get("Snap.cs")
    if snap:
        rel = _rel(snap.path, root)
        if "void Update()" in snap.text:
            start = snap.text.find("void Update()")
            block = snap.text[start : start + 500]
            if "TODO" in block or "automatically" in block.lower():
                findings.append(
                    Finding(
                        Severity.HIGH,
                        "INCOMPLETE_UPDATE",
                        "Snap.Update() is stubbed — automatic card flip / timer behavior is not implemented.",
                        rel,
                        None,
                    )
                )

    deck = by_name.get("Deck.cs")
    if deck:
        rel = _rel(deck.path, root)
        if "void Shuffle()" in deck.text:
            start = deck.text.find("void Shuffle()")
            block = deck.text[start : start + 400]
            if "TODO" in block:
                findings.append(
                    Finding(
                        Severity.HIGH,
                        "INCOMPLETE_SHUFFLE",
                        "Deck.Shuffle() is not implemented — deck order stays fixed after creation.",
                        rel,
                        None,
                    )
                )

    main_file = by_name.get("SnapGame.cs")
    if main_file:
        rel = _rel(main_file.path, root)
        text = main_file.text
        if "myGame.Start" not in text:
            findings.append(
                Finding(
                    Severity.HIGH,
                    "GAME_NOT_STARTED",
                    "Snap.Start() is never called — IsStarted stays false and PlayerHit / match scoring never applies.",
                    rel,
                    None,
                )
            )
        if "myGame.PlayerHit" not in text:
            findings.append(
                Finding(
                    Severity.MEDIUM,
                    "NO_SNAP_INPUT",
                    "No input path calls Snap.PlayerHit — players cannot score on a matching pair from the UI.",
                    rel,
                    None,
                )
            )

    return findings


def dedupe(findings: list[Finding]) -> list[Finding]:
    seen: set[tuple] = set()
    out: list[Finding] = []
    for f in findings:
        key = (f.code, f.message, f.file, f.line)
        if key in seen:
            continue
        seen.add(key)
        out.append(f)
    return out
