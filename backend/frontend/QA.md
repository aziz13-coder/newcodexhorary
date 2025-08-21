# Manual QA for weight parsing

Use these steps to verify weight handling in the reasoning list.

1. Launch the frontend with `npm run dev`.
2. Submit a chart with a reasoning array such as:
   ```
   [
     "Positive factor (+1)",
     "Negative factor (-2)",
     "Neutral note"
   ]
   ```
3. Confirm the UI renders a green dot for the first item, a red dot for the second, and an amber dot for the third.
4. Repeat with reasoning objects that already contain numeric `weight` and `stage` fields to ensure they are used directly.
