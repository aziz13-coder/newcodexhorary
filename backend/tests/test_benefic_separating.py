import datetime
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

from horary_engine.engine import EnhancedTraditionalHoraryJudgmentEngine
from models import Planet, PlanetPosition, Sign, Aspect, AspectInfo, HoraryChart


def _make_chart_with_separating_aspects() -> HoraryChart:
    now = datetime.datetime.utcnow()
    planets = {
        Planet.JUPITER: PlanetPosition(Planet.JUPITER, 0.0, 0.0, 1, Sign.ARIES, 0),
        Planet.VENUS: PlanetPosition(Planet.VENUS, 0.0, 0.0, 1, Sign.ARIES, 0),
        Planet.MARS: PlanetPosition(Planet.MARS, 0.0, 0.0, 1, Sign.ARIES, 0),
        Planet.MERCURY: PlanetPosition(Planet.MERCURY, 0.0, 0.0, 1, Sign.ARIES, 0),
    }
    aspects = [
        AspectInfo(planet1=Planet.JUPITER, planet2=Planet.MARS, aspect=Aspect.TRINE,
                   orb=1.0, applying=False, degrees_to_exact=2.0),
        AspectInfo(planet1=Planet.VENUS, planet2=Planet.MERCURY, aspect=Aspect.SEXTILE,
                   orb=1.0, applying=False, degrees_to_exact=2.0),
    ]
    return HoraryChart(
        date_time=now,
        date_time_utc=now,
        timezone_info="UTC",
        location=(0.0, 0.0),
        location_name="Nowhere",
        planets=planets,
        aspects=aspects,
        houses=[0.0] * 12,
        house_rulers={1: Planet.MARS, 7: Planet.MERCURY},
        ascendant=0.0,
        midheaven=0.0,
        solar_analyses={},
        julian_day=0.0,
        moon_last_aspect=None,
        moon_next_aspect=None,
    )


def test_separating_trine_sextile_do_not_support():
    chart = _make_chart_with_separating_aspects()
    engine = EnhancedTraditionalHoraryJudgmentEngine()
    res = engine._check_benefic_aspects_to_significators(chart, Planet.MARS, Planet.MERCURY)
    assert res["total_score"] == 0
    assert res["aspects"] == []
    assert "separating" in res["reason"].lower()
