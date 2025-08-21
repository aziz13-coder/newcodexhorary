import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

try:
    from ..horary_engine.aspects import calculate_moon_next_aspect
except ImportError:  # pragma: no cover - fallback for direct execution
    from horary_engine.aspects import calculate_moon_next_aspect

try:
    from ..models import Planet, PlanetPosition, Sign
except ImportError:  # pragma: no cover - fallback for direct execution
    from models import Planet, PlanetPosition, Sign


def test_cross_sign_perfection_disallowed():
    planets = {
        Planet.MOON: PlanetPosition(
            planet=Planet.MOON,
            longitude=29.0,
            latitude=0.0,
            house=1,
            sign=Sign.ARIES,
            dignity_score=0,
            speed=13.0,
        ),
        Planet.SUN: PlanetPosition(
            planet=Planet.SUN,
            longitude=31.0,
            latitude=0.0,
            house=1,
            sign=Sign.TAURUS,
            dignity_score=0,
            speed=1.0,
        ),
    }

    aspect = calculate_moon_next_aspect(planets, jd_ut=0.0, get_moon_speed=lambda _: 13.0)
    assert aspect is None

