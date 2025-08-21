import json
import sys
from pathlib import Path
import datetime

import swisseph as swe

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

from horary_engine.engine import EnhancedTraditionalHoraryJudgmentEngine
from models import Planet, PlanetPosition, Sign, HoraryChart


def load_chart() -> HoraryChart:
    with open(ROOT / "will I win the lottery.json") as f:
        data = json.load(f)["chart_data"]

    tz_info = data["timezone_info"]
    dt_local = datetime.datetime.fromisoformat(tz_info["local_time"])
    dt_utc = datetime.datetime.fromisoformat(tz_info["utc_time"])
    lat = tz_info["coordinates"]["latitude"]
    lon = tz_info["coordinates"]["longitude"]

    planets = {}
    for name, p in data["planets"].items():
        planet_enum = Planet[name.upper()]
        sign_enum = Sign[p["sign"].upper()]
        planets[planet_enum] = PlanetPosition(
            planet=planet_enum,
            longitude=p["longitude"],
            latitude=p["latitude"],
            house=p["house"],
            sign=sign_enum,
            dignity_score=p["dignity_score"],
            retrograde=p["retrograde"],
            speed=p["speed"],
        )

    jd = swe.julday(
        dt_utc.year,
        dt_utc.month,
        dt_utc.day,
        dt_utc.hour + dt_utc.minute / 60.0 + dt_utc.second / 3600.0,
    )

    return HoraryChart(
        date_time=dt_local,
        date_time_utc=dt_utc,
        timezone_info=tz_info["timezone"],
        location=(lat, lon),
        location_name=tz_info["location_name"],
        planets=planets,
        aspects=[],
        houses=data["houses"],
        house_rulers={int(k): Planet[v.upper()] for k, v in data["house_rulers"].items()},
        ascendant=data["ascendant"],
        midheaven=data["midheaven"],
        solar_analyses=None,
        julian_day=jd,
        moon_last_aspect=None,
        moon_next_aspect=None,
    )


def test_voc_regression_false():
    chart = load_chart()
    engine = EnhancedTraditionalHoraryJudgmentEngine.__new__(
        EnhancedTraditionalHoraryJudgmentEngine
    )
    result = engine._void_traditional_ground_truth(chart)
    assert result["void"] is False

