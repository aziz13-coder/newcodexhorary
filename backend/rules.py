from typing import Dict, List, Optional, Union

def dynamic_weight() -> float:
    """Example weight function used by some rules.

    In real usage this could compute a weight based on
    external configuration or runtime context. For the
    test suite we simply return a deterministic value.
    """
    return 2.5


# Rules use a common schema where each rule must provide either a
# numeric ``weight`` or a callable name via ``weight_fn``.  Rules are
# also grouped into tiers that control evaluation priority in
# ``rule_engine.evaluate_rules``.
RuleDict = Dict[str, Union[str, float]]

RULES: List[RuleDict] = [
    {"id": "V1", "tier": "validity_gates", "description": "Early Ascendant", "weight": 1.0},
    {"id": "V2", "tier": "validity_gates", "description": "Late Ascendant", "weight": 1.0},
    {"id": "H1", "tier": "hard_stoppers", "description": "Saturn in 7th", "weight": 1.0},
    {"id": "H2", "tier": "hard_stoppers", "description": "Void of Course", "weight": 1.0},
    {"id": "P1", "tier": "perfection", "description": "Direct perfection", "weight": 1.0},
    {
        "id": "P2",
        "tier": "perfection",
        "description": "Translation of light",
        "weight_fn": "dynamic_weight",
    },
    {"id": "S1", "tier": "special_topics", "description": "Education overrides", "weight": 1.0},
    {"id": "S2", "tier": "special_topics", "description": "Medical exceptions", "weight": 1.0},
    {"id": "M1", "tier": "moon", "description": "Moon trine Sun", "weight": 1.0},
    {"id": "M2", "tier": "moon", "description": "Moon square Saturn", "weight": 1.0},
    {"id": "MOD1", "tier": "modifiers", "description": "Reception boost", "weight": 1.0},
    {"id": "MOD2", "tier": "modifiers", "description": "Debility penalty", "weight": 1.0},
    {"id": "MOD3", "tier": "modifiers", "description": "Retrograde penalty", "weight": 1.0},
    {"id": "T1", "tier": "thresholds", "description": "Dignity threshold", "weight": 1.0},
    {"id": "T2", "tier": "thresholds", "description": "Speed threshold", "weight": 1.0},
]
