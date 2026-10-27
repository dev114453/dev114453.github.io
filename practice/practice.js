/* Practice test engine: one question per group (like the real exam) or every question in a topic. Runs fully in the browser. */
(function () {
  const cfg = window.EXAM; const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app'); let pool = null, qs = [], i = 0, answers = [], mode = 'exam';
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };

  function start(part, topic) {
    const p = cfg.parts[part]; mode = topic ? 'topic' : 'exam';
    const all = pool.questions.filter(q => q.id.startsWith(p.prefix));
    if (topic) qs = all.filter(q => q.s === topic);
    else {
      const groups = {}; all.forEach(q => (groups[q.g] = groups[q.g] || []).push(q));
      const ord = g => g.replace(/^([A-Z])0/, '$1Z'); qs = Object.keys(groups).sort((x, y) => ord(x).localeCompare(ord(y))).map(g => groups[g][Math.floor(Math.random() * groups[g].length)]);
      if (cfg.shuffleOrder) shuffle(qs);
    }
    i = 0; answers = new Array(qs.length).fill(-1); app.dataset.part = part; render();
    window.scrollTo({ top: app.offsetTop - 12 });
  }

  function render() {
    const q = qs[i], a = answers[i], p = cfg.parts[app.dataset.part];
    const done = answers.filter(x => x >= 0).length, right = answers.filter((x, k) => x === qs[k].c).length;
    app.innerHTML = `<div class="bar"><span>Question ${i + 1} of ${qs.length}</span><span>${right} correct · ${done - right} wrong</span></div>
      <div class="prog"><i style="width:${(done / qs.length) * 100}%"></i></div>
      <p class="qid">${esc(q.id)}${q.r ? ' · ' + esc(q.r) : ''}</p><h3 class="q">${esc(q.q)}</h3>
      ${q.f ? `<img class="fig" src="${cfg.figBase}${esc(q.f)}.png" alt="Figure ${esc(q.f)}" loading="lazy">` : ''}
      <ol class="opts">${q.a.map((t, k) => `<li><button data-k="${k}" class="${a < 0 ? '' : k === q.c ? 'ok' : k === a ? 'bad' : 'dim'}" ${a >= 0 ? 'disabled' : ''}><b>${'ABCD'[k]}</b> ${esc(t)}</button></li>`).join('')}</ol>
      ${a >= 0 && q.x ? `<p class="exp"><b>Why:</b> ${esc(q.x)}</p>` : ''}
      <div class="nav"><button class="sec" id="prev" ${i ? '' : 'disabled'}>Back</button>
      ${i < qs.length - 1 ? `<button id="next" ${a < 0 ? 'class="sec"' : ''}>Next</button>` : `<button id="finish">Finish</button>`}</div>
      <p class="small">Pass mark: ${p.pass} of ${p.n} (${Math.round(p.pass / p.n * 100)}%).</p>`;
    app.querySelectorAll('.opts button').forEach(b => b.onclick = () => { answers[i] = +b.dataset.k; render(); });
    $('#prev', app) && ($('#prev', app).onclick = () => { i--; render(); });
    $('#next', app) && ($('#next', app).onclick = () => { i++; render(); });
    $('#finish', app) && ($('#finish', app).onclick = finish);
  }

  function finish() {
    const p = cfg.parts[app.dataset.part];
    const right = answers.filter((x, k) => x === qs[k].c).length, n = qs.length;
    const pct = Math.round(right / n * 100), pass = mode === 'exam' ? right >= p.pass : pct >= Math.round(p.pass / p.n * 100);
    const key = 'best-' + cfg.id + '-' + app.dataset.part; const best = Math.max(+(store.get(key) || 0), mode === 'exam' ? pct : 0);
    if (mode === 'exam') store.set(key, best);
    const wrong = qs.map((q, k) => ({ q, a: answers[k] })).filter(x => x.a !== x.q.c);
    app.innerHTML = `<div class="result ${pass ? 'pass' : 'fail'}"><h3>${pass ? 'Pass' : 'Not yet'}: ${right} of ${n} (${pct}%)</h3>
      <p>${mode === 'exam' ? (pass ? 'You would have passed this practice exam. Aim for 85% or more three times in a row before the real one.' : `You need ${p.pass} to pass. Review the questions below and try again.`) : 'Topic practice finished.'}${best && mode === 'exam' ? ` Your best on this device: ${best}%.` : ''}</p></div>
      <div class="cta">${cfg.cta}</div>
      <div class="nav"><button id="again">New practice exam</button></div>
      ${wrong.length ? `<h3>Review (${wrong.length})</h3>` + wrong.map(x => `<div class="rev"><p class="qid">${esc(x.q.id)}</p><p>${esc(x.q.q)}</p><p class="okt">Correct: ${'ABCD'[x.q.c]}. ${esc(x.q.a[x.q.c])}</p>${x.q.x ? `<p class="exp">${esc(x.q.x)}</p>` : ''}${x.a >= 0 ? `<p class="badt">Your answer: ${'ABCD'[x.a]}. ${esc(x.q.a[x.a])}</p>` : '<p class="badt">Not answered</p>'}</div>`).join('') : ''}`;
    $('#again', app).onclick = () => start(app.dataset.part);
    window.scrollTo({ top: app.offsetTop - 12 });
  }

  function menu() {
    const parts = Object.keys(cfg.parts);
    const topics = part => pool.subelements.filter(s => s.id.startsWith(cfg.parts[part].prefix.replace('-', '')) || (cfg.parts[part].subPrefix && s.id.startsWith(cfg.parts[part].subPrefix)));
    app.innerHTML = parts.map(part => { const p = cfg.parts[part]; return `<div class="card"><h3>${esc(p.title)}</h3><p>${p.n} questions, one from each topic group, just like the real exam. ${p.pass} correct to pass.</p>
      <button data-start="${part}">Start practice exam</button>
      <details><summary>Or practise one topic</summary><ul class="topics">${topics(part).map(s => `<li><a href="#" data-part="${part}" data-topic="${s.id}">${esc(s.id)} · ${esc(s.title)}</a></li>`).join('')}</ul></details></div>`; }).join('');
    app.querySelectorAll('[data-start]').forEach(b => b.onclick = () => start(b.dataset.start));
    app.querySelectorAll('[data-topic]').forEach(a => a.onclick = e => { e.preventDefault(); start(a.dataset.part, a.dataset.topic); });
  }

  fetch(cfg.data).then(r => r.json()).then(d => { pool = d; menu(); }).catch(() => { app.innerHTML = '<p>Could not load the questions. Please reload the page.</p>'; });
})();
