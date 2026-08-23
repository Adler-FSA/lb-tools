#!/usr/bin/env python3
"""Kanonischer Universal-Runtime fuer SchnellCheck und Deep Research.

Die bewährte Universal-Pipeline wird verwendet, aber Deep-Research-Ausgaben
laufen durch die universellen Akademie- und 16-Punkte-Schichten. Quick bleibt
bewusst schlank.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


pipeline = load_module("universal_pipeline_runtime_base", "universal_pipeline.py")
academy = load_module("universal_runtime_academy", "universal_academy_analysis.py")
sixteen = load_module("universal_runtime_sixteen", "universal_sixteen_analysis.py")

# Nur die Deep-Ausgabeschichten werden ersetzt. Routing, Identifikation,
# Quick-Budget und Register-/Personenmodule bleiben dieselben.
pipeline.academy = academy
pipeline.sixteen = sixteen

run = pipeline.run
slugify = pipeline.slugify


def main() -> int:
    return pipeline.main()


if __name__ == "__main__":
    raise SystemExit(main())
