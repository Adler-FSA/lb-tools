#!/usr/bin/env python3
"""Strukturierter Adapter für das offizielle kanadische FINTRAC-MSB-Register.

Wird nur triggerbasiert aktiviert. Sucht primär nach stabilen MSB-/Incorporation-
Nummern. FINTRAC selbst weist darauf hin, dass Registrierung keine Lizenz,
Empfehlung oder Billigung des Unternehmens darstellt.
"""
from __future__ import annotations

import csv
import io
import re
from datetime import datetime, timezone

import requests

CSV_URL = "https://fintrac-canafe.canada.ca/msb-esm/reg-eng.csv"
REGISTRY_URL = "https://fintrac-canafe.canada.ca/msb-esm/reg-eng"
UA = "Akademie-Research-Engine/1.0 (+https://www.liquiditybooster.de/)"
TIMEOUT = 20


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def compact(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", clean(value).upper())


def norm_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", clean(value).lower())


def _field(row: dict, *term_sets: tuple[str, ...]) -> str:
    for terms in term_sets:
        for key, value in row.items():
            nk = norm_header(key)
            if all(term in nk for term in terms):
                return clean(value)
    return ""


def _decode(content: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def fetch_rows() -> tuple[list[dict], dict]:
    meta = {"source_url": CSV_URL, "ok": False, "row_count": 0, "error": ""}
    try:
        response = requests.get(CSV_URL, headers={"User-Agent": UA, "Accept": "text/csv,*/*"}, timeout=TIMEOUT)
        response.raise_for_status()
        text = _decode(response.content)
        sample = text[:10000]
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        except csv.Error:
            dialect = csv.excel
        rows = [dict(row) for row in csv.DictReader(io.StringIO(text), dialect=dialect)]
        meta.update({"ok": True, "row_count": len(rows), "content_type": response.headers.get("content-type", "")})
        return rows, meta
    except Exception as exc:
        meta["error"] = type(exc).__name__
        return [], meta


def lookup_keys(data: dict) -> list[str]:
    operator = data.get("operator_registry_research") or {}
    ids = operator.get("identifier_research") or {}
    keys: list[str] = []
    for claim in ids.get("claims") or []:
        value = clean(claim.get("identifier") or "")
        c = compact(value)
        if len(c) >= 6 and c not in keys:
            keys.append(c)

    # Sicherheitsnetz: explizite MSB-Nummern aus Projektbelegen.
    analysis = data.get("analysis") or {}
    for finding in analysis.get("findings") or []:
        text = clean(finding.get("evidence") or "")
        for m in re.finditer(r"\bM\d{6,12}\b", text, re.I):
            c = compact(m.group(0))
            if c not in keys:
                keys.append(c)
    return keys[:24]


def _row_blob(row: dict) -> str:
    return " ".join(clean(v) for v in row.values() if clean(v))


def _organization_names(row: dict) -> str:
    return _field(row, ("organization", "name"), ("legal", "operating"), ("name",))


def _msb_number(row: dict) -> str:
    return _field(row, ("msb", "registration", "number"), ("registration", "number"))


def _incorporation_number(row: dict) -> str:
    return _field(row, ("incorporation", "number"), ("corporate", "number"), ("company", "number"))


def _status(row: dict) -> str:
    return _field(row, ("msb", "registration", "status"), ("registration", "status"), ("status",))


def _address(row: dict) -> str:
    return _field(row, ("business", "address"), ("address",))


def _website(row: dict) -> str:
    return _field(row, ("website",))


def _jurisdiction(row: dict) -> str:
    return _field(row, ("jurisdiction", "incorporation"), ("jurisdiction",))


def search_rows(rows: list[dict], keys: list[str]) -> list[dict]:
    out: list[dict] = []
    seen: set[tuple[str, str, str]] = set()
    wanted = set(keys)
    for row in rows:
        values = {compact(v) for v in row.values() if clean(v)}
        blob_compact = compact(_row_blob(row))
        matched = [key for key in wanted if key in values or key in blob_compact]
        if not matched:
            continue
        names = _organization_names(row)
        msb = _msb_number(row)
        incorp = _incorporation_number(row)
        status = _status(row)
        unique = (compact(msb), compact(incorp), compact(names))
        if unique in seen:
            continue
        seen.add(unique)
        out.append({
            "matched_identifiers": matched,
            "organization_names": names,
            "msb_registration_number": msb,
            "incorporation_number": incorp,
            "registration_status": status,
            "business_address": _address(row),
            "website": _website(row),
            "jurisdiction_of_incorporation": _jurisdiction(row),
            "source_url": CSV_URL,
            "source_role": "regulator",
            "fetched": True,
        })
    return out[:20]


def research(data: dict) -> dict:
    keys = lookup_keys(data)
    rows, fetch_meta = fetch_rows()
    matches = search_rows(rows, keys) if rows and keys else []
    return {
        "status": "ok" if matches else "no_match" if fetch_meta.get("ok") else "registry_unavailable",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "registry_url": REGISTRY_URL,
        "csv_url": CSV_URL,
        "lookup_keys": keys,
        "fetch": fetch_meta,
        "matches": matches,
        "scope_context": {
            "source_url": REGISTRY_URL,
            "source_role": "regulator",
            "title": "FINTRAC Money Services Business Registry – registration scope",
            "evidence": "FINTRAC states that registration does not indicate endorsement or licensing; it confirms only that legal registration requirements were satisfied.",
            "context_type": "registration_not_license_or_endorsement",
            "authority_confidence": "high",
        },
        "principle": "FINTRAC-Registrierung belegt den dort veröffentlichten Registerstatus. Sie ist keine Lizenz, Empfehlung oder Qualitätsbewertung des Unternehmens.",
    }
