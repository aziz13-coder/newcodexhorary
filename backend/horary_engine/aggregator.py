"""Aggregate testimonies into a score with a contribution ledger."""
from __future__ import annotations

from typing import Iterable, List, Tuple, Dict, Sequence

from .polarity_weights import (
    POLARITY_TABLE,
    WEIGHT_TABLE,
    FAMILY_TABLE,
    KIND_TABLE,
    TestimonyKey,
)
from .polarity import Polarity


def _coerce_tokens(testimonies: Iterable[TestimonyKey | str]) -> Sequence[TestimonyKey]:
    """Convert raw testimony inputs to ``TestimonyKey`` members."""

    result: List[TestimonyKey] = []
    for raw in testimonies:
        if isinstance(raw, TestimonyKey):
            result.append(raw)
        else:
            try:
                result.append(TestimonyKey(raw))
            except ValueError:
                continue
    return result


def aggregate(
    testimonies: Iterable[TestimonyKey | str],
) -> Tuple[float, List[Dict[str, float | TestimonyKey | Polarity | str | bool]]]:
    """Aggregate testimony tokens into a weighted score and ledger.

    The aggregator is *symmetric* in that positive and negative testimonies are
    treated uniformly via the ``POLARITY_TABLE``. It enforces several
    invariants:

    * polarity: each token must map to ``Polarity.POSITIVE`` or
      ``Polarity.NEGATIVE``
    * monotonicity: weights are non-negative and contributions sum linearly
    * single contribution: duplicate tokens are ignored
    * deterministic order: processing occurs in sorted token order
    """

    total_yes = 0.0
    total_no = 0.0
    ledger: List[Dict[str, float | TestimonyKey | Polarity | str | bool]] = []
    seen: set[TestimonyKey] = set()
    families_seen: set[str] = set()

    tokens = _coerce_tokens(testimonies)
    for token in sorted(tokens, key=lambda t: t.value):
        if token in seen:
            continue
        seen.add(token)
        polarity = POLARITY_TABLE.get(token, Polarity.NEUTRAL)
        if polarity is Polarity.NEUTRAL:
            continue  # unknown or neutral token

        family = FAMILY_TABLE.get(token)
        kind = KIND_TABLE.get(token)
        context_only = family is not None and family in families_seen
        if family is not None and not context_only:
            families_seen.add(family)

        weight = WEIGHT_TABLE.get(token, 0.0)
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
            }
        )

    total = total_yes - total_no
    return total, ledger
