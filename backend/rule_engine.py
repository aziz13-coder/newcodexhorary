"""Rule evaluation utilities implementing tiered priority with first-hit wins."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Iterable, List

import yaml


# Default rule pack selection
RULE_PACK = "lilly_general_v1"


def load_rules(pack: str = RULE_PACK) -> List[Dict[str, Any]]:
    """Load rule definitions from a YAML rule pack."""
    path = Path(__file__).with_name(f"rules_{pack}.yaml")
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data.get("rules", [])


# Loaded rule set used throughout the module
RULES = load_rules()

# Fixed priority order for rule tiers
PRIORITY_TIERS = [
    "validity_gates",
    "hard_stoppers",
    "perfection",
    "special_topics",
    "moon",
    "modifiers",
    "thresholds",
]


def evaluate_rules(candidate_ids: Iterable[str]) -> List[str]:
    """Return rule IDs selected according to priority tiers with config gating.

    Parameters
    ----------
    candidate_ids: Iterable[str]
        Iterable of rule IDs that evaluate to true.

    Returns
    -------
    List[str]
        Ordered list of chosen rule IDs, at most one per tier.
    """
    from horary_config import cfg
    config = cfg()
    
    candidates = set(candidate_ids)
    selected: List[str] = []
    for tier in PRIORITY_TIERS:
        tier_rules = sorted(
            (r for r in RULES if r.get("tier") == tier),
            key=lambda r: r["id"],
        )
        for rule in tier_rules:
            if rule["id"] in candidates:
                # Gate void moon rule on configuration
                if rule["id"] == "H2" and not getattr(config.moon, "void_gating", False):
                    continue  # Skip void moon if gating is disabled
                selected.append(rule["id"])
                break  # first-hit wins within tier
    return selected


def get_rule_weight(rule_id: str) -> float:
    """Return the numeric weight for a rule ID."""
    for rule in RULES:
        if rule.get("id") == rule_id:
            weight = rule.get("weight")
            if isinstance(weight, (int, float)):
                return float(weight)
            raise ValueError(f"Rule '{rule_id}' lacks a numeric weight")
    raise KeyError(f"Unknown rule id: {rule_id}")


def apply_rule(rule_id: str, value: float) -> float:
    """Apply a rule's weight to a value."""
    return value * get_rule_weight(rule_id)
