from typing import Any, Dict, List

from rule_engine import RULES, get_rule_weight


def dump_rules() -> List[Dict[str, Any]]:
    """Return a list of loaded rules with numeric weights."""
    return RULES


def apply_rule(rule_id: str, value: float) -> float:
    """Apply a rule's weight to a value."""
    return value * get_rule_weight(rule_id)
