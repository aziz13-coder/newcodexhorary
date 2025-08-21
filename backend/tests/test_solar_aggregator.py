from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

from horary_engine.dsl import role_importance, Moon, L1, L10
from horary_engine.polarity_weights import TestimonyKey
from horary_engine.solar_aggregator import aggregate as solar_aggregate
from horary_engine.aggregator import aggregate as legacy_aggregate


def test_role_importance_scales_weights():
    testimonies = [
        role_importance(Moon, 0.7),
        TestimonyKey.MOON_APPLYING_TRINE_EXAMINER_SUN,
    ]
    score, ledger = solar_aggregate(testimonies)
    assert score == 0.7
    assert ledger[0]["weight"] == 0.7


def test_legacy_and_solar_equal_without_importance():
    tokens = [TestimonyKey.MOON_APPLYING_TRINE_EXAMINER_SUN]
    score_legacy, _ = legacy_aggregate(tokens)
    score_solar, _ = solar_aggregate(tokens)
    assert score_legacy == score_solar


def test_solar_scales_relative_to_legacy():
    tokens = [TestimonyKey.MOON_APPLYING_TRINE_EXAMINER_SUN]
    score_legacy, _ = legacy_aggregate(tokens)
    score_solar, _ = solar_aggregate([
        role_importance(Moon, 0.5),
        TestimonyKey.MOON_APPLYING_TRINE_EXAMINER_SUN,
    ])
    assert score_solar == score_legacy * 0.5


def test_role_matching_uses_delimiters():
    testimonies = [
        role_importance(L1, 0.5),
        role_importance(L10, 2.0),
        TestimonyKey.L10_FORTUNATE,
    ]
    score, ledger = solar_aggregate(testimonies)
    assert score == 2.0
    assert ledger[0]["weight"] == 2.0
