from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

from horary_engine.polarity_weights import TestimonyKey
from horary_engine.aggregator import aggregate
from rule_engine import get_rule_weight


def test_essential_detriment_penalty():
    score, ledger = aggregate([TestimonyKey.ESSENTIAL_DETRIMENT])
    expected = get_rule_weight("MOD2")
    assert score == expected
    assert ledger[0]["delta_no"] == abs(expected)


def test_accidental_retrograde_penalty():
    score, ledger = aggregate([TestimonyKey.ACCIDENTAL_RETROGRADE])
    expected = get_rule_weight("MOD3")
    assert score == expected
    assert ledger[0]["delta_no"] == abs(expected)
