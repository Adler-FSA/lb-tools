#!/usr/bin/env python3
"""Triggerbasierte Registeradapter für die Universal Research Engine.

Spezielle Jurisdiktionen dürfen nur aktiviert werden, wenn im Projektmaterial
oder in der generischen Fremdrecherche ein entsprechender Hinweis auftaucht.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class RegistryAdapter:
    adapter_id: str
    label: str
    trigger_terms: tuple[str, ...]
    trigger_hosts: tuple[str, ...]
    direct_probe_urls: tuple[str, ...]


ADAPTERS = (
    RegistryAdapter(
        adapter_id="mwali_misa",
        label="Mwali / MISA",
        trigger_terms=(
            "mwali international services authority",
            "m.i.s.a",
            "misa",
            "mohéli",
            "moheli",
            "mwali",
        ),
        trigger_hosts=(
            "mwaliregistrar.info",
            "mwaliregistrar.net",
            "mwaliregistrar.com",
        ),
        direct_probe_urls=(
            "https://mwaliregistrar.info/list_of_entities.html",
        ),
    ),
)


def _haystack(data: dict) -> str:
    return json.dumps(data or {}, ensure_ascii=False, sort_keys=True).lower()


def _term_present(hay: str, term: str) -> bool:
    """Kurze Trigger nur als eigenes Wort/Phrase, nie als Teil eines Fremdworts."""
    term = (term or "").strip().lower()
    if not term:
        return False
    pattern = rf"(?<![\w]){re.escape(term)}(?![\w])"
    return bool(re.search(pattern, hay, re.I))


def _host_present(hay: str, host: str) -> bool:
    host = (host or "").strip().lower()
    if not host:
        return False
    return host in hay


def select_adapter_ids(data: dict) -> list[str]:
    hay = _haystack(data)
    selected = []
    for adapter in ADAPTERS:
        term_hit = any(_term_present(hay, term) for term in adapter.trigger_terms)
        host_hit = any(_host_present(hay, host) for host in adapter.trigger_hosts)
        if term_hit or host_hit:
            selected.append(adapter.adapter_id)
    return selected


def probe_urls(adapter_ids: list[str]) -> list[str]:
    wanted = set(adapter_ids or [])
    urls = []
    for adapter in ADAPTERS:
        if adapter.adapter_id not in wanted:
            continue
        for url in adapter.direct_probe_urls:
            if url not in urls:
                urls.append(url)
    return urls


def describe(adapter_ids: list[str]) -> list[dict]:
    wanted = set(adapter_ids or [])
    return [
        {"id": a.adapter_id, "label": a.label, "direct_probe_urls": list(a.direct_probe_urls)}
        for a in ADAPTERS if a.adapter_id in wanted
    ]
