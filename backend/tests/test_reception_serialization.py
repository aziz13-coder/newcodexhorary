import sys
from pathlib import Path
import datetime

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

# Use judgment engine to access structured reception serialization
from horary_engine.engine import EnhancedTraditionalHoraryJudgmentEngine
from models import Planet, Sign, PlanetPosition, HoraryChart


def _build_chart() -> HoraryChart:
    planets = {
        Planet.SUN: PlanetPosition(
            planet=Planet.SUN,
            longitude=0.0,
            latitude=0.0,
            house=1,
            sign=Sign.ARIES,
            dignity_score=0,
        ),
        Planet.VENUS: PlanetPosition(
            planet=Planet.VENUS,
            longitude=95.0,
            latitude=0.0,
            house=1,
            sign=Sign.CANCER,
            dignity_score=0,
        ),
        Planet.JUPITER: PlanetPosition(
            planet=Planet.JUPITER,
            longitude=10.0,
            latitude=0.0,
            house=1,
            sign=Sign.ARIES,
            dignity_score=0,
        ),
        Planet.MOON: PlanetPosition(
            planet=Planet.MOON,
            longitude=120.0,
            latitude=0.0,
            house=1,
            sign=Sign.LEO,
            dignity_score=0,
        ),
    }
    return HoraryChart(
        date_time=datetime.datetime(2024, 1, 1),
        date_time_utc=datetime.datetime(2024, 1, 1),
        timezone_info="UTC",
        location=(0.0, 0.0),
        location_name="Test",
        planets=planets,
        aspects=[],
        houses=[i * 30 for i in range(12)],
        house_rulers={},
        ascendant=0.0,
        midheaven=0.0,
    )


def test_serialized_receptions_include_expected_strings():
    engine = EnhancedTraditionalHoraryJudgmentEngine()
    chart = _build_chart()

    rec_jup_ven = engine._get_reception_for_structured_output(chart, Planet.JUPITER, Planet.VENUS)
    assert "Jupiter↦Venus(exaltation)" in rec_jup_ven["one_way"]

    rec_moon_ven = engine._get_reception_for_structured_output(chart, Planet.MOON, Planet.VENUS)
    assert "Moon↦Venus(sign)" in rec_moon_ven["one_way"]
