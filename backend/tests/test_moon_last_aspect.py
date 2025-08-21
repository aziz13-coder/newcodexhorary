import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

try:  # pragma: no cover
    from horary_engine.aspects import calculate_moon_last_aspect
    from models import Planet, PlanetPosition, Sign
except ImportError:  # pragma: no cover
    from ..horary_engine.aspects import calculate_moon_last_aspect
    from ..models import Planet, PlanetPosition, Sign


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


def test_fast_planet_separation_uses_relative_speed():
    moon = make_pos(Planet.MOON, 20.0, 13.0)
    mercury = make_pos(Planet.MERCURY, 10.0, 12.0)
    planets = {Planet.MOON: moon, Planet.MERCURY: mercury}

    aspect = calculate_moon_last_aspect(planets, 0.0, lambda jd: moon.speed)
    assert aspect is not None
    assert aspect.planet == Planet.MERCURY
    # Separation is 10 degrees; relative speed 1 degree/day -> 10 days
    assert abs(aspect.perfection_eta_days - 10.0) < 1e-6


def test_equal_speed_returns_none():
    moon = make_pos(Planet.MOON, 20.0, 13.0)
    mercury = make_pos(Planet.MERCURY, 10.0, 13.0)
    planets = {Planet.MOON: moon, Planet.MERCURY: mercury}

    aspect = calculate_moon_last_aspect(planets, 0.0, lambda jd: moon.speed)
    assert aspect is None
