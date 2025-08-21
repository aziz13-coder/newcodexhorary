import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

try:
    from horary_engine.engine import (
        EnhancedTraditionalHoraryJudgmentEngine,
    )
    from horary_engine.aspects import is_applying_enhanced
except ImportError:  # pragma: no cover
    from ..horary_engine.engine import (
        EnhancedTraditionalHoraryJudgmentEngine,
    )
    from ..horary_engine.aspects import is_applying_enhanced

try:
    from models import Planet, PlanetPosition, Sign, Aspect
except ImportError:  # pragma: no cover
    from ..models import Planet, PlanetPosition, Sign, Aspect


def make_pos(planet, lon, speed):
    sign_index = int(lon // 30)
    sign = list(Sign)[sign_index]
    return PlanetPosition(
        planet=planet,
        longitude=lon,
        latitude=0.0,
        house=1,
        sign=sign,
        dignity_score=0,
        speed=speed,
        retrograde=speed < 0,
    )


def test_moon_venus_conjunction_time_applying():
    calc = EnhancedTraditionalHoraryJudgmentEngine.__new__(
        EnhancedTraditionalHoraryJudgmentEngine
    )
    moon = make_pos(Planet.MOON, 113.5627, 13.2)
    venus = make_pos(Planet.VENUS, 113.8265, 0.6)

    t = calc._calculate_future_aspect_time(moon, venus, Aspect.CONJUNCTION, 0.0, 10)
    assert t is not None
    assert abs(t - 0.021) < 0.005
    assert is_applying_enhanced(moon, venus, Aspect.CONJUNCTION, 0.0)


def test_fast_behind_slow_positive_time():
    calc = EnhancedTraditionalHoraryJudgmentEngine.__new__(
        EnhancedTraditionalHoraryJudgmentEngine
    )
    fast = make_pos(Planet.MARS, 10.0, 1.5)
    slow = make_pos(Planet.JUPITER, 10.5, 0.5)

    t = calc._calculate_future_aspect_time(fast, slow, Aspect.CONJUNCTION, 0.0, 10)
    assert t > 0
