"""Aspect-related calculations for the horary engine."""

from __future__ import annotations

import datetime
from typing import Callable, Dict, List, Optional, Tuple

import swisseph as swe

from horary_config import cfg
try:
    from ..models import Aspect, AspectInfo, LunarAspect, Planet, PlanetPosition
except ImportError:  # pragma: no cover - fallback when executed as script
    from models import Aspect, AspectInfo, LunarAspect, Planet, PlanetPosition
from .calculation.helpers import days_to_sign_exit


def calculate_moon_last_aspect(
    planets: Dict[Planet, PlanetPosition],
    jd_ut: float,
    get_moon_speed: Callable[[float], float],
) -> Optional[LunarAspect]:
    """Calculate Moon's last separating aspect"""

    moon_pos = planets[Planet.MOON]
    moon_speed = get_moon_speed(jd_ut)

    # Look back to find most recent separating aspect
    separating_aspects: List[LunarAspect] = []

    for planet, planet_pos in planets.items():
        if planet == Planet.MOON:
            continue

        # Calculate current separation
        separation = abs(moon_pos.longitude - planet_pos.longitude)
        if separation > 180:
            separation = 360 - separation

        # Check each aspect type
        for aspect_type in Aspect:
            orb_diff = abs(separation - aspect_type.degrees)
            max_orb = aspect_type.orb

            # Wider orb for recently separating
            if orb_diff <= max_orb * 1.5:
                # Check if separating (Moon was closer recently)
                if is_moon_separating_from_aspect(
                    moon_pos, planet_pos, aspect_type, moon_speed
                ):
                    degrees_since_exact = orb_diff
                    relative_speed = moon_speed - planet_pos.speed
                    time_since_exact = (
                        degrees_since_exact / abs(relative_speed)
                        if relative_speed != 0
                        else float("inf")
                    )

                    separating_aspects.append(
                        LunarAspect(
                            planet=planet,
                            aspect=aspect_type,
                            orb=orb_diff,
                            degrees_difference=degrees_since_exact,
                            perfection_eta_days=time_since_exact,
                            perfection_eta_description=f"{time_since_exact:.1f} days ago",
                            applying=False,
                        )
                    )

    # Return most recent (smallest time_since_exact)
    if separating_aspects:
        return min(separating_aspects, key=lambda x: x.perfection_eta_days)

    return None


def calculate_moon_next_aspect(
    planets: Dict[Planet, PlanetPosition],
    jd_ut: float,
    get_moon_speed: Callable[[float], float],
) -> Optional[LunarAspect]:
    """Calculate Moon's next applying aspect.

    Cross-sign perfection is disallowed; aspects must perfect before the Moon
    changes signs.
    """

    moon_pos = planets[Planet.MOON]
    moon_speed = get_moon_speed(jd_ut)
    moon_days_to_exit = days_to_sign_exit(moon_pos.longitude, moon_speed)

    # Find closest applying aspect
    applying_aspects: List[LunarAspect] = []

    for planet, planet_pos in planets.items():
        if planet == Planet.MOON:
            continue

        # Calculate current separation
        separation = abs(moon_pos.longitude - planet_pos.longitude)
        if separation > 180:
            separation = 360 - separation

        # Check each aspect type
        for aspect_type in Aspect:
            orb_diff = abs(separation - aspect_type.degrees)
            max_orb = aspect_type.orb

            if orb_diff <= max_orb:
                if is_moon_applying_to_aspect(
                    moon_pos, planet_pos, aspect_type, moon_speed
                ):
                    degrees_to_exact = orb_diff
                    relative_speed = moon_speed - planet_pos.speed
                    time_to_exact = (
                        degrees_to_exact / abs(relative_speed)
                        if relative_speed != 0
                        else float("inf")
                    )

                    # Skip aspects that perfect after Moon leaves its current sign
                    if (
                        moon_days_to_exit is not None
                        and time_to_exact > moon_days_to_exit
                    ):
                        continue

                    applying_aspects.append(
                        LunarAspect(
                            planet=planet,
                            aspect=aspect_type,
                            orb=orb_diff,
                            degrees_difference=degrees_to_exact,
                            perfection_eta_days=time_to_exact,
                            perfection_eta_description=format_timing_description(
                                time_to_exact
                            ),
                            applying=True,
                        )
                    )

    # Return soonest (smallest time_to_exact)
    if applying_aspects:
        return min(applying_aspects, key=lambda x: x.perfection_eta_days)

    return None


