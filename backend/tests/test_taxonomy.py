import logging
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

try:
    from ..taxonomy import Category, resolve_category, resolve, CATEGORY_DEFAULTS
    from ..category_router import get_contract
    from ..models import Planet
except ImportError:  # pragma: no cover - fallback for direct execution
    from taxonomy import Category, resolve_category, resolve, CATEGORY_DEFAULTS
    from category_router import get_contract
    from models import Planet


def test_resolve_category_warns_deprecated(caplog):
    with caplog.at_level(logging.WARNING):
        cat = resolve_category("education")
    assert cat is Category.EDUCATION
    assert "Legacy category string" in caplog.text


def test_get_contract_from_taxonomy():
    contract = get_contract(Category.EDUCATION)
    assert contract == {"examiner": Planet.SUN}


class DummyChart:
    def __init__(self):
        self.house_rulers = {
            1: Planet.SUN,
            2: Planet.MOON,
            3: Planet.MERCURY,
            4: Planet.VENUS,
            5: Planet.MARS,
            6: Planet.JUPITER,
            7: Planet.SATURN,
            8: Planet.SUN,
            9: Planet.MOON,
            10: Planet.MERCURY,
            11: Planet.VENUS,
            12: Planet.MARS,
        }


@pytest.mark.parametrize("category, defaults", CATEGORY_DEFAULTS.items())
def test_category_mapping(category, defaults):
    chart = DummyChart()
    result = resolve(chart, category)
    houses = defaults["houses"]
    assert result["querent_house"] == houses[0]
    expected_quesited = houses[1] if len(houses) > 1 else 7
    assert result["quesited_house"] == expected_quesited
    assert result["querent"] == chart.house_rulers[houses[0]]
    assert result["quesited"] == chart.house_rulers[expected_quesited]


def test_manual_houses_override():
    chart = DummyChart()
    result = resolve(chart, Category.MARRIAGE, manual_houses=[1, 5])
    assert result["querent_house"] == 1
    assert result["quesited_house"] == 5
    assert result["quesited"] == Planet.MARS


def test_shared_ruler_description():
    chart = DummyChart()
    chart.house_rulers[7] = chart.house_rulers[1]
    result = resolve(chart, Category.RELATIONSHIP, manual_houses=[1, 7])
    assert result["description"] == "Shared Significator: Sun rules both houses 1 and 7"
