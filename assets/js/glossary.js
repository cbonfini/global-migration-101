/* Glossary: browse + live search + flashcard study mode (accessible) */
(function () {
  'use strict';
  var listEl = document.getElementById('gloss-body');
  if (!listEl) return;
  var alphaEl = document.getElementById('alpha');
  var searchEl = document.getElementById('gloss-search');
  var noRes = document.getElementById('no-results');
  var countEl = document.getElementById('gloss-count');
  var browseWrap = document.getElementById('browse-wrap');
  var flashWrap = document.getElementById('flash-wrap');
  var modeBrowse = document.getElementById('mode-browse');
  var modeFlash = document.getElementById('mode-flash');

  var MODULE_TITLES = {
    1:"Foundations of Global Migration",2:"Migration Data and Global Trends",3:"Drivers of Migration",
    4:"Migration Through History",5:"Migration Journey and Experience",6:"Refugees, Asylum, and Forced Displacement",
    7:"Borders, Sovereignty, and Policy",8:"Migration, Labor, and the Economy",
    9:"Migrant Lives and Identities",10:"Cities, Communities, and Integration",11:"Religion, Ethics, and Migration",
    12:"Media, Narratives, and Representation",13:"Climate Change and Migration",
    14:"Solutions, Governance, and the Future"
  };

  function start(data) {
    data.sort(function (a, b) { return a.term.localeCompare(b.term); });
    render(data);
    buildAlpha(data);
    if (countEl) countEl.textContent = data.length + ' terms';
    wireSearch(data);
    if (flashWrap) initFlashcards(data);
  }

  // Data is embedded in the page so the glossary works offline / from file://
  function init() {
    var embedded = document.getElementById('glossary-data');
    if (embedded) {
      try { start(JSON.parse(embedded.textContent)); return; }
      catch (e) { /* fall through to fetch */ }
    }
    fetch('../assets/data/glossary.json')
      .then(function (r) { return r.json(); })
      .then(start)
      .catch(function () {
        if (noRes) { noRes.style.display = 'block'; noRes.textContent = 'Could not load glossary data.'; }
      });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function letterOf(t) {
    var c = t.charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : '#';
  }

  function render(data) {
    var groups = {};
    data.forEach(function (d) {
      var L = letterOf(d.term);
      (groups[L] = groups[L] || []).push(d);
    });
    var html = '';
    Object.keys(groups).sort().forEach(function (L) {
      html += '<div class="gloss-group" id="g-' + L + '"><h2>' + L + '</h2><dl class="gloss-list">';
      groups[L].forEach(function (d) {
        html += '<div class="gterm" data-term="' + esc((d.term + ' ' + d.def).toLowerCase()) + '">' +
                '<dt>' + esc(d.term) + '</dt><dd>' + esc(d.def) + '</dd>' +
                (d.module ? '<div class="gmod">' + esc(MODULE_TITLES[d.module] || '') + '</div>' : '') +
                '</div>';
      });
      html += '</dl></div>';
    });
    listEl.innerHTML = html;
  }

  function buildAlpha(data) {
    if (!alphaEl) return;
    var present = {};
    data.forEach(function (d) { present[letterOf(d.term)] = true; });
    var html = '';
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (L) {
      html += present[L]
        ? '<a href="#g-' + L + '">' + L + '</a>'
        : '<a class="disabled" aria-disabled="true" role="link" tabindex="-1">' + L + '</a>';
    });
    alphaEl.innerHTML = html;
  }

  function wireSearch(data) {
    if (!searchEl) return;
    var status = document.getElementById('search-status');
    searchEl.addEventListener('input', function () {
      var q = searchEl.value.trim().toLowerCase();
      var shown = 0;
      listEl.querySelectorAll('.gterm').forEach(function (el) {
        var hit = !q || el.getAttribute('data-term').indexOf(q) !== -1;
        el.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      listEl.querySelectorAll('.gloss-group').forEach(function (g) {
        var any = Array.prototype.some.call(g.querySelectorAll('.gterm'), function (el) { return el.style.display !== 'none'; });
        g.style.display = any ? '' : 'none';
      });
      if (noRes) noRes.style.display = shown ? 'none' : 'block';
      if (status) status.textContent = q ? shown + ' matching terms' : '';
    });
  }

  /* ---------- Flashcards ---------- */
  function initFlashcards(data) {
    var order = data.map(function (_, i) { return i; });
    var idx = 0, showingDef = false;
    var card = document.getElementById('flash-card');
    var count = document.getElementById('flash-count');
    var live = document.getElementById('flash-live');

    function shuffle() {
      for (var i = order.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = order[i]; order[i] = order[j]; order[j] = t;
      }
    }

    function paint() {
      var d = data[order[idx]];
      if (!showingDef) {
        card.innerHTML =
          '<span class="side-label">Term</span>' +
          '<span class="term">' + esc(d.term) + '</span>' +
          '<span class="hint">Select the card (or press Enter) to reveal the definition</span>';
      } else {
        card.innerHTML =
          '<span class="side-label">Definition</span>' +
          '<span class="term">' + esc(d.term) + '</span>' +
          '<span class="def">' + esc(d.def) + '</span>' +
          (d.module ? '<span class="hint">' + esc(MODULE_TITLES[d.module] || '') + '</span>' : '');
      }
      count.textContent = 'Card ' + (idx + 1) + ' of ' + order.length;
      if (live) live.textContent = showingDef ? d.term + '. Definition: ' + d.def : 'Term: ' + d.term;
    }

    card.addEventListener('click', function () { showingDef = !showingDef; paint(); });
    document.getElementById('flash-next').addEventListener('click', function () {
      idx = (idx + 1) % order.length; showingDef = false; paint();
    });
    document.getElementById('flash-prev').addEventListener('click', function () {
      idx = (idx - 1 + order.length) % order.length; showingDef = false; paint();
    });
    document.getElementById('flash-shuffle').addEventListener('click', function () {
      shuffle(); idx = 0; showingDef = false; paint();
      if (live) live.textContent = 'Cards shuffled.';
    });

    function setMode(flash) {
      browseWrap.hidden = flash;
      flashWrap.classList.toggle('active', flash);
      modeBrowse.setAttribute('aria-pressed', flash ? 'false' : 'true');
      modeFlash.setAttribute('aria-pressed', flash ? 'true' : 'false');
      if (flash) { paint(); card.focus(); }
    }
    modeBrowse.addEventListener('click', function () { setMode(false); });
    modeFlash.addEventListener('click', function () { setMode(true); });
  }
})();
