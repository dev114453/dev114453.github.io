/* Resize/compress a photo to a target size in KB, entirely in the browser. */
(function () {
  const $ = s => document.querySelector(s);
  const T = window.TOOL || {}; let img = null, name = 'photo', target = T.kb || 50, out = null;
  const fmtKB = b => (b / 1024).toFixed(1) + ' KB';
  function chips() {
    $('#chips').innerHTML = [10, 20, 50, 100, 200, 500].map(k => `<button class="chip ${k === target ? 'on' : ''}" data-k="${k}">${k} KB</button>`).join('');
    document.querySelectorAll('#chips button').forEach(b => b.onclick = () => { target = +b.dataset.k; $('#kb').value = target; chips(); run(); });
  }
  function canvasBlob(c, q) { return new Promise(r => c.toBlob(r, 'image/jpeg', q)); }
  function draw(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.imageSmoothingQuality = 'high';
    if (T.exact) { // crop to the required shape, then scale: keeps faces undistorted
      const iw = img.naturalWidth, ih = img.naturalHeight, r = w / h; let sw = iw, sh = iw / r;
      if (sh > ih) { sh = ih; sw = ih * r; }
      const pos = ($('#pos') && $('#pos').value) || 'top'; const sx = (iw - sw) / 2;
      const sy = pos === 'top' ? Math.min((ih - sh), Math.max(0, (ih - sh) * 0.15)) : (ih - sh) / 2;
      x.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    } else x.drawImage(img, 0, 0, w, h);
    return c;
  }
  async function run() {
    if (!img) return;
    const limit = target * 1024; let w = +$('#w').value || img.naturalWidth, h = +$('#h').value || Math.round(img.naturalHeight * w / img.naturalWidth);
    $('#status').textContent = 'Working…';
    let best = null;
    for (let step = 0; step < 12; step++) {
      const c = draw(w, h); let lo = 0.05, hi = 0.95, found = null;
      for (let k = 0; k < 8; k++) { const q = (lo + hi) / 2; const b = await canvasBlob(c, q); if (b.size <= limit) { found = b; lo = q; } else hi = q; }
      if (!found) { const b = await canvasBlob(c, 0.05); if (b.size <= limit) found = b; }
      if (found) { best = { blob: found, w, h }; break; }
      if (T.exact) break;
      w = Math.max(16, Math.round(w * 0.85)); h = Math.max(16, Math.round(h * 0.85));
    }
    if (!best) { $('#status').textContent = 'Could not get that small at this pixel size. Try a larger KB limit.'; return; }
    if (T.minKb && best.blob.size < T.minKb * 1024) $('#status').dataset.warn = '1';
    out = best; if (out.url) URL.revokeObjectURL(out.url); out.url = URL.createObjectURL(best.blob);
    $('#preview').src = out.url; $('#result').hidden = false;
    $('#status').textContent = `Done: ${fmtKB(best.blob.size)} · ${best.w} × ${best.h} px · JPG (target ${target} KB)`;
    $('#dl').href = out.url; $('#dl').download = name.replace(/\.[^.]+$/, '') + `-${target}kb.jpg`;
  }
  function load(file) {
    if (!file || !/^image\//.test(file.type)) { $('#status').textContent = 'Please choose a JPG, PNG or WebP image.'; return; }
    name = file.name; const u = URL.createObjectURL(file); const i = new Image();
    i.onload = () => { img = i; $('#orig').textContent = `Original: ${fmtKB(file.size)} · ${i.naturalWidth} × ${i.naturalHeight} px`; $('#w').value = T.w || ''; $('#h').value = T.h || ''; run(); };
    if (T.exact) { $('#w').value = T.w; $('#h').value = T.h; }
    i.onerror = () => { $('#status').textContent = 'This image could not be opened in the browser (HEIC photos: share as JPG first).'; };
    i.src = u;
  }
  $('#file').onchange = e => load(e.target.files[0]);
  const drop = $('#drop'); ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.style.background = 'rgba(59,130,246,.08)'; }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.style.background = ''; }));
  drop.addEventListener('drop', e => load(e.dataTransfer.files[0]));
  $('#kb').value = target; $('#kb').onchange = () => { target = Math.max(5, +$('#kb').value || 50); chips(); run(); };
  $('#w').onchange = $('#h').onchange = run; if ($('#pos')) $('#pos').onchange = run;
  if (T.exact) { ['#w', '#h'].forEach(k => { $(k).readOnly = true; }); }
  if (T.chips === false) $('#chips').style.display = 'none'; else chips();
})();
