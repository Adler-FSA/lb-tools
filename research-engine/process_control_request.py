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


def tail(value: str, limit: int = 6000) -> str:
    value = str(value or "").strip()
    return value[-limit:] if value else ""


def write_fallback(
    target: Path,
    query: str,
    status: str,
    message: str,
    *,
    engine_exit_code: int | None = None,
    stderr: str = "",
    stdout: str = "",
) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 2,
        "status": status,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "context": {"input": query},
        "principle": message,
    }
    if engine_exit_code is not None:
        payload["technical_error"] = {
            "engine_exit_code": int(engine_exit_code),
            "stderr_tail": tail(stderr),
            "stdout_tail": tail(stdout),
        }
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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
    # Nie ein altes Ergebnis eines vorherigen Runs wiederverwenden.
    raw_output.unlink(missing_ok=True)

    timeout_seconds = 240 if mode == "quick" else 1200
    cmd = [
        sys.executable,
        str(ROOT / "universal_runtime.py"),
        query,
        "--mode", mode,
        "--output", str(raw_output),
    ]
    engine_rc = 0
    engine_stdout = ""
    engine_stderr = ""
    try:
        completed = subprocess.run(
            cmd,
            cwd=REPO,
            timeout=timeout_seconds,
            text=True,
            capture_output=True,
        )
        engine_rc = int(completed.returncode)
        engine_stdout = completed.stdout or ""
        engine_stderr = completed.stderr or ""
        # Der Runtime schreibt bei normalem Ende selbst sein JSON. Bei einem Python-Abbruch
        # gibt es dagegen keine Datei; dann die echte Fehlermeldung konservieren.
        if engine_rc != 0 and not raw_output.exists():
            write_fallback(
                raw_output,
                query,
                "engine_output_missing",
                "Der Research-Lauf ist vor dem Schreiben des Ergebnisses abgebrochen. Die technische Ursache wurde für die interne Diagnose gespeichert.",
                engine_exit_code=engine_rc,
                stderr=engine_stderr,
                stdout=engine_stdout,
            )
    except subprocess.TimeoutExpired as exc:
        engine_rc = 124
        engine_stdout = (exc.stdout or "") if isinstance(exc.stdout, str) else ""
        engine_stderr = (exc.stderr or "") if isinstance(exc.stderr, str) else ""
        write_fallback(
            raw_output,
            query,
            "engine_timeout",
            "Das Zeitbudget der Recherche wurde erreicht. Es wird kein vollständiges Ergebnis vorgetäuscht.",
            engine_exit_code=engine_rc,
            stderr=engine_stderr,
            stdout=engine_stdout,
        )
    except Exception as exc:
        engine_rc = 125
        engine_stderr = f"{type(exc).__name__}: {exc}"
        write_fallback(
            raw_output,
            query,
            "engine_runner_error",
            f"Der Research-Runner konnte nicht vollständig ausgeführt werden: {type(exc).__name__}",
            engine_exit_code=engine_rc,
            stderr=engine_stderr,
        )

    if not raw_output.exists():
        write_fallback(
            raw_output,
            query,
            "engine_output_missing",
            "Der Lauf wurde beendet, bevor ein Research-Ergebnis geschrieben werden konnte.",
            engine_exit_code=engine_rc,
            stderr=engine_stderr,
            stdout=engine_stdout,
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

    technical_error = None
    try:
        raw_data = json.loads(raw_output.read_text(encoding="utf-8"))
        technical_error = raw_data.get("technical_error")
    except Exception:
        pass

    status_payload = {
        "schema": "academy-research-run-status-v1",
        "request_id": request_id,
        "state": "completed",
        "mode": mode,
        "engine_exit_code": engine_rc,
        "started_at": started,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "result_path": str(result_path.relative_to(REPO)),
    }
    if technical_error:
        status_payload["technical_error"] = technical_error
    status_path.write_text(json.dumps(status_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

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
