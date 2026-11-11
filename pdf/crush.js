/* FitMyPDF Web: compress PDFs, make PDFs from images and merge PDFs, entirely in this browser.
   No uploads, no analytics, no cookies. Libraries (pdf.js, pdf-lib) are served from this same site. */
(function () {
  'use strict';
  const BASE = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
  const KB = 1024, MB = 1048576;
  const root = document.getElementById('crush');
  if (!root) return;
  const MODE = root.dataset.mode || 'compress';
  const LANG = document.documentElement.lang === 'hi' ? 'hi' : 'en';

  const T = {
    en: {
      choose: 'Choose PDF', chooseImg: 'Choose images', chooseMerge: 'Choose PDFs', drop: 'or drop here',
      go: 'Compress PDF', goImg: 'Make PDF', goMerge: 'Merge PDFs', loading: 'Loading the PDF engine…',
      reading: 'Reading the PDF…', render: (a, b) => `Preparing page ${a} of ${b}…`, fitting: 'Finding the best quality for your target…',
      encoding: (a, b) => `Compressing page ${a} of ${b}…`, building: 'Building the PDF…', padding: 'Adding padding to reach the minimum…',
      merging: (a, b) => `Adding file ${a} of ${b}…`, cancelled: 'Cancelled. Nothing was saved.',
      before: 'Before', after: 'After', download: 'Download PDF', again: 'Start over',
      pages: n => n === 1 ? '1 page' : n + ' pages', smaller: p => `${p}% smaller`, bigger: p => `${p}% bigger`,
      hitTarget: t => `Under your ${t} limit.`, inRange: (a, b) => `Within your ${a} to ${b} range.`,
      already: t => `This PDF is already under ${t}, so no compression is needed. You can upload the original as it is.`,
      alreadyRange: (a, b) => `This PDF is already between ${a} and ${b}. You can upload it as it is.`,
      alreadyMin: t => `This PDF is already at least ${t}. No change needed.`,
      unreachable: (t, s) => `We could not get this PDF under ${t}. The smallest we could make is ${s}. Try grayscale, remove pages you don't need, or split the file.`,
      autoGray: 'Switched to grayscale to fit the limit.',
      noGain: s => `This PDF is already compact (${s}); converting its pages to images would not make it smaller. Download the original instead, or pick a smaller target.`,
      padded: 'Content unchanged. Invisible padding was added to the file’s metadata to reach the minimum size.',
      raster: 'Pages were converted to images, so text in this copy cannot be selected or searched.',
      badPdf: 'This file could not be read as a PDF. It may be damaged.',
      locked: 'This PDF is password-protected. Enter the password:', lockedFail: 'Wrong password or locked PDF. Remove the password first.',
      encMerge: n => `"${n}" is password-protected and cannot be merged here.`,
      notPdf: 'Please choose a PDF file.', notImg: 'Please choose JPG, PNG or WebP images.',
      needTwo: 'Choose at least two PDFs to merge.', custom: 'Custom', anySize: 'Any size',
      bigWarn: 'Large file: this can take a minute. Keep this tab open.',
      merged: n => `Merged ${n} files. Text and links are kept as they were.`,
      up: 'Move up', down: 'Move down', remove: 'Remove', minLabel: 'Minimum', customErr: 'Enter a size of at least 10 KB.',
      minErr: 'The minimum must be smaller than the maximum.', err: 'Something went wrong: ',
      selected: (n, s) => `${n} · ${s}`, files: n => n === 1 ? '1 file' : n + ' files'
    },
    hi: {
      choose: 'PDF चुनें', chooseImg: 'फ़ोटो चुनें', chooseMerge: 'PDF चुनें', drop: 'या यहाँ छोड़ें',
      go: 'PDF छोटा करें', goImg: 'PDF बनाएँ', goMerge: 'PDF जोड़ें', loading: 'PDF इंजन लोड हो रहा है…',
      reading: 'PDF पढ़ी जा रही है…', render: (a, b) => `पेज ${a} / ${b} तैयार हो रहा है…`, fitting: 'आपके साइज़ के लिए सबसे अच्छी क्वालिटी ढूँढ रहे हैं…',
      encoding: (a, b) => `पेज ${a} / ${b} कम्प्रेस हो रहा है…`, building: 'PDF बन रही है…', padding: 'न्यूनतम साइज़ के लिए padding जोड़ रहे हैं…',
      merging: (a, b) => `फ़ाइल ${a} / ${b} जोड़ रहे हैं…`, cancelled: 'रद्द कर दिया। कुछ सेव नहीं हुआ।',
      before: 'पहले', after: 'बाद में', download: 'PDF डाउनलोड करें', again: 'नई फ़ाइल',
      pages: n => n + ' पेज', smaller: p => `${p}% छोटी`, bigger: p => `${p}% बड़ी`,
      hitTarget: t => `${t} की लिमिट के अंदर।`, inRange: (a, b) => `${a} से ${b} की रेंज के अंदर।`,
      already: t => `यह PDF पहले से ${t} से छोटी है, कम्प्रेस करने की ज़रूरत नहीं। ओरिजिनल ही अपलोड करें।`,
      alreadyRange: (a, b) => `यह PDF पहले से ${a} और ${b} के बीच है। इसे वैसे ही अपलोड कर सकते हैं।`,
      alreadyMin: t => `यह PDF पहले से कम से कम ${t} की है। कुछ बदलने की ज़रूरत नहीं।`,
      unreachable: (t, s) => `यह PDF ${t} से छोटी नहीं हो पाई। सबसे छोटी ${s} बनी। Grayscale आज़माएँ, फ़ालतू पेज हटाएँ या फ़ाइल को बाँट दें।`,
      autoGray: 'लिमिट में लाने के लिए grayscale (ब्लैक एंड व्हाइट) किया गया।',
      noGain: s => `यह PDF पहले से compact है (${s}); पेजों को इमेज बनाने से यह छोटी नहीं होगी। ओरिजिनल डाउनलोड करें या छोटा टारगेट चुनें।`,
      padded: 'कंटेंट वही है। न्यूनतम साइज़ तक पहुँचने के लिए फ़ाइल के metadata में अदृश्य padding जोड़ी गई।',
      raster: 'पेज इमेज में बदले गए हैं, इसलिए इस कॉपी का टेक्स्ट सेलेक्ट या सर्च नहीं होगा।',
      badPdf: 'यह फ़ाइल PDF के रूप में नहीं खुली। शायद ख़राब है।',
      locked: 'यह PDF पासवर्ड से लॉक है। पासवर्ड डालें:', lockedFail: 'पासवर्ड ग़लत है या PDF लॉक है। पहले पासवर्ड हटाएँ।',
      encMerge: n => `"${n}" पासवर्ड से लॉक है, इसे यहाँ नहीं जोड़ सकते।`,
      notPdf: 'कृपया PDF फ़ाइल चुनें।', notImg: 'कृपया JPG, PNG या WebP फ़ोटो चुनें।',
      needTwo: 'जोड़ने के लिए कम से कम दो PDF चुनें।', custom: 'अपना साइज़', anySize: 'कोई भी साइज़',
      bigWarn: 'बड़ी फ़ाइल: इसमें एक मिनट लग सकता है। यह टैब खुला रखें।',
      merged: n => `${n} फ़ाइलें जोड़ दी गईं। टेक्स्ट और लिंक वैसे ही हैं।`,
      up: 'ऊपर', down: 'नीचे', remove: 'हटाएँ', minLabel: 'न्यूनतम', customErr: 'कम से कम 10 KB का साइज़ डालें।',
      minErr: 'न्यूनतम साइज़ अधिकतम से कम होना चाहिए।', err: 'कुछ गड़बड़ हुई: ',
      selected: (n, s) => `${n} · ${s}`, files: n => n + ' फ़ाइलें'
    }
  }[LANG];

  const $ = (s) => root.querySelector(s);
  const fmt = (b) => b >= MB ? (b / MB).toFixed(2).replace(/\.?0+$/, '') + ' MB' : (b < 10 * KB ? (b / KB).toFixed(1) : Math.round(b / KB)) + ' KB';
  const fmtLimit = (b) => b >= MB && b % (MB / 4) === 0 ? (b / MB) + ' MB' : Math.round(b / KB) + ' KB';
  const tick = () => new Promise((r) => setTimeout(r, 0));
  class Cancel extends Error {}
  let cancelled = false;
  const check = () => { if (cancelled) throw new Cancel('cancelled'); };

  /* ---------- lazy library loading (same-origin files) ---------- */
  const loaded = {};
  function loadScript(name) {
    if (!loaded[name]) loaded[name] = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + name; s.async = true;
      s.onload = res; s.onerror = () => { loaded[name] = null; rej(new Error('Could not load ' + name)); };
      document.head.appendChild(s);
    });
    return loaded[name];
  }
  async function needPdfjs() { await loadScript('pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + 'pdf.worker.min.js'; return window.pdfjsLib; }
  async function needPdfLib() { await loadScript('pdf-lib.min.js'); return window.PDFLib; }

  /* ---------- JPEG encoder pool (Web Workers with OffscreenCanvas, main-thread fallback) ---------- */
  const Pool = {
    ws: [], busy: [], cb: new Map(), seq: 0, tried: false,
    init() {
      if (this.tried) return; this.tried = true;
      try {
        if (typeof OffscreenCanvas === 'undefined' || !OffscreenCanvas.prototype.convertToBlob) return;
        const n = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
        for (let i = 0; i < n; i++) {
          const w = new Worker(BASE + 'crush-worker.js');
          w.onmessage = (e) => { const c = this.cb.get(e.data.id); this.cb.delete(e.data.id); this.busy[i]--; if (c) e.data.err ? c[1](new Error(e.data.err)) : c[0](e.data.buf); };
          w.onerror = () => {};
          this.ws.push(w); this.busy.push(0);
        }
      } catch (e) { this.ws = []; }
    },
    encode(job) {
      this.init();
      if (!this.ws.length) return encodeMain(job);
      let i;
      if (job.key != null) i = job.key % this.ws.length;
      else { i = 0; for (let j = 1; j < this.ws.length; j++) if (this.busy[j] < this.busy[i]) i = j; }
      const id = ++this.seq; this.busy[i]++;
      return new Promise((res, rej) => { this.cb.set(id, [res, rej]); this.ws[i].postMessage(Object.assign({ id }, job)); });
    },
    clear() { this.ws.forEach((w) => w.postMessage({ op: 'clear' })); }
  };
  const mainCache = new Map();
  async function encodeMain(job) {
    let bmp = job.key != null ? mainCache.get(job.key) : null;
    if (!bmp) { bmp = await createImageBitmap(job.src); if (job.key != null) mainCache.set(job.key, bmp); }
    const c = document.createElement('canvas'); c.width = job.w; c.height = job.h;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, job.w, job.h);
    x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, job.w, job.h);
    if (job.gray) { const d = x.getImageData(0, 0, job.w, job.h), p = d.data; for (let i = 0; i < p.length; i += 4) { const y = (p[i] * 77 + p[i + 1] * 150 + p[i + 2] * 29) >> 8; p[i] = p[i + 1] = p[i + 2] = y; } x.putImageData(d, 0, 0); }
    const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', job.q));
    await tick();
    return b.arrayBuffer();
  }
  function clearCaches() { Pool.clear(); mainCache.forEach((b) => b.close && b.close()); mainCache.clear(); }

  /* ---------- engine ---------- */
  const MASTER_DPI = 150, MAX_PX = 3.6e6;
  const LEVELS = { small: { dpi: 96, q: 0.5, qMax: 0.75 }, balanced: { dpi: 120, q: 0.68, qMax: 0.85 }, best: { dpi: 150, q: 0.82, qMax: 0.9 } };
  const LADDER = [150, 132, 120, 108, 96, 86, 76, 68, 60, 52, 45, 38, 32];
  const QMIN = 0.12, QOK = 0.32;
  const canvasToBlob = (c, q) => new Promise((r) => c.toBlob(r, 'image/jpeg', q));

  async function renderMasters(pdf, prog) {
    const out = [], n = pdf.numPages;
    const c = document.createElement('canvas'), x = c.getContext('2d', { alpha: false });
    for (let p = 1; p <= n; p++) {
      check(); prog(T.render(p, n), (p - 1) / n * 0.45);
      const page = await pdf.getPage(p);
      const v1 = page.getViewport({ scale: 1 });
      let scale = MASTER_DPI / 72;
      if (v1.width * v1.height * scale * scale > MAX_PX) scale = Math.sqrt(MAX_PX / (v1.width * v1.height));
      const vp = page.getViewport({ scale });
      c.width = Math.max(1, Math.round(vp.width)); c.height = Math.max(1, Math.round(vp.height));
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: x, viewport: vp }).promise;
      const blob = await canvasToBlob(c, 0.92);
      out.push({ blob, pw: v1.width, ph: v1.height, px: c.width, py: c.height, mdpi: scale * 72 });
      page.cleanup();
      await tick();
    }
    c.width = c.height = 1;
    return out;
  }

  function dims(m, dpi) {
    const f = Math.min(1, dpi / m.mdpi);
    return [Math.max(1, Math.round(m.px * f)), Math.max(1, Math.round(m.py * f))];
  }
  async function encodeAll(masters, dpi, q, gray, prog, p0, p1) {
    let done = 0; const n = masters.length;
    const res = await Promise.all(masters.map((m) => {
      const [w, h] = dims(m, dpi);
      return Pool.encode({ src: m.blob, w, h, q, gray }).then((b) => { done++; if (!cancelled) prog(T.encoding(done, n), p0 + (p1 - p0) * done / n); return b; });
    }));
    check();
    return res;
  }
  async function buildPdf(masters, jpegs, prog) {
    const PDFLib = await needPdfLib();
    prog && prog(T.building, null);
    const doc = await PDFLib.PDFDocument.create();
    doc.setProducer('FitMyPDF Web'); doc.setCreator('FitMyPDF Web');
    for (let i = 0; i < jpegs.length; i++) {
      const img = await doc.embedJpg(jpegs[i]);
      const pg = doc.addPage([masters[i].pw, masters[i].ph]);
      pg.drawImage(img, { x: 0, y: 0, width: masters[i].pw, height: masters[i].ph });
      if (i % 20 === 19) { await tick(); check(); }
    }
    return doc.save({ useObjectStreams: true });
  }

  /* Pick the DPI and JPEG quality that land just under the target, by binary search on sample pages,
     then verify with the real file and correct. */
  async function fitTarget(masters, target, level, gray, prog) {
    const L = LEVELS[level], n = masters.length;
    const ladder = LADDER.filter((d) => d <= L.dpi);
    const ns = Math.min(n, 6), idx = [];
    for (let i = 0; i < ns; i++) idx.push(ns === 1 ? 0 : Math.round(i * (n - 1) / (ns - 1)));
    const all = masters.reduce((a, m) => a + m.blob.size, 0), samp = idx.reduce((a, i) => a + masters[i].blob.size, 0);
    const scaleF = all / samp, overhead = 1200 + 420 * n;
    const memo = new Map();
    const est = async (dpi, q) => {
      const k = dpi + '|' + q.toFixed(3);
      if (!memo.has(k)) {
        check();
        const sizes = await Promise.all(idx.map((i, j) => { const [w, h] = dims(masters[i], dpi); return Pool.encode({ src: masters[i].blob, w, h, q, gray, key: j }).then((b) => b.byteLength); }));
        memo.set(k, sizes.reduce((a, b) => a + b, 0) * scaleF + overhead);
      }
      return memo.get(k);
    };
    let kcal = 1;
    async function choose(goal) {
      let fallback = null;
      for (let li = 0; li < ladder.length; li++) {
        const dpi = ladder[li], last = li === ladder.length - 1;
        prog(T.fitting, 0.5 + 0.2 * li / ladder.length);
        if (await est(dpi, L.qMax) * kcal <= goal) return { dpi, q: L.qMax, fits: true, top: li === 0 };
        if (await est(dpi, QMIN) * kcal > goal) continue;
        let lo = QMIN, hi = L.qMax;
        for (let it = 0; it < 7; it++) { const mid = (lo + hi) / 2; if (await est(dpi, mid) * kcal <= goal) lo = mid; else hi = mid; }
        const r = { dpi, q: lo, fits: true, top: false };
        if (lo >= QOK || last) return r;
        if (!fallback) fallback = r;
      }
      return fallback || { dpi: ladder[ladder.length - 1], q: QMIN, fits: false, top: false };
    }
    let bestUnder = null, smallest = null;
    const goal = target * 0.97;
    for (let attempt = 0; attempt < 4; attempt++) {
      const ch = await choose(goal);
      const jp = await encodeAll(masters, ch.dpi, ch.q, gray, prog, 0.72, 0.95);
      const bytes = await buildPdf(masters, jp, prog);
      const size = bytes.length;
      if (!smallest || size < smallest.length) smallest = bytes;
      if (size <= target && (!bestUnder || size > bestUnder.length)) bestUnder = bytes;
      const e = await est(ch.dpi, ch.q);
      if (size <= target) {
        if (size >= target * 0.88 || ch.top || !ch.fits) break;
      } else if (!ch.fits) break;
      kcal = size / e;
    }
    clearCaches();
    return bestUnder ? { bytes: bestUnder, ok: true } : { bytes: smallest, ok: false };
  }

  async function padTo(bytes, minBytes, prog) {
    const PDFLib = await needPdfLib();
    prog && prog(T.padding, 0.97);
    const want = Math.ceil(minBytes * 1.02) + 64;
    let extra = Math.max(0, want - bytes.length), out = bytes;
    for (let i = 0; i < 4; i++) {
      const doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
      const head = '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/"><pdf:Producer>FitMyPDF Web</pdf:Producer></rdf:Description></rdf:RDF></x:xmpmeta>\n';
      const line = ' '.repeat(99) + '\n';
      const pad = line.repeat(Math.max(0, Math.ceil(extra / 100)));
      const xmp = new TextEncoder().encode(head + pad + '<?xpacket end="w"?>');
      const st = doc.context.stream(xmp, { Type: 'Metadata', Subtype: 'XML' });
      doc.catalog.set(PDFLib.PDFName.of('Metadata'), doc.context.register(st));
      out = await doc.save({ useObjectStreams: false });
      if (out.length >= minBytes) break;
      extra += (want - out.length);
    }
    return out;
  }

  async function openPdf(bytes) {
    const pdfjsLib = await needPdfjs();
    const task = pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false });
    let asked = 0;
    task.onPassword = (cb, reason) => {
      if (asked++ > 2) { task.destroy(); return; }
      const p = window.prompt(T.locked); if (p == null) { task.destroy(); return; } cb(p);
    };
    try { return await task.promise; } catch (e) {
      if (e && e.name === 'PasswordException') throw new Error(T.lockedFail);
      if (cancelled) throw new Cancel('cancelled');
      throw new Error(asked ? T.lockedFail : T.badPdf);
    }
  }

  /* ---------- UI ---------- */
  const fileIn = $('#f'), drop = $('.drop'), go = $('#go'), progBox = $('#prog'), bar = $('#prog i'), ptext = $('#pt'), resBox = $('#res');
  const fileInfo = $('#fi'), err = $('#err');
  let files = [];
  let target = parseInt(root.dataset.target || '0', 10) || 0;
  let minSize = parseInt(root.dataset.min || '0', 10) || 0;
  const minOnly = root.dataset.minonly === '1';

  function setErr(t) { err.textContent = t || ''; err.hidden = !t; }
  function prog(t, f) { ptext.textContent = t; if (f != null) bar.style.transform = `scaleX(${Math.max(0.02, Math.min(1, f))})`; }

  // target chips
  const chips = root.querySelectorAll('.chips button');
  const customRow = $('#customRow'), cv = $('#cv'), cu = $('#cu');
  function markChips() {
    let matched = false;
    chips.forEach((b) => {
      const v = b.dataset.v; let on = false;
      if (v === 'custom') on = !customRow.hidden;
      else if (customRow.hidden && parseInt(v, 10) === target) { on = true; matched = true; }
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    return matched;
  }
  chips.forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.v === 'custom') { customRow.hidden = false; cv.focus(); readCustom(); }
    else { customRow.hidden = true; target = parseInt(b.dataset.v, 10) || 0; }
    markChips(); syncGo();
  }));
  function readCustom() {
    const v = parseFloat(cv.value); if (!v) { target = 0; return; }
    target = Math.round(v * (cu.value === 'MB' ? MB : KB));
  }
  if (cv) { cv.addEventListener('input', () => { readCustom(); syncGo(); }); cu.addEventListener('change', () => { readCustom(); syncGo(); }); }
  if (chips.length && !markChips() && target) { customRow.hidden = false; cv.value = Math.round(target / KB); markChips(); }

  // minimum size
  const minOn = $('#minOn'), minRow = $('#minRow'), mv = $('#mv');
  if (minOn) {
    if (minSize) { minOn.checked = true; minRow.hidden = false; mv.value = Math.round(minSize / KB); }
    minOn.addEventListener('change', () => { minRow.hidden = !minOn.checked; readMin(); if (minOn.checked) mv.focus(); });
    mv.addEventListener('input', readMin);
  }
  function readMin() { minSize = minOn && minOn.checked ? Math.round((parseFloat(mv.value) || 0) * KB) : 0; syncGo(); }

  const level = () => { const r = root.querySelector('input[name=lvl]:checked'); return r ? r.value : 'balanced'; };
  const grayOn = () => { const g = $('#gray'); return !!(g && g.checked); };

  function syncGo() { go.disabled = !files.length || (MODE === 'merge' && files.length < 2); }

  function accept(list) {
    setErr(''); resBox.hidden = true;
    const arr = Array.from(list || []);
    if (MODE === 'images') {
      const ok = arr.filter((f) => /^image\/(jpeg|png|webp|gif|bmp)$/.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));
      if (!ok.length) { setErr(T.notImg); return; }
      files = files.concat(ok);
    } else {
      const ok = arr.filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
      if (!ok.length) { setErr(T.notPdf); return; }
      files = MODE === 'merge' ? files.concat(ok) : [ok[0]];
    }
    showFiles(); syncGo();
    needPdfLib().catch(() => {}); if (MODE === 'compress') needPdfjs().catch(() => {});
  }
  function showFiles() {
    if (!files.length) { fileInfo.hidden = true; fileInfo.innerHTML = ''; return; }
    fileInfo.hidden = false;
    if (files.length === 1 && MODE === 'compress') {
      fileInfo.textContent = T.selected(files[0].name, fmt(files[0].size)) + (files[0].size > 40 * MB ? ' · ' + T.bigWarn : '');
      return;
    }
    fileInfo.innerHTML = '';
    const ol = document.createElement('ol'); ol.className = 'flist';
    files.forEach((f, i) => {
      const li = document.createElement('li');
      const nm = document.createElement('span'); nm.className = 'fn'; nm.textContent = `${f.name} · ${fmt(f.size)}`; li.appendChild(nm);
      const mk = (lab, sym, fn, dis) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'mini'; b.textContent = sym; b.setAttribute('aria-label', lab + ': ' + f.name); b.disabled = !!dis; b.onclick = fn; li.appendChild(b); };
      mk(T.up, '↑', () => { [files[i - 1], files[i]] = [files[i], files[i - 1]]; showFiles(); }, i === 0);
      mk(T.down, '↓', () => { [files[i + 1], files[i]] = [files[i], files[i + 1]]; showFiles(); }, i === files.length - 1);
      mk(T.remove, '✕', () => { files.splice(i, 1); showFiles(); syncGo(); });
      ol.appendChild(li);
    });
    fileInfo.appendChild(ol);
  }
  fileIn.addEventListener('change', () => { accept(fileIn.files); fileIn.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => accept(e.dataTransfer.files));

  $('#cancel').addEventListener('click', () => { cancelled = true; prog(T.cancelled, null); });

  let lastUrl = null;
  function showResult(bytes, origSize, notes, name, kind) {
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    lastUrl = URL.createObjectURL(blob);
    $('#rb').textContent = origSize ? fmt(origSize) : '–';
    $('#ra').textContent = fmt(blob.size);
    let delta = '';
    if (origSize) { const p = Math.round((1 - blob.size / origSize) * 100); delta = p > 0 ? T.smaller(p) : p < 0 ? T.bigger(-p) : ''; }
    $('#rd').textContent = delta;
    const ul = $('#rn'); ul.innerHTML = '';
    notes.filter(Boolean).forEach((t) => { const li = document.createElement('li'); li.textContent = t; if (t[0] === '!') { li.className = 'warn'; li.textContent = t.slice(1); } ul.appendChild(li); });
    const a = $('#dl'); a.href = lastUrl; a.download = name;
    resBox.dataset.kind = kind || 'ok';
    resBox.hidden = false;
    resBox.setAttribute('data-size', String(blob.size));
    a.focus({ preventScroll: true });
    resBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  $('#again').addEventListener('click', () => { files = []; showFiles(); resBox.hidden = true; setErr(''); syncGo(); drop.querySelector('label').focus(); });

  const baseName = (f) => (f && f.name || 'document').replace(/\.(pdf|jpe?g|png|webp)$/i, '').slice(0, 60);
  const suffix = () => target ? '-' + fmtLimit(target).replace(' ', '') : '-compressed';

  async function runCompress() {
    const f = files[0];
    const orig = new Uint8Array(await f.arrayBuffer());
    const size = orig.length, notes = [];
    if (minSize && target && minSize >= target) throw new Error(T.minErr);
    // Nothing to do / only grow
    if (target && size <= target && (!minSize || size >= minSize)) {
      return showResult(orig, size, [minSize ? T.alreadyRange(fmtLimit(minSize), fmtLimit(target)) : T.already(fmtLimit(target))], f.name, 'same');
    }
    if (!target && minSize) {
      if (size >= minSize) return showResult(orig, size, [T.alreadyMin(fmtLimit(minSize))], f.name, 'same');
      prog(T.loading, 0.3);
      const out = await padTo(orig, minSize, prog);
      return showResult(out, size, [T.padded], baseName(f) + '-' + fmtLimit(minSize).replace(' ', '') + '.pdf', 'grow');
    }
    if (target && minSize && size < minSize) {
      const out = await padTo(orig, minSize, prog);
      return showResult(out, size, [T.padded, T.inRange(fmtLimit(minSize), fmtLimit(target))], baseName(f) + suffix() + '.pdf', 'grow');
    }
    prog(T.loading, 0.02);
    await needPdfLib();
    prog(T.reading, 0.04);
    const pdf = await openPdf(orig);
    check();
    const masters = await renderMasters(pdf, prog);
    pdf.destroy();
    let gray = grayOn(), out, ok = true;
    if (!target) {
      const L = LEVELS[level()];
      const jp = await encodeAll(masters, L.dpi, L.q, gray, prog, 0.45, 0.95);
      out = await buildPdf(masters, jp, prog);
      if (out.length >= size) return showResult(orig, size, [T.noGain(fmt(size))], f.name, 'same');
    } else {
      let r = await fitTarget(masters, target, level(), gray, prog);
      if (!r.ok && !gray) {
        const r2 = await fitTarget(masters, target, level(), true, prog);
        if (r2.ok || r2.bytes.length < r.bytes.length) { r = r2; gray = true; if (r2.ok) notes.push(T.autoGray); }
      }
      out = r.bytes; ok = r.ok;
      if (!ok) notes.push('!' + T.unreachable(fmtLimit(target), fmt(out.length)));
      else notes.push(minSize ? T.inRange(fmtLimit(minSize), fmtLimit(target)) : T.hitTarget(fmtLimit(target)));
      if (ok && minSize && out.length < minSize) { out = await padTo(out, minSize, prog); notes.push(T.padded); }
    }
    notes.push(T.pages(masters.length) + ' · ' + T.raster);
    showResult(out, size, notes, baseName(f) + suffix() + '.pdf', ok ? 'ok' : 'fail');
  }

  async function runImages() {
    const fitPage = (root.querySelector('input[name=pg]:checked') || { value: 'a4' }).value;
    const masters = [], A4 = [595.28, 841.89];
    const c = document.createElement('canvas'), x = c.getContext('2d', { alpha: false });
    let total = 0;
    for (let i = 0; i < files.length; i++) {
      check(); prog(T.render(i + 1, files.length), i / files.length * 0.45);
      total += files[i].size;
      const bmp = await createImageBitmap(files[i]);
      let pw, ph, px, py, dx, dy, dw, dh;
      if (fitPage === 'a4') {
        const land = bmp.width > bmp.height; pw = land ? A4[1] : A4[0]; ph = land ? A4[0] : A4[1];
        px = Math.round(pw / 72 * MASTER_DPI); py = Math.round(ph / 72 * MASTER_DPI);
        const m = Math.round(px * 0.04), s = Math.min((px - 2 * m) / bmp.width, (py - 2 * m) / bmp.height);
        dw = Math.round(bmp.width * s); dh = Math.round(bmp.height * s); dx = Math.round((px - dw) / 2); dy = Math.round((py - dh) / 2);
      } else {
        let s = Math.min(1, Math.sqrt(MAX_PX / (bmp.width * bmp.height)));
        px = Math.round(bmp.width * s); py = Math.round(bmp.height * s); dx = dy = 0; dw = px; dh = py;
        pw = px / MASTER_DPI * 72; ph = py / MASTER_DPI * 72;
        if (pw > 1400) { const k = 1400 / pw; pw *= k; ph *= k; }
      }
      c.width = px; c.height = py; x.fillStyle = '#fff'; x.fillRect(0, 0, px, py);
      x.imageSmoothingQuality = 'high'; x.drawImage(bmp, dx, dy, dw, dh); bmp.close && bmp.close();
      const blob = await canvasToBlob(c, 0.92);
      masters.push({ blob, pw, ph, px, py, mdpi: px / pw * 72 });
      await tick();
    }
    c.width = c.height = 1;
    let gray = grayOn(), out, ok = true; const notes = [];
    if (!target) {
      const L = LEVELS[level()];
      out = await buildPdf(masters, await encodeAll(masters, L.dpi, L.q, gray, prog, 0.45, 0.95), prog);
    } else {
      let r = await fitTarget(masters, target, level(), gray, prog);
      if (!r.ok && !gray) { const r2 = await fitTarget(masters, target, level(), true, prog); if (r2.ok || r2.bytes.length < r.bytes.length) { r = r2; if (r2.ok) notes.push(T.autoGray); } }
      out = r.bytes; ok = r.ok;
      notes.push(ok ? T.hitTarget(fmtLimit(target)) : '!' + T.unreachable(fmtLimit(target), fmt(out.length)));
      if (ok && minSize && out.length < minSize) { out = await padTo(out, minSize, prog); notes.push(T.padded); }
    }
    notes.push(T.pages(masters.length));
    showResult(out, total, notes, (files.length === 1 ? baseName(files[0]) : 'images') + (target ? suffix() : '') + '.pdf', ok ? 'ok' : 'fail');
  }

  async function runMerge() {
    const PDFLib = await needPdfLib();
    const outDoc = await PDFLib.PDFDocument.create(); let total = 0;
    for (let i = 0; i < files.length; i++) {
      check(); prog(T.merging(i + 1, files.length), i / files.length * 0.9);
      const b = new Uint8Array(await files[i].arrayBuffer()); total += b.length;
      let src;
      try { src = await PDFLib.PDFDocument.load(b); } catch (e) {
        if (/encrypt/i.test(String(e && e.message))) throw new Error(T.encMerge(files[i].name));
        throw new Error(T.badPdf + ' (' + files[i].name + ')');
      }
      const pages = await outDoc.copyPages(src, src.getPageIndices());
      pages.forEach((p) => outDoc.addPage(p));
      await tick();
    }
    outDoc.setProducer('FitMyPDF Web');
    prog(T.building, 0.95);
    const out = await outDoc.save({ useObjectStreams: true });
    showResult(out, total, [T.merged(files.length), T.pages(outDoc.getPageCount())], 'merged.pdf', 'ok');
  }

  go.addEventListener('click', async () => {
    setErr('');
    if (customRow && !customRow.hidden && (!target || target < 10 * KB)) { setErr(T.customErr); cv.focus(); return; }
    if (minSize && target && minSize >= target) { setErr(T.minErr); return; }
    cancelled = false; resBox.hidden = true; progBox.hidden = false; go.disabled = true;
    root.classList.add('busy'); prog(T.loading, 0.01);
    try {
      if (MODE === 'images') await runImages(); else if (MODE === 'merge') await runMerge(); else await runCompress();
    } catch (e) {
      if (!(e instanceof Cancel)) { setErr((e && e.message && /^(This|Wrong|"|यह|पासवर्ड|न्यूनतम|कम से कम)/.test(e.message)) ? e.message : T.err + (e && e.message || e)); console.error(e); }
    } finally {
      clearCaches(); progBox.hidden = true; root.classList.remove('busy'); syncGo();
    }
  });
  // test hook (no network use): lets automated tests read the last result size
  root.dataset.ready = '1';
})();
