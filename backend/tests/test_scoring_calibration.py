import json
import datetime
from pathlib import Path
import sys

import swisseph as swe

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

from horary_engine.engine import EnhancedTraditionalHoraryJudgmentEngine
from question_analyzer import TraditionalHoraryQuestionAnalyzer
from horary_config import cfg
from models import (
    Planet,
    PlanetPosition,
    Sign,
    HoraryChart,
    Aspect,
    AspectInfo,
    SolarCondition,
    SolarAnalysis,
)


def _load_lottery_chart() -> HoraryChart:
    with open(ROOT / "will I win the lottery.json") as f:
        data = json.load(f)["chart_data"]

    tz_info = data["timezone_info"]
    dt_local = datetime.datetime.fromisoformat(tz_info["local_time"])
    dt_utc = datetime.datetime.fromisoformat(tz_info["utc_time"])
    lat = tz_info["coordinates"]["latitude"]
    lon = tz_info["coordinates"]["longitude"]

    planets = {}
    solar_analyses = {}
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
        sc = p.get("solar_condition")
        if sc:
            cond_name = sc["condition"].replace(" ", "_").upper()
            if cond_name == "FREE_OF_SUN":
                cond_name = "FREE"
            cond = SolarCondition[cond_name]
            solar_analyses[planet_enum] = SolarAnalysis(
                planet=planet_enum,
                distance_from_sun=sc["distance_from_sun"],
                condition=cond,
                exact_cazimi=sc.get("exact_cazimi", False),
                traditional_exception=sc.get("traditional_exception", False),
            )

    aspects = []
    for a in data["aspects"]:
        aspects.append(
            AspectInfo(
                planet1=Planet[a["planet1"].upper()],
                planet2=Planet[a["planet2"].upper()],
                aspect=Aspect[a["aspect"].upper()],
                orb=a["orb"],
                applying=a["applying"],
                degrees_to_exact=a["degrees_to_exact"],
            )
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
        aspects=aspects,
        houses=data["houses"],
        house_rulers={int(k): Planet[v.upper()] for k, v in data["house_rulers"].items()},
        ascendant=data["ascendant"],
        midheaven=data["midheaven"],
        solar_analyses=solar_analyses,
        julian_day=jd,
        moon_last_aspect=None,
        moon_next_aspect=None,
    )


def test_lottery_chart_low_confidence():
    chart = _load_lottery_chart()
    analyzer = TraditionalHoraryQuestionAnalyzer()
    q_analysis = analyzer.analyze_question("will I win the lottery?")
    engine = EnhancedTraditionalHoraryJudgmentEngine()
    result = engine._apply_enhanced_judgment(chart, q_analysis, window_days=90)
    assert result["confidence"] <= 60
