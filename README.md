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

Edit the JSON files in `data/`. Each entry is a plain object; see the existing entries for the fields. Optional fields can be left out.

To attach longer notes to a paper, write `notes/<slug>.md` and set `"notes": "notes/<slug>.md"` on the entry.

## Running locally

The page loads its data with `fetch`, so it needs to be served over HTTP rather than opened as a file:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Deploying

It's a plain static site, so GitHub Pages works as-is: Settings → Pages → deploy from `main`, root folder.
