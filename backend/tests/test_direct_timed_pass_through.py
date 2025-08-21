import datetime

import pytest

from backend.horary_engine.engine import EnhancedTraditionalHoraryJudgmentEngine
from models import HoraryChart, PlanetPosition, Planet, Sign


def _build_simple_chart():
    now = datetime.datetime.utcnow()
    planets = {
        Planet.VENUS: PlanetPosition(
            planet=Planet.VENUS,
            longitude=0.0,
            latitude=0.0,
            house=1,
            sign=Sign.ARIES,
            dignity_score=0,
            speed=1.0,
        ),
        Planet.JUPITER: PlanetPosition(
            planet=Planet.JUPITER,
            longitude=3.0,
            latitude=0.0,
            house=7,
            sign=Sign.ARIES,
            dignity_score=0,
            speed=0.5,
        ),
    }
    return HoraryChart(
        date_time=now,
        date_time_utc=now,
        timezone_info="UTC",
        location=(0.0, 0.0),
        location_name="Test",
        planets=planets,
        aspects=[],
        houses=[0.0] * 12,
        house_rulers={},
        ascendant=0.0,
        midheaven=0.0,
        julian_day=0.0,
    )


def test_passes_prohibition_details(monkeypatch):
    chart = _build_simple_chart()
    engine = EnhancedTraditionalHoraryJudgmentEngine()
    monkeypatch.setattr(
        engine, "_calculate_future_aspect_time", lambda *args, **kwargs: 5
    )
    monkeypatch.setattr(
        engine,
        "_check_future_prohibitions",
        lambda *args, **kwargs: {
            "prohibited": True,
            "type": "prohibition",
            "prohibitor": Planet.SATURN,
            "significator": Planet.VENUS,
            "reason": "Saturn blocks Venus",
        },
    )
    res = engine._check_direct_timed_perfection(chart, Planet.VENUS, Planet.JUPITER, 10)
    assert res["perfects"] is False
    assert res["type"] == "prohibition"
    assert res["prohibitor"] == Planet.SATURN
    assert res["significator"] == Planet.VENUS


def test_passes_translation_details(monkeypatch):
    chart = _build_simple_chart()
    engine = EnhancedTraditionalHoraryJudgmentEngine()
    monkeypatch.setattr(
        engine, "_calculate_future_aspect_time", lambda *args, **kwargs: 5
    )
    monkeypatch.setattr(
        engine,
        "_check_future_prohibitions",
        lambda *args, **kwargs: {
            "prohibited": False,
            "type": "translation",
            "translator": Planet.MERCURY,
            "t_event": 2,
            "reason": "Mercury translates light",
        },
    )
    res = engine._check_direct_timed_perfection(chart, Planet.VENUS, Planet.JUPITER, 10)
    assert res["perfects"] is True
    assert res["type"] == "translation"
    assert res["translator"] == Planet.MERCURY


def test_passes_collection_details(monkeypatch):
    chart = _build_simple_chart()
    engine = EnhancedTraditionalHoraryJudgmentEngine()
    monkeypatch.setattr(
        engine, "_calculate_future_aspect_time", lambda *args, **kwargs: 5
    )
    monkeypatch.setattr(
        engine,
        "_check_future_prohibitions",
        lambda *args, **kwargs: {
            "prohibited": False,
            "type": "collection",
            "collector": Planet.SATURN,
            "t_event": 2,
            "reason": "Saturn collects light",
        },
    )
    res = engine._check_direct_timed_perfection(chart, Planet.VENUS, Planet.JUPITER, 10)
    assert res["perfects"] is True
    assert res["type"] == "collection"
    assert res["collector"] == Planet.SATURN
