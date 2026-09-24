(function () {
  "use strict";

  var ARROW =
    '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>';

  var PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

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

  function meta(parts) {
    var shown = parts.filter(Boolean).map(esc);
    if (!shown.length) return "";
    return '<span class="meta">' + shown.join('<span class="dot">•</span>') + "</span>";
  }

  function formatMonth(value) {
    if (!value) return "";
    var m = /^(\d{4})-(\d{2})/.exec(value);
    if (!m) return value;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
  }

  function titleBlock(item) {
    if (item.url) {
      return (
        '<a class="name" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(item.title) + "</a>" + ARROW
      );
    }
    return '<span class="plain">' + esc(item.title) + "</span>";
  }

  function searchText(item) {
    return [item.title, item.authors, item.takeaway, item.why, item.description, (item.tags || []).join(" ")]
      .join(" ")
      .toLowerCase();
  }

  // ---------- renderers ----------

  function renderWorkingOn(items) {
    if (!items.length) return '<p class="empty">Nothing in progress right now.</p>';
    return items
      .map(function (item) {
        var tag = item.url ? "a" : "div";
        var href = item.url ? ' href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer"' : "";
        var progress =
          typeof item.progress === "number"
            ? '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
              Math.round(item.progress * 100) + '"><span style="width:' +
              Math.max(0, Math.min(1, item.progress)) * 100 + '%"></span></div>'
            : "";
        return (
          "<" + tag + ' class="card"' + href + ">" +
          '<h3>' + esc(item.title) + (item.url ? ARROW : "") +
          (item.status ? ' <span class="status">' + esc(item.status) + "</span>" : "") + "</h3>" +
          (item.description ? "<p>" + esc(item.description) + "</p>" : "") +
          progress +
          meta([item.started ? "Since " + item.started : "", (item.tags || []).join(", ")]) +
          "</" + tag + ">"
        );
      })
      .join("");
  }

  function renderRead(items) {
    return items
      .map(function (item) {
        var links = [];
        if (item.notes) links.push('<a href="' + esc(item.notes) + '">My notes</a>');
        if (item.code) links.push('<a href="' + esc(item.code) + '" target="_blank" rel="noopener noreferrer">Code</a>');
        return (
          '<li><div class="row"><span class="row-main">' +
          '<span class="row-title">' + titleBlock(item) + "</span>" +
          (item.authors ? '<span class="row-authors">' + esc(item.authors) + (item.year ? ", " + esc(item.year) : "") + "</span>" : "") +
          (item.takeaway ? '<span class="row-desc">' + esc(item.takeaway) + "</span>" : "") +
          (links.length ? '<span class="row-links">' + links.join("") + "</span>" : "") +
          "</span>" +
          meta([item.read ? "Read " + formatMonth(item.read) : "", (item.tags || [])[0]]) +
          "</div></li>"
        );
      })
      .join("");
  }

  function renderToRead(items) {
    return items
      .map(function (item) {
        return (
          '<li><div class="row"><span class="row-main">' +
          '<span class="row-title">' + titleBlock(item) + "</span>" +
          (item.authors ? '<span class="row-authors">' + esc(item.authors) + (item.year ? ", " + esc(item.year) : "") + "</span>" : "") +
          (item.why ? '<span class="row-desc">' + esc(item.why) + "</span>" : "") +
          "</span>" +
          meta([item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) + " priority" : "", (item.tags || [])[0]]) +
          "</div></li>"
        );
      })
      .join("");
  }

  // ---------- filterable lists ----------

  function setupList(key, items, render) {
    var list = document.querySelector('[data-list="' + key + '"]');
    var filters = document.querySelector('[data-filters="' + key + '"]');
    var search = filters.querySelector(".search");
    var state = { q: "", tag: null };

    var tags = [];
    items.forEach(function (item) {
      (item.tags || []).forEach(function (t) {
        if (tags.indexOf(t) === -1) tags.push(t);
      });
    });
    tags.sort();

    tags.forEach(function (t) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = t;
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", function () {
        state.tag = state.tag === t ? null : t;
        filters.querySelectorAll(".chip").forEach(function (c) {
          c.setAttribute("aria-pressed", String(c.textContent === state.tag));
        });
        draw();
      });
      filters.appendChild(chip);
    });

    search.addEventListener("input", function () {
      state.q = search.value.trim().toLowerCase();
      draw();
    });

    function draw() {
      var shown = items.filter(function (item) {
        if (state.tag && (item.tags || []).indexOf(state.tag) === -1) return false;
        if (state.q && searchText(item).indexOf(state.q) === -1) return false;
        return true;
      });
      list.innerHTML = shown.length
        ? render(shown)
        : '<li class="empty">' + (items.length ? "No papers match." : "Nothing here yet.") + "</li>";
    }

    if (!items.length) filters.hidden = true;
    draw();
  }

  // ---------- load ----------

  function load(name) {
    return fetch("data/" + name + ".json", { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(name + ".json: " + res.status);
      return res.json();
    });
  }

  function setCount(key, n) {
    var el = document.querySelector('[data-count="' + key + '"]');
    if (el) el.textContent = "(" + n + ")";
  }

  Promise.all([load("working-on"), load("read"), load("to-read")])
    .then(function (data) {
      var working = data[0];
      var read = data[1].slice().sort(function (a, b) {
        return String(b.read || "").localeCompare(String(a.read || ""));
      });
      var toRead = data[2].slice().sort(function (a, b) {
        var pa = a.priority in PRIORITY_ORDER ? PRIORITY_ORDER[a.priority] : 3;
        var pb = b.priority in PRIORITY_ORDER ? PRIORITY_ORDER[b.priority] : 3;
        return pa - pb;
      });

      document.querySelector('[data-list="working-on"]').innerHTML = renderWorkingOn(working);
      setupList("read", read, renderRead);
      setupList("to-read", toRead, renderToRead);

      setCount("working-on", working.length);
      setCount("read", read.length);
      setCount("to-read", toRead.length);
    })
    .catch(function (err) {
      console.error(err);
      var msg =
        '<p class="empty">Couldn\'t load data. If you opened this file directly, serve the folder instead: <code>python -m http.server</code>.</p>';
      document.querySelectorAll("[data-list]").forEach(function (el) {
        el.innerHTML = el.tagName === "UL" ? "<li>" + msg + "</li>" : msg;
      });
    });
})();