def _moon_orb_motion(
    moon_pos: PlanetPosition,
    planet_pos: PlanetPosition,
    aspect: Aspect,
    moon_speed: float,
) -> float:
    """Return the signed rate of change of the orb between the Moon and a planet.

    Positive values mean the orb is widening (separating), negative values mean
    the orb is narrowing (applying).
    """

    # Signed difference from exact aspect in range [-180, 180)
    diff = (moon_pos.longitude - planet_pos.longitude - aspect.degrees + 180) % 360 - 180

    # Relative speed between the Moon and the other planet
    relative_speed = moon_speed - planet_pos.speed

    return diff * relative_speed


def is_moon_separating_from_aspect(
    moon_pos: PlanetPosition,
    planet_pos: PlanetPosition,
    aspect: Aspect,
    moon_speed: float,
) -> bool:
    """Check if the Moon is separating from an aspect using analytic motion."""

    return _moon_orb_motion(moon_pos, planet_pos, aspect, moon_speed) > 0


def is_moon_applying_to_aspect(
    moon_pos: PlanetPosition,
    planet_pos: PlanetPosition,
    aspect: Aspect,
    moon_speed: float,
) -> bool:
    """Check if the Moon is applying to an aspect using analytic motion."""

    return _moon_orb_motion(moon_pos, planet_pos, aspect, moon_speed) < 0


def format_timing_description(days: float) -> str:
    """Format timing description for aspect perfection"""
    if days < 0.5:
        return "Within hours"
    if days < 1:
        return "Within a day"
    if days < 7:
        return f"Within {int(days)} days"
    if days < 30:
        return f"Within {int(days/7)} weeks"
    if days < 365:
        return f"Within {int(days/30)} months"
    return "More than a year"


def calculate_enhanced_aspects(
    planets: Dict[Planet, PlanetPosition], jd_ut: float
) -> List[AspectInfo]:
    """Enhanced aspect calculation with configuration"""
    aspects: List[AspectInfo] = []
    planet_list = list(planets.keys())
    config = cfg()

    for i, planet1 in enumerate(planet_list):
        for planet2 in planet_list[i + 1 :]:
            pos1 = planets[planet1]
            pos2 = planets[planet2]

            # Calculate angular separation
            angle_diff = abs(pos1.longitude - pos2.longitude)
            if angle_diff > 180:
                angle_diff = 360 - angle_diff

            # Check each traditional aspect
            for aspect_type in Aspect:
                orb_diff = abs(angle_diff - aspect_type.degrees)

                # ENHANCED: Traditional moiety-based orb calculation
                max_orb = calculate_moiety_based_orb(
                    planet1, planet2, aspect_type, config
                )

                # Fallback to configured orbs if moiety system disabled
                if max_orb == 0:
                    max_orb = aspect_type.orb
                    # Luminary bonuses (legacy)
                    if Planet.SUN in [planet1, planet2]:
                        max_orb += config.orbs.sun_orb_bonus
                    if Planet.MOON in [planet1, planet2]:
                        max_orb += config.orbs.moon_orb_bonus

                if orb_diff <= max_orb:
                    # Determine if applying
                    applying = is_applying_enhanced(pos1, pos2, aspect_type, jd_ut)

                    # Calculate degrees to exact and timing
                    degrees_to_exact, exact_time = calculate_enhanced_degrees_to_exact(
                        pos1, pos2, aspect_type, jd_ut
                    )

                    aspects.append(
                        AspectInfo(
                            planet1=planet1,
                            planet2=planet2,
                            aspect=aspect_type,
                            orb=orb_diff,
                            applying=applying,
                            exact_time=exact_time,
                            degrees_to_exact=degrees_to_exact,
                        )
                    )
                    break

    return aspects


def calculate_moiety_based_orb(
    planet1: Planet, planet2: Planet, aspect_type: Aspect, config
) -> float:
    """Calculate traditional moiety-based orb for two planets (ENHANCED)"""

    if not hasattr(config.orbs, "moieties"):
        return 0  # Fallback to legacy system

    # Get planetary moieties
    moiety1 = getattr(config.orbs.moieties, planet1.value, 8.0)  # Default 8.0 if not found
    moiety2 = getattr(config.orbs.moieties, planet2.value, 8.0)

    # Combined moiety orb
    combined_moiety = moiety1 + moiety2

    # Traditional aspect-specific adjustments
    if aspect_type in [Aspect.CONJUNCTION, Aspect.OPPOSITION]:
        # Conjunction and opposition get full combined moieties
        return combined_moiety
    if aspect_type in [Aspect.TRINE, Aspect.SQUARE]:
        # Squares and trines get slightly reduced orbs
        return combined_moiety * 0.85
    if aspect_type == Aspect.SEXTILE:
        # Sextiles get more restrictive orbs
        return combined_moiety * 0.7
    return combined_moiety * 0.8  # Other aspects


