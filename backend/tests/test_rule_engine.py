import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

from rule_engine import evaluate_rules, get_rule_weight, apply_rule


def test_rule_sequencing():
    candidates = ["V1", "H1", "P1", "M1", "MOD2", "T1"]
    assert evaluate_rules(candidates) == ["V1", "H1", "P1", "M1", "MOD2", "T1"]


def test_weight_application():
    assert get_rule_weight("H1") == -3.0
    assert apply_rule("P1", 5.0) == 10.0
