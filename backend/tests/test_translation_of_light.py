import sys
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

from horary_engine.calculation.helpers import check_aspect_separation_order


def test_separating_orb_uses_relative_speed():
    # Planet C is ahead and moving faster than A -> separating
    res = check_aspect_separation_order(10.0, 1.0, 12.0, 3.0, 0.0, 0.0)
    assert res["is_separating"] is True
    assert res["orb_rate"] > 0
    assert res["current_orb"] == pytest.approx(2.0)


def test_applying_when_a_catches_up():
    # Planet C is ahead but slower than A -> applying
    res = check_aspect_separation_order(10.0, 3.0, 12.0, 1.0, 0.0, 0.0)
    assert res["is_separating"] is False
    assert res["orb_rate"] < 0


def test_handles_extremely_slow_motion():
    # Very slow relative motion still yields correct sign
    res = check_aspect_separation_order(0.0, 0.0, 0.1, 0.001, 0.0, 0.0)
    assert res["is_separating"] is True
    assert res["orb_rate"] > 0
