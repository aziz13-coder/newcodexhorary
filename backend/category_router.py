"""Category router mapping question categories to role contracts."""
from __future__ import annotations

from typing import Dict

try:
    from .models import Planet
    from .taxonomy import Category, get_defaults, resolve_category
except ImportError:  # pragma: no cover - fallback when executed as script
    from models import Planet
    from taxonomy import Category, get_defaults, resolve_category


def get_contract(category: str | Category) -> Dict[str, Planet]:
    """Return role contract for a given category.

    The function accepts either a :class:`Category` enum value or a legacy
    string. Passing a string will emit a deprecation warning via
    :func:`resolve_category`.
    """

    cat = resolve_category(category)
    if not cat:
        return {}
    defaults = get_defaults(cat)
    return defaults.get("contract", {})
