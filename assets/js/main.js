/* Global Migration 101 — shared interactions (accessible, no dependencies) */
(function () {
  'use strict';

  /* ---------- Progress store ---------- */
  var STORE_KEY = 'gm101.progress';
  var TOTAL_MODULES = 14;
  function readProgress() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function writeProgress(p) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) { /* private mode */ }
  }
  function countDone(p) {
    var n = 0;
    for (var k in p) { if (p[k]) n++; }
    return n;
  }

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    if (!links.id) links.id = 'site-nav';
    toggle.setAttribute('aria-controls', links.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---------- Active TOC highlighting ---------- */
  var tocLinks = document.querySelectorAll('.toc a');
  var blocks = document.querySelectorAll('.block[id]');
  if (tocLinks.length && blocks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').replace('#', '')] = a; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          tocLinks.forEach(function (a) { a.classList.remove('active'); a.removeAttribute('aria-current'); });
          if (map[e.target.id]) {
            map[e.target.id].classList.add('active');
            map[e.target.id].setAttribute('aria-current', 'true');
          }
        }
      });
    }, { rootMargin: '-72px 0px -70% 0px', threshold: 0 });
    blocks.forEach(function (b) { obs.observe(b); });
  }

  /* ---------- Home page: course progress panel + card badges ---------- */
  var panel = document.getElementById('progress-panel');
  if (panel) {
    var render = function () {
      var p = readProgress();
      var done = countDone(p);
      var pct = Math.round((done / TOTAL_MODULES) * 100);
      panel.querySelector('.pnum').textContent = done + ' of ' + TOTAL_MODULES + ' modules complete';
      panel.querySelector('.ppct').textContent = pct + '%';
      var fill = panel.querySelector('.progress-fill');
      fill.style.width = pct + '%';
      var track = panel.querySelector('.progress-track');
      track.setAttribute('aria-valuenow', String(done));
      document.querySelectorAll('.mod-card[data-module]').forEach(function (card) {
        card.classList.toggle('is-done', !!p[card.getAttribute('data-module')]);
      });
      var reset = panel.querySelector('.preset');
      if (reset) reset.hidden = done === 0;
    };
    render();
    var resetBtn = panel.querySelector('.preset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (confirm('Reset your course progress? This clears all completed-module marks on this device.')) {
          writeProgress({});
          render();
        }
      });
    }
  }

  /* ---------- Module page: mark complete ---------- */
  var completeBtn = document.querySelector('.complete-btn[data-module]');
  function setCompleteState(btn, done) {
    btn.setAttribute('aria-pressed', done ? 'true' : 'false');
    btn.querySelector('.ic').textContent = done ? '✓' : '○';
    btn.querySelector('.txt').textContent = done ? 'Module completed' : 'Mark module complete';
  }
  if (completeBtn) {
    var mid = completeBtn.getAttribute('data-module');
    var p0 = readProgress();
    setCompleteState(completeBtn, !!p0[mid]);
    completeBtn.addEventListener('click', function () {
      var p = readProgress();
      p[mid] = !p[mid];
      writeProgress(p);
      setCompleteState(completeBtn, !!p[mid]);
      var live = document.getElementById('complete-live');
      if (live) live.textContent = p[mid] ? 'Module marked complete.' : 'Module marked incomplete.';
    });
  }

  /* ---------- Knowledge check (quiz) ---------- */
  var quizEl = document.querySelector('.quiz[data-quiz]');
  var quizData = document.getElementById('quiz-data');
  if (quizEl && quizData) {
    var questions;
    try { questions = JSON.parse(quizData.textContent); } catch (e) { questions = []; }
    buildQuiz(quizEl, questions);
  }

  function buildQuiz(root, questions) {
    var form = document.createElement('form');
    form.setAttribute('novalidate', '');
    questions.forEach(function (q, qi) {
      var fs = document.createElement('fieldset');
      fs.className = 'q';
      var lg = document.createElement('legend');
      lg.innerHTML = '<span class="qnum">' + (qi + 1) + '.</span> ';
      lg.appendChild(document.createTextNode(q.q));
      fs.appendChild(lg);
      var opts = document.createElement('div');
      opts.className = 'opts';
      q.options.forEach(function (opt, oi) {
        var label = document.createElement('label');
        label.className = 'opt';
        var input = document.createElement('input');
        input.type = 'radio';
        input.name = 'q' + qi;
        input.value = String(oi);
        label.appendChild(input);
        var span = document.createElement('span');
        span.textContent = opt;
        label.appendChild(span);
        opts.appendChild(label);
      });
      fs.appendChild(opts);
      var verdict = document.createElement('div');
      verdict.className = 'verdict';
      fs.appendChild(verdict);
      form.appendChild(fs);
    });

    var actions = document.createElement('div');
    actions.className = 'quiz-actions';
    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'btn btn-primary';
    submit.textContent = 'Check my answers';
    actions.appendChild(submit);
    var result = document.createElement('p');
    result.className = 'quiz-result';
    result.setAttribute('role', 'status');
    actions.appendChild(result);
    var retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'retry-btn';
    retry.textContent = 'Try again';
    retry.hidden = true;
    actions.appendChild(retry);
    form.appendChild(actions);
    root.appendChild(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fieldsets = form.querySelectorAll('.q');
      var unanswered = [];
      fieldsets.forEach(function (fs, qi) {
        if (!fs.querySelector('input:checked')) unanswered.push(qi + 1);
      });
      if (unanswered.length) {
        result.className = 'quiz-result fail';
        result.textContent = 'Please answer question' + (unanswered.length > 1 ? 's ' : ' ') + unanswered.join(', ') + ' before checking.';
        return;
      }
      var score = 0;
      fieldsets.forEach(function (fs, qi) {
        var q = questions[qi];
        var chosen = fs.querySelector('input:checked');
        var ci = parseInt(chosen.value, 10);
        var good = ci === q.answer;
        if (good) score++;
        fs.classList.add('answered', good ? 'is-correct' : 'is-wrong');
        fs.classList.remove(good ? 'is-wrong' : 'is-correct');
        fs.querySelectorAll('.opt').forEach(function (o) { o.classList.remove('chosen'); });
        chosen.closest('.opt').classList.add('chosen');
        var verdict = fs.querySelector('.verdict');
        verdict.innerHTML = '';
        var tag = document.createElement('span');
        tag.className = 'v-tag';
        tag.textContent = good ? 'Correct.' : 'Not quite.';
        verdict.appendChild(tag);
        var expl = document.createElement('span');
        expl.textContent = (good ? '' : 'Correct answer: ' + q.options[q.answer] + ' — ') + q.why;
        verdict.appendChild(expl);
        fs.querySelectorAll('input').forEach(function (i) { i.disabled = true; });
      });
      var pass = score / questions.length >= 0.75;
      result.className = 'quiz-result ' + (pass ? 'pass' : 'fail');
      result.textContent = 'You scored ' + score + ' out of ' + questions.length + '. ' +
        (pass ? 'Nice work — consider marking this module complete.' : 'Review the feedback above and try again.');
      submit.hidden = true;
      retry.hidden = false;
      retry.focus();
    });

    retry.addEventListener('click', function () {
      form.querySelectorAll('.q').forEach(function (fs) {
        fs.classList.remove('answered', 'is-correct', 'is-wrong');
        fs.querySelectorAll('input').forEach(function (i) { i.disabled = false; i.checked = false; });
        fs.querySelectorAll('.opt').forEach(function (o) { o.classList.remove('chosen'); });
        fs.querySelector('.verdict').innerHTML = '';
      });
      result.textContent = '';
      result.className = 'quiz-result';
      submit.hidden = false;
      retry.hidden = true;
      form.querySelector('input').focus();
    });
  }
})();