def is_applying_enhanced(
    pos1: PlanetPosition, pos2: PlanetPosition, aspect: Aspect, jd_ut: float
) -> bool:
    """Determine if planets are applying to a given aspect analytically."""

    # Signed difference from exact aspect in range [-180, 180)
    diff = (pos1.longitude - pos2.longitude - aspect.degrees + 180) % 360 - 180
    current_orb = abs(diff)

    # Check sign exit conditions (preserve traditional horary rules)
    if not _will_perfect_before_sign_exit(pos1, pos2, aspect, current_orb):
        return False

    relative_speed = pos1.speed - pos2.speed
    return diff * relative_speed < 0


def _calculate_orb_to_aspect(pos1: PlanetPosition, pos2: PlanetPosition, aspect: Aspect) -> float:
    """Calculate current orb (degrees) to exact aspect"""
    
    # Current angular separation
    separation = abs(pos1.longitude - pos2.longitude)
    if separation > 180:
        separation = 360 - separation
    
    # Distance to exact aspect
    orb_to_exact = abs(separation - aspect.degrees)
    
    # Handle wrap-around (e.g., 358° to 2° is 4°, not 356°)
    if orb_to_exact > 180:
        orb_to_exact = 360 - orb_to_exact
    
    return orb_to_exact


def _calculate_orb_to_aspect_at_time(pos1: PlanetPosition, pos2: PlanetPosition, 
                                   aspect: Aspect, time_days: float) -> float:
    """Calculate orb to exact aspect after specified time"""
    
    # Future positions
    future_pos1_lon = (pos1.longitude + pos1.speed * time_days) % 360
    future_pos2_lon = (pos2.longitude + pos2.speed * time_days) % 360
    
    # Future angular separation  
    future_separation = abs(future_pos1_lon - future_pos2_lon)
    if future_separation > 180:
        future_separation = 360 - future_separation
    
    # Future distance to exact aspect
    future_orb = abs(future_separation - aspect.degrees)
    
    # Handle wrap-around
    if future_orb > 180:
        future_orb = 360 - future_orb
    
    return future_orb


def _will_perfect_before_sign_exit(pos1: PlanetPosition, pos2: PlanetPosition, 
                                 aspect: Aspect, current_orb: float) -> bool:
    """Check if aspect will perfect before either planet exits its current sign"""
    
    # Calculate relative speed
    relative_speed = abs(pos1.speed - pos2.speed)
    if relative_speed == 0:
        return False  # No relative motion = no perfection
    
    # Estimate days to perfection
    days_to_perfect = current_orb / relative_speed
    
    # Check days until each planet exits its current sign
    pos1_days_to_exit = days_to_sign_exit(pos1.longitude, pos1.speed)
    pos2_days_to_exit = days_to_sign_exit(pos2.longitude, pos2.speed)
    
    # If either planet exits sign before perfection, aspect won't perfect
    if pos1_days_to_exit and days_to_perfect > pos1_days_to_exit:
        return False
    if pos2_days_to_exit and days_to_perfect > pos2_days_to_exit:
        return False
    
    return True


def calculate_enhanced_degrees_to_exact(
    pos1: PlanetPosition, pos2: PlanetPosition, aspect: Aspect, jd_ut: float
) -> Tuple[float, Optional[datetime.datetime]]:
    """Enhanced degrees and time calculation"""

    # Current separation
    separation = abs(pos1.longitude - pos2.longitude)
    if separation > 180:
        separation = 360 - separation

    # Orb from exact
    orb_from_exact = abs(separation - aspect.degrees)

    # Calculate exact time if planets are applying
    exact_time = None
    if abs(pos1.speed - pos2.speed) > 0:
        days_to_exact = orb_from_exact / abs(pos1.speed - pos2.speed)

        max_future_days = cfg().timing.max_future_days
        if days_to_exact < max_future_days:
            try:
                exact_jd = jd_ut + days_to_exact
                # Convert back to datetime
                year, month, day, hour = swe.jdut1_to_utc(exact_jd, 1)  # Flag 1 for Gregorian
                exact_time = datetime.datetime(
                    int(year), int(month), int(day), int(hour), int((hour % 1) * 60)
                )
            except Exception:
                exact_time = None

    # If already very close, return small value
    if orb_from_exact < 0.1:
        return 0.1, exact_time

    return orb_from_exact, exact_time
