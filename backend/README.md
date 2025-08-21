# Backend Overview

This backend uses a central taxonomy defined in `taxonomy.py` to manage
question categories and their defaults. Modules such as
`question_analyzer`, `category_router` and the horary engine import the
`Category` enum instead of hard coded strings. Legacy string values are
still accepted but will emit a warning.

## Aggregation modes

The engine ships with a new DSL-based aggregation system enabled by
default. To revert to the legacy aggregator without editing
configuration files, set the `HORARY_USE_DSL` environment variable to
`false`. The `evaluate_chart` function also accepts a `use_dsl` argument
which callers can populate from a query parameter or HTTP header to
switch modes dynamically.
