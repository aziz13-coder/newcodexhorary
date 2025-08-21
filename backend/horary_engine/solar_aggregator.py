"""Aggregate testimonies with role importance scaling."""
from __future__ import annotations

from typing import Iterable, List, Tuple, Dict, Sequence
import re

from .polarity_weights import (
    POLARITY_TABLE,
    WEIGHT_TABLE,
    FAMILY_TABLE,
    KIND_TABLE,
    TestimonyKey,
)
from .polarity import Polarity
from .dsl import RoleImportance


def _coerce(testimonies: Iterable[TestimonyKey | str | RoleImportance]) -> Tuple[Sequence[TestimonyKey], Dict[str, float]]:
    """Split testimonies into tokens and role importance mapping."""
    tokens: List[TestimonyKey] = []
    role_weights: Dict[str, float] = {}
    for raw in testimonies:
        if isinstance(raw, RoleImportance):
            role_weights[raw.role.name.lower()] = raw.importance
            continue
        if isinstance(raw, TestimonyKey):
            tokens.append(raw)
            continue
        try:
            tokens.append(TestimonyKey(raw))
        except ValueError:
            continue
    return tokens, role_weights


def aggregate(
    testimonies: Iterable[TestimonyKey | str | RoleImportance],
) -> Tuple[float, List[Dict[str, float | TestimonyKey | Polarity | str | bool]]]:
    """Aggregate testimony tokens into a score with role importance weighting."""
    tokens, role_weights = _coerce(testimonies)

    total_yes = 0.0
    total_no = 0.0
    ledger: List[Dict[str, float | TestimonyKey | Polarity | str | bool]] = []
    seen: set[TestimonyKey] = set()
    families_seen: set[str] = set()

    for token in sorted(tokens, key=lambda t: t.value):
        if token in seen:
            continue
        seen.add(token)

        polarity = POLARITY_TABLE.get(token, Polarity.NEUTRAL)
        if polarity is Polarity.NEUTRAL:
            continue

        family = FAMILY_TABLE.get(token)
        kind = KIND_TABLE.get(token)
        context_only = family is not None and family in families_seen
        if family is not None and not context_only:
            families_seen.add(family)

        weight = WEIGHT_TABLE.get(token, 0.0)

        role_factor = 1.0
        token_name = token.value.lower()
        for role_name, factor in role_weights.items():
            pattern = rf"(^|_){re.escape(role_name)}_"
            if re.search(pattern, token_name):
                role_factor *= factor
        weight *= role_factor

        if weight < 0:
            raise ValueError("Weights must be non-negative for monotonicity")

        delta_yes = weight if (not context_only and polarity is Polarity.POSITIVE) else 0.0
        delta_no = weight if (not context_only and polarity is Polarity.NEGATIVE) else 0.0
        total_yes += delta_yes
        total_no += delta_no
        ledger.append(
            {
                "key": token,
                "polarity": polarity,
                "weight": weight,
                "delta_yes": delta_yes,
                "delta_no": delta_no,
                "family": family,
                "kind": kind,
                "context": context_only,
                "role_factor": role_factor,
            }
        )

    total = total_yes - total_no
    return total, ledger
