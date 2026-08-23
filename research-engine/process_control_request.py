#!/usr/bin/env python3
"""Verarbeitet genau einen Control-Center-Request aus dem auslösenden Commit."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent


def find_request_path() -> Path:
    proc = subprocess.run(
        ["git", "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"],
        cwd=REPO,
        text=True,
        capture_output=True,
        check=True,
    )
    candidates = [
        line.strip() for line in proc.stdout.splitlines()
        if re.fullmatch(r"data/research-requests/[^/]+\.json", line.strip())
    ]
    if not candidates:
        raise SystemExit("Keine Research-Auftragsdatei im auslösenden Commit gefunden.")
    path = REPO / candidates[-1]
    if not path.is_file():
        raise SystemExit(f"Research-Auftrag fehlt im Checkout: {path}")
    return path


def sanitize_id(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "-", value).strip("-")[:80]


def write_fallback(target: Path, query: str, status: str, message: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({
        "version": 2,
        "status": status,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "context": {"input": query},
        "principle": message,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    request_path = find_request_path()
    req = json.loads(request_path.read_text(encoding="utf-8"))
    request_id = sanitize_id(str(req.get("request_id") or request_path.stem))
    query = str(req.get("query") or "").strip()
    mode = str(req.get("mode") or "quick").strip().lower()
    if not request_id or not query or mode not in {"quick", "deep"}:
        raise SystemExit("Ungültiger Research-Auftrag")

    status_dir = ROOT / "output" / "control-center-status"
    result_dir = ROOT / "output" / "control-center"
    status_dir.mkdir(parents=True, exist_ok=True)
    result_dir.mkdir(parents=True, exist_ok=True)

    started = datetime.now(timezone.utc).isoformat()
    status_path = status_dir / f"{request_id}.json"
    status_path.write_text(json.dumps({
        "schema": "academy-research-run-status-v1",
        "request_id": request_id,
        "state": "running",
        "mode": mode,
        "query": query,
        "started_at": started,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    raw_output = ROOT / "output" / "universal-result.json"
    timeout_seconds = 240 if mode == "quick" else 1200
    cmd = [
        sys.executable,
        str(ROOT / "universal_runtime.py"),
        query,
        "--mode", mode,
        "--output", str(raw_output),
    ]
    engine_rc = 0
    try:
        completed = subprocess.run(cmd, cwd=REPO, timeout=timeout_seconds)
        engine_rc = int(completed.returncode)
    except subprocess.TimeoutExpired:
        engine_rc = 124
        write_fallback(
            raw_output,
            query,
            "engine_timeout",
            "Das Zeitbudget der Recherche wurde erreicht. Es wird kein vollständiges Ergebnis vorgetäuscht.",
        )
    except Exception as exc:
        engine_rc = 125
        write_fallback(
            raw_output,
            query,
            "engine_runner_error",
            f"Der Research-Runner konnte nicht vollständig ausgeführt werden: {type(exc).__name__}",
        )

    if not raw_output.exists():
        write_fallback(
            raw_output,
            query,
            "engine_output_missing",
            "Der Lauf wurde beendet, bevor ein Research-Ergebnis geschrieben werden konnte.",
        )

    result_path = result_dir / f"{request_id}.json"
    subprocess.run([
        sys.executable,
        str(ROOT / "build_control_center_result.py"),
        "--input", str(raw_output),
        "--output", str(result_path),
        "--request-id", request_id,
        "--query", query,
        "--mode", mode,
        "--engine-exit-code", str(engine_rc),
    ], cwd=REPO, check=True)

    status_path.write_text(json.dumps({
        "schema": "academy-research-run-status-v1",
        "request_id": request_id,
        "state": "completed",
        "mode": mode,
        "engine_exit_code": engine_rc,
        "started_at": started,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "result_path": str(result_path.relative_to(REPO)),
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({
        "request_id": request_id,
        "mode": mode,
        "engine_exit_code": engine_rc,
        "result": str(result_path.relative_to(REPO)),
        "status": str(status_path.relative_to(REPO)),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
