(function () {
  "use strict";

  var ARROW =
    '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>';
  var SVG_NS = "http://www.w3.org/2000/svg";
  var GROUPS = ["Continual learning", "Methods", "LLM training", "Knowledge", "Memory and context", "Foundations"];

  // ---------- theme ----------

  document.querySelector(".theme-toggle").addEventListener("click", function () {
    var dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch (e) {}
  });

  // ---------- helpers ----------

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slug(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  }

  function meta(parts) {
    var shown = parts.filter(Boolean).map(esc);
    if (!shown.length) return "";
    return '<span class="meta">' + shown.join('<span class="dot">•</span>') + "</span>";
  }

  function groupIndex(group) {
    var i = GROUPS.indexOf(group);
    return i === -1 ? GROUPS.length - 1 : i;
  }

  function load(name) {
    return fetch("data/" + name + ".json", { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(name + ".json: " + res.status);
      return res.json();
    });
  }

  // ---------- markdown (just what the notes use) ----------

  function inline(text) {
    var codes = [];
    text = text.replace(/`([^`]+)`/g, function (_, c) {
      codes.push(c);
      return "\u0000" + (codes.length - 1) + "\u0000";
    });
    text = esc(text)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
        return '<a href="' + href + '">' + label + "</a>";
      })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>");
    return text.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return "<code>" + esc(codes[Number(i)]) + "</code>";
    });
  }

  function splitRow(line) {
    return line.trim().replace(/^\||\|$/g, "").split("|").map(function (c) {
      return c.trim();
    });
  }

  function markdown(src) {
    var lines = src.replace(/\r/g, "").split("\n");
    var out = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (/^```/.test(line)) {
        var code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
        i++;
        out.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>");
      } else if (/^#{1,6}\s/.test(line)) {
        var level = Math.min(6, line.match(/^#+/)[0].length + 1);
        out.push("<h" + level + ">" + inline(line.replace(/^#+\s*/, "")) + "</h" + level + ">");
        i++;
      } else if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
        out.push("<hr />");
        i++;
      } else if (/^>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ""));
        out.push("<blockquote>" + markdown(quote.join("\n")) + "</blockquote>");
      } else if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[i + 1])) {
        var head = splitRow(line);
        i += 2;
        var body = [];
        while (i < lines.length && /^\|/.test(lines[i])) body.push(splitRow(lines[i++]));
        out.push(
          '<div class="table-wrap"><table><thead><tr>' +
            head.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") +
            "</tr></thead><tbody>" +
            body.map(function (r) {
              return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>";
            }).join("") +
            "</tbody></table></div>"
        );
      } else if (/^\s*([-*]|\d+\.)\s/.test(line)) {
        var ordered = /^\s*\d+\./.test(line);
        var items = [];
        while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) {
          var item = lines[i++].replace(/^\s*([-*]|\d+\.)\s/, "");
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s/.test(lines[i])) {
            item += " " + lines[i++].trim();
          }
          items.push("<li>" + inline(item) + "</li>");
        }
        out.push(ordered ? "<ol>" + items.join("") + "</ol>" : "<ul>" + items.join("") + "</ul>");
      } else if (!line.trim()) {
        i++;
      } else {
        var para = [];
        while (
          i < lines.length &&
          lines[i].trim() &&
          !/^(#{1,6}\s|```|>|\||\s*([-*]|\d+\.)\s|-{3,}\s*$)/.test(lines[i])
        ) {
          para.push(lines[i++].trim());
        }
        out.push("<p>" + inline(para.join("\n")).replace(/\n/g, para.length > 1 && /\*\*.*:\*\*/.test(para[0]) ? "<br />" : " ") + "</p>");
      }
    }
    return out.join("\n");
  }

  // Relative .md links inside a note open as notes on this page.
  function resolve(base, href) {
    var parts = base.split("/").slice(0, -1);
    href.split("/").forEach(function (p) {
      if (p === "..") parts.pop();
      else if (p !== ".") parts.push(p);
    });
    return parts.join("/");
  }

  function fixLinks(el, notePath) {
    el.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (/^[a-z]+:/i.test(href) || href.charAt(0) === "#") {
        if (/^https?:/i.test(href)) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
        return;
      }
      if (/\.md(#.*)?$/.test(href)) a.setAttribute("href", "#note=" + resolve(notePath, href.replace(/#.*$/, "")));
    });
  }

  // ---------- data model ----------

  var state = { concepts: [], byId: {}, sources: [], byKey: {}, notes: [], noteCache: {} };

  function addSource(kind, item, extra) {
    var s = {
      key: slug(kind) + ":" + slug(item.title),
      kind: kind,
      title: item.title,
      who: item.authors || item.speaker || "",
      year: item.year,
      url: item.url,
      text: item.takeaway || item.why || item.description || "",
      concepts: item.concepts || [],
      notes: item.notes,
      tags: item.tags || [],
      extra: extra || ""
    };
    state.sources.push(s);
    state.byKey[s.key] = s;
  }

  function buildModel(data) {
    state.concepts = data.concepts;
    data.concepts.forEach(function (c) {
      c.sources = [];
      state.byId[c.id] = c;
    });
    data.talks.forEach(function (t) {
      addSource("Talk", t, [t.venue, t.watched ? "Watched " + t.watched : ""].filter(Boolean).join(" · "));
    });
    data.read.forEach(function (r) {
      addSource("Read", r, r.read ? "Read " + r.read : "");
    });
    data.resources.forEach(function (r) {
      addSource(r.kind || "Resource", r);
    });
    data.toRead
      .slice()
      .sort(function (a, b) { return (a.order || Infinity) - (b.order || Infinity); })
      .forEach(function (r) {
        addSource("Reading list", r, r.order ? "#" + r.order + " on the list" : "");
      });

    state.sources.forEach(function (s) {
      s.concepts.forEach(function (id) {
        if (state.byId[id]) state.byId[id].sources.push(s);
      });
    });

    // Notes: topic notes hang off concepts, the rest off sources.
    data.concepts.forEach(function (c) {
      if (c.note) state.notes.push({ path: c.note, title: c.name, kind: "Topic", concept: c });
    });
    state.sources.forEach(function (s) {
      if (s.notes) state.notes.push({ path: s.notes, title: s.title, kind: s.kind === "Talk" ? "Talk" : "Paper", source: s });
    });
  }

  // ---------- graph ----------

  var graph = { nodes: [], links: [], index: {}, showSources: true, running: false, ticks: 0 };

  function buildGraph() {
    var svg = document.querySelector("[data-graph]");
    var w = svg.clientWidth || 800;
    var h = svg.clientHeight || 520;
    var prev = graph.index;
    graph.nodes = [];
    graph.links = [];
    graph.index = {};

    function node(id, kind, label, group, r) {
      var old = prev[id];
      var n = {
        id: id, kind: kind, label: label, group: group, r: r,
        x: old ? old.x : w / 2 + (Math.random() - 0.5) * w * 0.6,
        y: old ? old.y : h / 2 + (Math.random() - 0.5) * h * 0.6,
        vx: 0, vy: 0
      };
      graph.nodes.push(n);
      graph.index[id] = n;
      return n;
    }

    state.concepts.forEach(function (c) {
      node("c:" + c.id, "concept", c.name, c.group, 6 + Math.min(8, Math.sqrt(c.sources.length) * 2.2));
    });
    var seen = {};
    state.concepts.forEach(function (c) {
      c.related.forEach(function (r) {
        var k = [c.id, r].sort().join("|");
        if (seen[k] || !state.byId[r]) return;
        seen[k] = true;
        graph.links.push({ a: graph.index["c:" + c.id], b: graph.index["c:" + r], kind: "concept", len: 90 });
      });
    });
    if (graph.showSources) {
      state.sources.forEach(function (s) {
        if (!s.concepts.length) return;
        var first = state.byId[s.concepts[0]];
        var n = node("s:" + s.key, "source", s.title, first ? first.group : "", s.kind === "Talk" ? 5 : 3.5);
        n.sourceKind = s.kind;
        s.concepts.forEach(function (id) {
          if (graph.index["c:" + id]) graph.links.push({ a: n, b: graph.index["c:" + id], kind: "source", len: 38 });
        });
      });
    }
    graph.w = w;
    graph.h = h;
    drawGraph();
    kick(1);
  }

  function kick(alpha) {
    graph.alpha = Math.max(graph.alpha || 0, alpha);
    if (graph.running) return;
    graph.running = true;
    requestAnimationFrame(step);
  }

  function step() {
    var nodes = graph.nodes;
    var a = graph.alpha;
    var i, j, n, m, dx, dy, d2, d, f;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        m = nodes[j];
        dx = n.x - m.x;
        dy = n.y - m.y;
        d2 = dx * dx + dy * dy || 0.01;
        var strength = (n.kind === "concept" ? 2 : 1) * (m.kind === "concept" ? 2 : 1);
        if (d2 > 160000) continue;
        f = (strength * 220 * a) / d2;
        n.vx += dx * f;
        n.vy += dy * f;
        m.vx -= dx * f;
        m.vy -= dy * f;
      }
    }
    graph.links.forEach(function (l) {
      dx = l.b.x - l.a.x;
      dy = l.b.y - l.a.y;
      d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      f = ((d - l.len) / d) * 0.05 * a;
      l.a.vx += dx * f;
      l.a.vy += dy * f;
      l.b.vx -= dx * f;
      l.b.vy -= dy * f;
    });
    nodes.forEach(function (n) {
      n.vx += (graph.w / 2 - n.x) * 0.003 * a;
      n.vy += (graph.h / 2 - n.y) * 0.012 * a;
      if (n === graph.dragging) {
        n.vx = n.vy = 0;
        return;
      }
      n.vx *= 0.6;
      n.vy *= 0.6;
      n.x += n.vx;
      n.y += n.vy;
    });
    graph.alpha *= 0.985;
    positionGraph();
    if (graph.alpha > 0.02 || graph.dragging) requestAnimationFrame(step);
    else graph.running = false;
  }

  function drawGraph() {
    var svg = document.querySelector("[data-graph]");
    graph.svg = svg;
    svg.innerHTML = "";
    var gl = document.createElementNS(SVG_NS, "g");
    var gn = document.createElementNS(SVG_NS, "g");
    svg.appendChild(gl);
    svg.appendChild(gn);

    graph.links.forEach(function (l) {
      var line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("class", "edge edge-" + l.kind);
      gl.appendChild(line);
      l.el = line;
    });
    graph.nodes.forEach(function (n) {
      var g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "node node-" + n.kind + " g" + groupIndex(n.group));
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", n.label);
      var c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("r", n.r);
      g.appendChild(c);
      var title = document.createElementNS(SVG_NS, "title");
      title.textContent = n.kind === "source" ? n.sourceKind + ": " + n.label : n.label;
      g.appendChild(title);
      if (n.kind === "concept") {
        var t = document.createElementNS(SVG_NS, "text");
        t.setAttribute("dy", -n.r - 5);
        t.textContent = n.label.length > 28 ? n.label.slice(0, 26) + "…" : n.label;
        g.appendChild(t);
      }
      gn.appendChild(g);
      n.el = g;
      attachDrag(svg, n);
    });
    highlight();
  }

  // Keep every node in view by fitting the viewBox to the layout (not while dragging).
  function fitView() {
    if (graph.dragging || !graph.nodes.length) return;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    graph.nodes.forEach(function (n) {
      x0 = Math.min(x0, n.x - n.r);
      x1 = Math.max(x1, n.x + n.r);
      y0 = Math.min(y0, n.y - n.r - (n.kind === "concept" ? 18 : 0));
      y1 = Math.max(y1, n.y + n.r);
    });
    var pad = 40;
    var vw = x1 - x0 + pad * 2;
    var vh = y1 - y0 + pad * 2;
    // Match the box's aspect ratio so the fit is tight.
    var ratio = graph.w / graph.h;
    if (vw / vh < ratio) {
      x0 -= (vh * ratio - vw) / 2;
      vw = vh * ratio;
    } else {
      y0 -= (vw / ratio - vh) / 2;
      vh = vw / ratio;
    }
    // Labels stay ~11px on screen however far the view zooms out.
    graph.svg.style.setProperty("--label", ((11 * vw) / graph.w).toFixed(2) + "px");
    graph.svg.setAttribute("viewBox", [x0 - pad, y0 - pad, vw, vh].map(function (v) { return v.toFixed(1); }).join(" "));
  }

  function positionGraph() {
    fitView();
    graph.links.forEach(function (l) {
      l.el.setAttribute("x1", l.a.x.toFixed(1));
      l.el.setAttribute("y1", l.a.y.toFixed(1));
      l.el.setAttribute("x2", l.b.x.toFixed(1));
      l.el.setAttribute("y2", l.b.y.toFixed(1));
    });
    graph.nodes.forEach(function (n) {
      n.el.setAttribute("transform", "translate(" + n.x.toFixed(1) + "," + n.y.toFixed(1) + ")");
    });
  }

  function attachDrag(svg, n) {
    var start = null;
    function point(e) {
      var pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }
    n.el.addEventListener("pointerdown", function (e) {
      start = { x: e.clientX, y: e.clientY, moved: false };
      graph.dragging = n;
      n.el.setPointerCapture(e.pointerId);
      kick(0.3);
    });
    n.el.addEventListener("pointermove", function (e) {
      if (graph.dragging !== n || !start) return;
      if (Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) > 4) start.moved = true;
      if (!start.moved) return;
      var p = point(e);
      n.x = p.x;
      n.y = p.y;
      kick(0.3);
    });
    n.el.addEventListener("pointerup", function () {
      var clicked = start && !start.moved;
      graph.dragging = null;
      start = null;
      if (clicked) open(n);
    });
    n.el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(n);
      }
    });
  }

  function open(n) {
    location.hash = n.kind === "concept" ? "concept=" + n.id.slice(2) : "source=" + n.id.slice(2);
  }

  function highlight() {
    var sel = graph.selected;
    var near = {};
    if (sel) {
      near[sel] = true;
      graph.links.forEach(function (l) {
        if (l.a.id === sel) near[l.b.id] = true;
        if (l.b.id === sel) near[l.a.id] = true;
      });
    }
    graph.nodes.forEach(function (n) {
      n.el.classList.toggle("selected", n.id === sel);
      n.el.classList.toggle("dim", !!sel && !near[n.id]);
    });
    graph.links.forEach(function (l) {
      l.el.classList.toggle("dim", !!sel && l.a.id !== sel && l.b.id !== sel);
    });
  }

  // ---------- lists ----------

  function chip(c) {
    return '<a class="chip concept-chip g' + groupIndex(c.group) + '" href="#concept=' + esc(c.id) + '">' + esc(c.name) + "</a>";
  }

  function conceptChips(ids) {
    return ids
      .map(function (id) { return state.byId[id]; })
      .filter(Boolean)
      .map(chip)
      .join("");
  }

  function titleBlock(s) {
    var inner = '<a class="name" href="#source=' + esc(s.key) + '">' + esc(s.title) + "</a>";
    if (s.url) {
      inner += ' <a class="ext" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" aria-label="Open original">' + ARROW + "</a>";
    }
    return inner;
  }

  function sourceRow(s) {
    return (
      '<li><div class="row"><span class="row-main">' +
      '<span class="row-title">' + titleBlock(s) + "</span>" +
      (s.who ? '<span class="row-authors">' + esc(s.who) + (s.year ? ", " + esc(s.year) : "") + "</span>" : "") +
      (s.text ? '<span class="row-desc">' + esc(s.text) + "</span>" : "") +
      (s.concepts.length ? '<span class="row-chips">' + conceptChips(s.concepts) + "</span>" : "") +
      (s.notes ? '<span class="row-links"><a href="#note=' + esc(s.notes) + '">My notes</a></span>' : "") +
      "</span>" +
      meta([s.kind, s.extra]) +
      "</div></li>"
    );
  }

  function renderConcepts() {
    var el = document.querySelector("[data-concepts]");
    el.innerHTML = GROUPS.map(function (g) {
      var cs = state.concepts.filter(function (c) { return c.group === g; });
      if (!cs.length) return "";
      return (
        '<div class="concept-group"><h3 class="g' + groupIndex(g) + '"><span class="swatch"></span>' + esc(g) + "</h3><ul>" +
        cs.map(function (c) {
          return (
            '<li><a href="#concept=' + esc(c.id) + '">' + esc(c.name) + "</a>" +
            '<span class="count">' + c.sources.length + "</span></li>"
          );
        }).join("") +
        "</ul></div>"
      );
    }).join("");
  }

  function renderLegend() {
    document.querySelector("[data-legend]").innerHTML = GROUPS.map(function (g, i) {
      return '<span class="g' + i + '"><span class="swatch"></span>' + esc(g) + "</span>";
    }).join("");
  }

  function setupSources() {
    var list = document.querySelector('[data-list="sources"]');
    var filters = document.querySelector('[data-filters="sources"]');
    var search = filters.querySelector(".search");
    var f = { q: "", kind: null };
    var kinds = [];
    state.sources.forEach(function (s) {
      if (kinds.indexOf(s.kind) === -1) kinds.push(s.kind);
    });
    kinds.forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = k;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        f.kind = f.kind === k ? null : k;
        filters.querySelectorAll("button.chip").forEach(function (c) {
          c.setAttribute("aria-pressed", String(c.textContent === f.kind));
        });
        draw();
      });
      filters.appendChild(b);
    });
    function hay(s) {
      return [s.title, s.who, s.text, s.kind, s.tags.join(" ")]
        .concat(s.concepts.map(function (id) { return state.byId[id] ? state.byId[id].name : id; }))
        .join(" ")
        .toLowerCase();
    }
    function draw() {
      var shown = state.sources.filter(function (s) {
        if (f.kind && s.kind !== f.kind) return false;
        if (f.q && hay(s).indexOf(f.q) === -1) return false;
        return true;
      });
      list.innerHTML = shown.length ? shown.map(sourceRow).join("") : '<li class="empty">Nothing matches.</li>';
    }
    search.addEventListener("input", function () {
      f.q = search.value.trim().toLowerCase();
      draw();
    });
    draw();
  }

  function renderNotes() {
    document.querySelector('[data-list="notes"]').innerHTML = state.notes.length
      ? state.notes.map(function (n) {
          return (
            '<li><div class="row"><span class="row-main"><span class="row-title"><a class="name" href="#note=' +
            esc(n.path) + '">' + esc(n.title) + "</a></span>" +
            '<span class="row-authors">' + esc(n.path) + "</span></span>" +
            meta([n.kind]) + "</div></li>"
          );
        }).join("")
      : '<li class="empty">No notes yet.</li>';
  }

  // ---------- detail panel ----------

  function fetchNote(path) {
    if (state.noteCache[path]) return Promise.resolve(state.noteCache[path]);
    return fetch(path, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(path + ": " + res.status);
      return res.text().then(function (t) {
        state.noteCache[path] = t;
        return t;
      });
    });
  }

  function showNoteInto(el, path) {
    el.innerHTML = '<p class="empty">Loading note…</p>';
    fetchNote(path)
      .then(function (md) {
        el.innerHTML = markdown(md);
        fixLinks(el, path);
      })
      .catch(function () {
        el.innerHTML = '<p class="empty">Couldn\'t load <code>' + esc(path) + "</code>.</p>";
      });
  }

  function sourcesByKind(list) {
    var order = ["Talk", "Read", "Overview", "Resource", "Reading list"];
    return list.slice().sort(function (a, b) {
      return order.indexOf(a.kind) - order.indexOf(b.kind);
    });
  }

  function renderDetail() {
    var panel = document.querySelector("[data-detail]");
    var m = /^#(concept|source|note)=(.+)$/.exec(decodeURIComponent(location.hash));
    if (!m) {
      panel.hidden = true;
      graph.selected = null;
      highlight();
      return;
    }
    var kind = m[1];
    var id = m[2];
    var html = "";
    var note = null;

    if (kind === "concept" && state.byId[id]) {
      var c = state.byId[id];
      graph.selected = "c:" + id;
      html =
        '<div class="detail-head"><span class="status g' + groupIndex(c.group) + '">' + esc(c.group) + "</span>" +
        '<a class="close" href="#graph" aria-label="Close">×</a></div>' +
        "<h2 class=\"detail-title\">" + esc(c.name) + "</h2>" +
        '<p class="detail-summary">' + esc(c.summary) + "</p>" +
        (c.related.length ? '<h3 class="detail-sub">Related concepts</h3><div class="row-chips">' + conceptChips(c.related) + "</div>" : "") +
        (c.note ? '<h3 class="detail-sub">Topic note</h3><article class="prose" data-note></article>' : "") +
        '<h3 class="detail-sub">Sources (' + c.sources.length + ")</h3>" +
        (c.sources.length ? '<ul class="rows">' + sourcesByKind(c.sources).map(sourceRow).join("") + "</ul>" : '<p class="empty">Nothing filed here yet.</p>');
      note = c.note;
    } else if (kind === "source" && state.byKey[id]) {
      var s = state.byKey[id];
      graph.selected = "s:" + id;
      html =
        '<div class="detail-head"><span class="status">' + esc(s.kind) + "</span>" +
        '<a class="close" href="#graph" aria-label="Close">×</a></div>' +
        '<h2 class="detail-title">' + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title) + "</a>" + ARROW : esc(s.title)) + "</h2>" +
        (s.who ? '<p class="row-authors">' + esc(s.who) + (s.year ? ", " + esc(s.year) : "") + (s.extra ? " · " + esc(s.extra) : "") + "</p>" : "") +
        (s.text ? '<p class="detail-summary">' + esc(s.text) + "</p>" : "") +
        (s.concepts.length ? '<h3 class="detail-sub">Concepts</h3><div class="row-chips">' + conceptChips(s.concepts) + "</div>" : "") +
        (s.notes ? '<h3 class="detail-sub">My notes</h3><article class="prose" data-note></article>' : "");
      note = s.notes;
    } else if (kind === "note") {
      var entry = state.notes.filter(function (n) { return n.path === id; })[0];
      graph.selected = entry && entry.concept ? "c:" + entry.concept.id : entry && entry.source ? "s:" + entry.source.key : null;
      var ids = entry ? (entry.concept ? [entry.concept.id] : entry.source.concepts) : [];
      html =
        '<div class="detail-head"><span class="status">' + esc(entry ? entry.kind + " note" : "Note") + "</span>" +
        '<a class="close" href="#notes" aria-label="Close">×</a></div>' +
        (ids.length ? '<div class="row-chips">' + conceptChips(ids) + "</div>" : "") +
        '<article class="prose" data-note></article>' +
        '<p class="row-links"><a href="' + esc(id) + '">Raw markdown</a></p>';
      note = id;
    } else {
      panel.hidden = true;
      return;
    }

    panel.innerHTML = html;
    panel.hidden = false;
    if (note) showNoteInto(panel.querySelector("[data-note]"), note);
    highlight();
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- load ----------

  function setCount(key, n) {
    var el = document.querySelector('[data-count="' + key + '"]');
    if (el) el.textContent = "(" + n + ")";
  }

  Promise.all([load("concepts"), load("talks"), load("read"), load("to-read"), load("resources")])
    .then(function (d) {
      buildModel({ concepts: d[0], talks: d[1], read: d[2], toRead: d[3], resources: d[4] });
      renderLegend();
      renderConcepts();
      setupSources();
      renderNotes();
      setCount("concepts", state.concepts.length);
      setCount("sources", state.sources.length);
      setCount("notes", state.notes.length);

      buildGraph();
      document.querySelector('[data-toggle="sources"]').addEventListener("change", function (e) {
        graph.showSources = e.target.checked;
        buildGraph();
      });
      var resizeTimer;
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(buildGraph, 200);
      });

      window.addEventListener("hashchange", renderDetail);
      renderDetail();
    })
    .catch(function (err) {
      console.error(err);
      document.querySelector('[data-list="sources"]').innerHTML =
        '<li><p class="empty">Couldn\'t load data. If you opened this file directly, serve the folder instead: <code>python -m http.server</code>.</p></li>';
    });
})();
