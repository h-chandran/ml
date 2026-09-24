# ml

A single place for everything I'm doing in machine learning: papers I've read, papers I plan to read, and what I'm working on right now. The site in this repo renders it all.

## Layout

```
index.html          the site (static, no build step)
assets/             styles + script
data/
  working-on.json   what I'm currently building / learning
  read.json         papers I've read
  to-read.json      papers I plan to read
notes/              longer notes on individual papers (markdown)
```

## Adding things

Edit the JSON files in `data/`. Each is an array of objects; only `title` is required.

| File | Fields |
| --- | --- |
| `working-on.json` | `title`, `description`, `status`, `progress` (0–1), `started`, `tags`, `url` |
| `read.json` | `title`, `authors`, `year`, `url`, `tags`, `read` (`YYYY-MM`), `takeaway`, `notes`, `code` |
| `to-read.json` | `order`, `title`, `authors`, `year`, `url`, `tags`, `why` |

When I finish a paper, I move it from `to-read.json` to `read.json` and add `read` and `takeaway`.

To attach longer notes to a paper, write `notes/<slug>.md` and set `"notes": "notes/<slug>.md"` on the entry.

## Running locally

The page loads its data with `fetch`, so it needs to be served over HTTP rather than opened as a file:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Deploying

Served by GitHub Pages from `main` (root folder) at https://ml.harishchandran.com. The `CNAME` file sets the custom domain; DNS has a `CNAME` record `ml` → `h-chandran.github.io`. `.nojekyll` makes Pages serve the files as-is.
