# ml

A single place for everything I'm doing in machine learning: papers I've read, papers I plan to read, talks I've watched, my notes, and what I'm working on right now. The site in this repo renders it all, and the [knowledge base](https://ml.harishchandran.com/kb.html) links everything by concept.

## Layout

```
index.html          the notebook (static, no build step)
kb.html             knowledge base: concept graph + everything I reference, searchable
assets/             styles + scripts (app.js for the notebook, kb.js for the knowledge base)
data/
  working-on.json   what I'm currently building / learning
  read.json         papers I've read
  to-read.json      papers I plan to read
  talks.json        talks and videos I've watched
  resources.json    other things I reference (overviews, posts, sites)
  concepts.json     the concepts everything is filed under
notes/
  topics/           one hub note per topic (e.g. continual-learning.md)
  talks/            notes on talks and videos
  <slug>.md         notes on individual papers
```

## Adding things

Edit the JSON files in `data/`. Each is an array of objects; only `title` is required.

| File | Fields |
| --- | --- |
| `working-on.json` | `title`, `description`, `status`, `progress` (0–1), `started`, `tags`, `url` |
| `read.json` | `title`, `authors`, `year`, `url`, `tags`, `read` (`YYYY-MM`), `takeaway`, `notes`, `code` |
| `to-read.json` | `order`, `title`, `authors`, `year`, `url`, `tags`, `why` |
| `talks.json` | `title`, `speaker`, `venue`, `year`, `date`, `url`, `watched` (`YYYY-MM`), `tags`, `takeaway`, `notes` |
| `resources.json` | `title`, `kind`, `year`, `url`, `tags`, `description` |
| `concepts.json` | `id`, `name`, `group`, `summary`, `related` (concept ids), `note` (topic note path) |

Any entry in the first five files can also take `concepts`: a list of concept ids from `concepts.json`. That is what places it on the knowledge base graph and under each concept's page.

When I finish a paper, I move it from `to-read.json` to `read.json` and add `read` and `takeaway`.

To attach longer notes to a paper or talk, write the markdown file under `notes/` and set `"notes": "notes/..."` on the entry. Notes render on the knowledge base page (`kb.html#note=notes/...`), and relative links between notes work there. A topic hub note is linked from its concept with the `note` field.

## Knowledge base

`kb.html` reads every data file and shows:

- a force-directed **concept graph** (concepts as large dots, sources as small ones; drag, click to open),
- a **page for each concept**: summary, related concepts, its topic note, and every source filed under it,
- a **page for each source**: takeaway, concepts, and my rendered notes,
- one **searchable list** of everything referenced, filterable by kind.

Every view has a link you can bookmark: `kb.html#concept=catastrophic-forgetting`, `kb.html#source=talk:why-nobody-has-solved-continual-learning`, `kb.html#note=notes/topics/continual-learning.md`.

## Running locally

The page loads its data with `fetch`, so it needs to be served over HTTP rather than opened as a file:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Deploying

Served by GitHub Pages from `main` (root folder) at https://ml.harishchandran.com. The `CNAME` file sets the custom domain; DNS has a `CNAME` record `ml` → `h-chandran.github.io`. `.nojekyll` makes Pages serve the files as-is.
