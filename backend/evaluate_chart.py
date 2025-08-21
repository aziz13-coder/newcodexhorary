"""Evaluation pipeline orchestrating testimony extraction and aggregation."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional
import os
from pathlib import Path
import sys

# Ensure repository root on path when executed directly
sys.path.append(str(Path(__file__).resolve().parents[1]))

from horary_config import cfg

from category_router import get_contract
from horary_engine.engine import extract_testimonies
from horary_engine.rationale import build_rationale
from horary_engine.utils import token_to_string

logger = logging.getLogger(__name__)


def evaluate_chart(
    chart: Dict[str, Any], use_dsl: Optional[bool] = None
) -> Dict[str, Any]:
    """Evaluate a horary chart and return verdict with diagnostics.

    The function performs the following steps:

    1. Resolve the category contract (e.g., Sun as examiner for education).
    2. Extract normalized testimony tokens from the chart.
    3. Aggregate testimonies into a numeric score and contribution ledger.
    4. Build a human readable rationale from the ledger.

    Args:
        chart: Parsed chart information.
        use_dsl: Optional override for the aggregation engine. If ``None`` the
            value is sourced from the ``HORARY_USE_DSL`` environment variable or
            ``aggregator.use_dsl`` setting. This makes it easy for API callers to
            supply a query or header flag without editing config files.
    """
    contract = get_contract(chart.get("category", ""))
    testimonies = extract_testimonies(chart, contract)

    if use_dsl is None:
        env_override = os.getenv("HORARY_USE_DSL")
        if env_override is not None:
            use_dsl = env_override.lower() in {"1", "true", "yes"}
        else:
            use_dsl = cfg().get("aggregator.use_dsl", False)

    if use_dsl:
        from horary_engine.dsl import (
            L1,
            L10,
            L3,
            LQ,
            Moon,
            role_importance,
        )
        from horary_engine.solar_aggregator import aggregate as aggregator_fn

        testimonies = [
            role_importance(L1, 1.0),
            role_importance(LQ, 1.0),
            role_importance(Moon, 0.7),
            role_importance(L10, 1.0),
            role_importance(L3, 1.0),
            *testimonies,
        ]
    else:
        from horary_engine.aggregator import aggregate as aggregator_fn

    score, ledger = aggregator_fn(testimonies)
    # Surface ledger details for downstream inspection and debugging
    logger.info(
        "Contribution ledger: %s",
        [
            {**entry, "key": token_to_string(entry.get("key"))}
            for entry in ledger
        ],
    )
    rationale = build_rationale(ledger)
    verdict = "YES" if score > 0 else "NO"
    return {"verdict": verdict, "ledger": ledger, "rationale": rationale}


if __name__ == "__main__":
    """Allow command-line evaluation of charts.

    When executed directly, the module accepts an optional path to a chart JSON
    file. If no path is provided, it defaults to the AE-015 sample chart.
    The resulting ledger is printed for inspection.
    """
    import argparse
    import json
    from pathlib import Path

    default_chart = Path(__file__).resolve().parent / (
        "e AE-015 – “Will I pass my physiotherapy exam.json"
    )
    parser = argparse.ArgumentParser(description="Evaluate a horary chart")
    parser.add_argument(
        "chart_path",
        nargs="?",
        default=str(default_chart),
        help="Path to chart JSON file",
    )
    args = parser.parse_args()

    chart_data = json.loads(Path(args.chart_path).read_text(encoding="utf-8"))
    result = evaluate_chart(chart_data)
    print(json.dumps(result["ledger"], indent=2))
