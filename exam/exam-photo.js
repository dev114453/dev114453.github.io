/* Exam photo & signature resizer (FitMyPDF Web). Runs entirely in this browser tab: nothing is uploaded.
   Same approach as /tools/image-kb.js (best JPEG quality that fits, then smaller pixels if needed),
   plus exam presets: a KB range (min and max), an exact pixel size or a cm shape where the notice gives one.
   Limits are kept safe for both readings of "KB": under max x 1000 bytes and over min x 1024 bytes. */
(function () {
  'use strict';
  var root = document.getElementById('photo');
  if (!root) return;
  var HI = document.documentElement.lang === 'hi';
  var S = HI ? {
    notImg: 'कृपया JPG, PNG या WebP फ़ोटो चुनें।',
    noOpen: 'यह फ़ोटो ब्राउज़र में नहीं खुली (HEIC फ़ोटो हो तो पहले JPG में शेयर करें)।',
    working: 'छोटा कर रहे हैं…',
    orig: function (s, w, h) { return 'ओरिजिनल: ' + s + ' · ' + w + ' × ' + h + ' px'; },
    cant: 'इस पिक्सेल साइज़ पर इतना छोटा नहीं हो पाया। फ़ोटो को थोड़ा क्रॉप करके फिर से आज़माएँ।',
    done: function (s, b, w, h) { return s + ' (' + b + ' bytes) · ' + w + ' × ' + h + ' px · JPG'; },
    fits: function (r) { return 'सही साइज़: ' + r + '।'; },
    padded: 'फ़ोटो वही है; न्यूनतम साइज़ तक पहुँचने के लिए फ़ाइल में एक अदृश्य comment जोड़ा गया।',
    pick: 'पहले ऊपर से डॉक्यूमेंट चुनें।'
  } : {
    notImg: 'Please choose a JPG, PNG or WebP image.',
    noOpen: 'This image could not be opened in the browser (HEIC photos: share as JPG first).',
    working: 'Working…',
    orig: function (s, w, h) { return 'Original: ' + s + ' · ' + w + ' × ' + h + ' px'; },
    cant: 'Could not get this small at the required pixel size. Crop the picture a little tighter and try again.',
    done: function (s, b, w, h) { return s + ' (' + b + ' bytes) · ' + w + ' × ' + h + ' px · JPG'; },
    fits: function (r) { return 'Fits the limit: ' + r + '.'; },
    padded: 'Picture unchanged; an invisible comment was added to the file to reach the minimum size.',
    pick: 'Pick the document first.'
  };
  function $(s) { return root.querySelector(s); }
  var chips = Array.prototype.slice.call(root.querySelectorAll('.chips button'));
  var fileIn = $('#pf'), drop = $('.drop'), status = $('#pst'), origP = $('#porig'), res = $('#pres'),
      prev = $('#pprev'), info = $('#pinfo'), notes = $('#pnotes'), dl = $('#pdl'), desc = $('#pdesc');
  var cur = null, img = null, name = 'photo', outUrl = null, busy = false, again = false;
  var fmtKB = function (b) { return (b / 1024).toFixed(1) + ' KB'; };

  function pick(b) {
    cur = {
      key: b.dataset.key || 'photo', min: +b.dataset.min || 0, max: +b.dataset.max || 0,
      w: +b.dataset.w || 0, h: +b.dataset.h || 0, ratio: +b.dataset.ratio || 0,
      face: b.dataset.face === '1', range: b.dataset.range || ''
    };
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
    if (desc) desc.textContent = b.dataset.desc || '';
    if (img) run();
  }
  chips.forEach(function (b) { b.addEventListener('click', function () { pick(b); }); });
  if (chips.length) pick(chips[0]);

  function blobQ(c, q) { return new Promise(function (r) { c.toBlob(r, 'image/jpeg', q); }); }

  function geometry() {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var ratio = cur.w && cur.h ? cur.w / cur.h : cur.ratio;
    var sx = 0, sy = 0, sw = iw, sh = ih;
    if (ratio) {
      sw = iw; sh = iw / ratio;
      if (sh > ih) { sh = ih; sw = ih * ratio; }
      sx = (iw - sw) / 2;
      sy = cur.face ? Math.min(ih - sh, Math.max(0, (ih - sh) * 0.15)) : (ih - sh) / 2;
    }
    var w, h;
    if (cur.w && cur.h) { w = cur.w; h = cur.h; }
    else {
      var cap = 1200, k = Math.min(1, cap / Math.max(sw, sh));
      w = Math.max(16, Math.round(sw * k)); h = Math.max(16, Math.round(sh * k));
    }
    return { sx: sx, sy: sy, sw: sw, sh: sh, w: w, h: h, fixed: !!(cur.w && cur.h) };
  }
  function draw(g, w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(img, g.sx, g.sy, g.sw, g.sh, 0, 0, w, h);
    return c;
  }
  /* Pad a JPEG with COM (comment) segments right after SOI: valid JPEG, picture unchanged. */
  function pad(buf, need) {
    var src = new Uint8Array(buf), parts = [src.subarray(0, 2)], left = need;
    while (left > 0) {
      var n = Math.min(65533, Math.max(1, left - 4));
      var seg = new Uint8Array(4 + n); seg[0] = 0xFF; seg[1] = 0xFE; seg[2] = ((n + 2) >> 8) & 255; seg[3] = (n + 2) & 255;
      for (var i = 4; i < seg.length; i++) seg[i] = 0x20;
      parts.push(seg); left -= seg.length;
    }
    parts.push(src.subarray(2));
    return new Blob(parts, { type: 'image/jpeg' });
  }
  async function run() {
    if (!img || !cur) return;
    if (busy) { again = true; return; }
    busy = true; again = false;
    try {
      status.textContent = S.working; res.hidden = true;
      var maxB = cur.max * 1000, minB = cur.min ? cur.min * 1024 + 256 : 0;
      var g = geometry(), w = g.w, h = g.h, best = null;
      for (var step = 0; step < 14 && !best; step++) {
        var c = draw(g, w, h), lo = 0.05, hi = 0.92, found = null;
        var top = await blobQ(c, hi);
        if (top.size <= maxB) found = top;
        else {
          for (var k = 0; k < 9; k++) { var q = (lo + hi) / 2, b = await blobQ(c, q); if (b.size <= maxB) { found = b; lo = q; } else hi = q; }
          if (!found) { var b2 = await blobQ(c, 0.05); if (b2.size <= maxB) found = b2; }
        }
        if (found) best = { blob: found, w: w, h: h };
        else if (g.fixed) break;
        else { w = Math.max(16, Math.round(w * 0.85)); h = Math.max(16, Math.round(h * 0.85)); }
      }
      if (!best) { status.textContent = S.cant; return; }
      var blob = best.blob, padded = false;
      if (minB && blob.size < minB) { blob = pad(await blob.arrayBuffer(), minB - blob.size); padded = true; }
      if (outUrl) URL.revokeObjectURL(outUrl);
      outUrl = URL.createObjectURL(blob);
      prev.src = outUrl; dl.href = outUrl;
      dl.download = (root.dataset.exam || 'exam') + '-' + cur.key + '.jpg';
      info.textContent = S.done(fmtKB(blob.size), blob.size.toLocaleString('en-IN'), best.w, best.h);
      notes.innerHTML = '';
      var li = document.createElement('li'); li.textContent = S.fits(cur.range); notes.appendChild(li);
      if (padded) { var l2 = document.createElement('li'); l2.textContent = S.padded; notes.appendChild(l2); }
      status.textContent = ''; res.hidden = false;
    } catch (e) {
      status.textContent = String(e && e.message || e);
    } finally {
      busy = false; if (again) run();
    }
  }
  function load(file) {
    if (!file || !/^image\//.test(file.type)) { status.textContent = S.notImg; return; }
    name = file.name;
    var u = URL.createObjectURL(file), i = new Image();
    i.onload = function () { img = i; origP.hidden = false; origP.textContent = S.orig(fmtKB(file.size), i.naturalWidth, i.naturalHeight); run(); };
    i.onerror = function () { status.textContent = S.noOpen; };
    i.src = u;
  }
  fileIn.addEventListener('change', function (e) { load(e.target.files[0]); });
  ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files[0]) load(e.dataTransfer.files[0]); });
  $('#pagain').addEventListener('click', function () { img = null; fileIn.value = ''; res.hidden = true; origP.hidden = true; status.textContent = ''; });
  root.dataset.ready = '1';
})();
