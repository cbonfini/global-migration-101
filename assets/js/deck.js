/* Global Migration 101 — accessible slide engine (no dependencies)
   Keyboard: ←/→/PageUp/PageDown navigate, Home/End jump, N toggles notes.
   Deep links: #/5 opens slide 5. Narration audio per slide (optional). */
(function () {
  'use strict';

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  if (!slides.length) return;
  var total = slides.length;
  var current = -1;

  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var counter = document.getElementById('deckCounter');
  var fill = document.getElementById('progressFill');
  var announcer = document.getElementById('announcer');
  var notesBtn = document.getElementById('notesToggle');
  var notesPanel = document.getElementById('notesPanel');
  var narrBtn = document.getElementById('narrToggle');
  var player = document.getElementById('narrPlayer');
  var narrOn = false;

  function slideLabel(i) {
    var h = slides[i].querySelector('h1, h2');
    return 'Slide ' + (i + 1) + ' of ' + total + (h ? ': ' + h.textContent : '');
  }

  function renderNotes(i) {
    if (!notesPanel) return;
    var src = slides[i].querySelector('.slide-notes');
    notesPanel.innerHTML = '<h2>Notes &amp; transcript — slide ' + (i + 1) + '</h2>' +
      (src ? src.innerHTML : '<p>No notes for this slide.</p>');
  }

  function go(i, focusSlide) {
    if (i < 0 || i >= total || i === current) return;
    if (current >= 0) {
      slides[current].classList.remove('active');
      slides[current].setAttribute('aria-hidden', 'true');
    }
    current = i;
    var s = slides[i];
    s.classList.add('active');
    s.removeAttribute('aria-hidden');
    counter.textContent = (i + 1) + ' / ' + total;
    fill.style.width = (((i + 1) / total) * 100) + '%';
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === total - 1;
    if (history.replaceState) history.replaceState(null, '', '#/' + (i + 1));
    announcer.textContent = slideLabel(i);
    renderNotes(i);
    if (focusSlide) { s.setAttribute('tabindex', '-1'); s.focus({ preventScroll: false }); }
    window.scrollTo({ top: 0 });
    playNarration(i);
  }

  /* ---------- Narration ---------- */
  function playNarration(i) {
    if (!player) return;
    player.pause();
    var src = slides[i].getAttribute('data-audio');
    if (narrOn && src) {
      player.src = src;
      player.play().catch(function () { /* autoplay blocked until user gesture */ });
    }
  }
  if (narrBtn && player) {
    narrBtn.addEventListener('click', function () {
      narrOn = !narrOn;
      narrBtn.setAttribute('aria-pressed', narrOn ? 'true' : 'false');
      if (narrOn) {
        playNarration(current);
        announcer.textContent = 'Narration on.';
      } else {
        player.pause();
        announcer.textContent = 'Narration off.';
      }
    });
    // Auto-advance when narration for a slide ends
    player.addEventListener('ended', function () {
      if (narrOn && current < total - 1) go(current + 1);
    });
  }

  /* ---------- Notes panel ---------- */
  if (notesBtn && notesPanel) {
    notesBtn.addEventListener('click', function () {
      var open = notesPanel.hidden;
      notesPanel.hidden = !open;
      notesBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) notesPanel.focus();
    });
  }

  /* ---------- Controls ---------- */
  prevBtn.addEventListener('click', function () { go(current - 1, true); });
  nextBtn.addEventListener('click', function () { go(current + 1, true); });

  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input, textarea, select')) return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': case ' ':
        if (e.key === ' ' && e.target.closest('button, a, summary')) return;
        e.preventDefault(); go(current + 1); break;
      case 'ArrowLeft': case 'PageUp':
        e.preventDefault(); go(current - 1); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End': e.preventDefault(); go(total - 1); break;
      case 'n': case 'N':
        if (notesBtn) notesBtn.click(); break;
    }
  });

  /* ---------- Touch swipe (with generous threshold) ---------- */
  var touchX = null, touchY = null;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    var dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) go(current + 1); else go(current - 1);
    }
    touchX = touchY = null;
  }, { passive: true });

  /* ---------- Init: aria + deep link ---------- */
  slides.forEach(function (s, i) {
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', 'slide');
    s.setAttribute('aria-label', 'Slide ' + (i + 1) + ' of ' + total);
    s.setAttribute('aria-hidden', 'true');
  });
  var start = 0;
  var m = location.hash.match(/^#\/(\d+)$/);
  if (m) start = Math.min(total - 1, Math.max(0, parseInt(m[1], 10) - 1));
  go(start);

  window.addEventListener('hashchange', function () {
    var m2 = location.hash.match(/^#\/(\d+)$/);
    if (m2) go(Math.min(total - 1, Math.max(0, parseInt(m2[1], 10) - 1)));
  });

  /* ---------- Print: reveal everything ---------- */
  window.addEventListener('beforeprint', function () {
    slides.forEach(function (s) { s.classList.add('active'); s.removeAttribute('aria-hidden'); });
  });
  window.addEventListener('afterprint', function () {
    slides.forEach(function (s, i) {
      if (i !== current) { s.classList.remove('active'); s.setAttribute('aria-hidden', 'true'); }
    });
  });
})();
