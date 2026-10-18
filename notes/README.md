# Notes

- `topics/` holds one hub note per topic (linked from its concept in `data/concepts.json` via `note`).
- `talks/` holds notes on talks and videos (linked from `data/talks.json` via `notes`).
- Paper notes go here as `<slug>.md` (e.g. `attention-is-all-you-need.md`), linked from `data/read.json` with the `notes` field.

Everything renders on the knowledge base page: `kb.html#note=notes/<path>.md`.
