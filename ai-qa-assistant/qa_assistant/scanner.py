from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class SourceFile:
    path: Path
    text: str
    lines: list[str]


def iter_csharp_files(root: Path, *, max_bytes: int = 2_000_000) -> Iterable[Path]:
    skip = {"bin", "obj", "packages", ".git", "node_modules", "__pycache__"}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip]
        for name in filenames:
            if not name.endswith(".cs"):
                continue
            p = Path(dirpath) / name
            try:
                if p.stat().st_size > max_bytes:
                    continue
            except OSError:
                continue
            yield p


def read_sources(root: Path) -> list[SourceFile]:
    out: list[SourceFile] = []
    for path in sorted(iter_csharp_files(root)):
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        lines = text.splitlines()
        out.append(SourceFile(path=path, text=text, lines=lines))
    return out
