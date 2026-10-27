/* Compress a PDF in the browser: pages are re-rendered as JPEG images at the chosen quality. */
(function () {
  const $ = s => document.querySelector(s); let file = null, level = 'medium';
  const L = { high: { scale: 1.0, q: 0.5, label: 'Smallest file' }, medium: { scale: 1.5, q: 0.65, label: 'Balanced' }, low: { scale: 2.0, q: 0.8, label: 'Best quality' } };
  const fmt = b => b > 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(0) + ' KB';
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  function chips() { $('#chips').innerHTML = Object.entries(L).map(([k, v]) => `<button class="chip ${k === level ? 'on' : ''}" data-k="${k}">${v.label}</button>`).join('');
    document.querySelectorAll('#chips button').forEach(b => b.onclick = () => { level = b.dataset.k; chips(); }); }
  async function go() {
    if (!file) return; const { jsPDF } = window.jspdf; const cfg = L[level];
    $('#go').disabled = true; $('#result').hidden = true;
    try {
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; let doc = null;
      for (let p = 1; p <= pdf.numPages; p++) {
        $('#status').textContent = `Compressing page ${p} of ${pdf.numPages}…`;
        const page = await pdf.getPage(p); const vp1 = page.getViewport({ scale: 1 }); const vp = page.getViewport({ scale: cfg.scale });
        const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: x, viewport: vp }).promise;
        const data = c.toDataURL('image/jpeg', cfg.q); const w = vp1.width, h = vp1.height, o = w > h ? 'l' : 'p';
        if (!doc) doc = new jsPDF({ orientation: o, unit: 'pt', format: [w, h], compress: true }); else doc.addPage([w, h], o);
        doc.addImage(data, 'JPEG', 0, 0, w, h, undefined, 'FAST');
      }
      const blob = doc.output('blob'); const u = URL.createObjectURL(blob);
      const smaller = blob.size < file.size;
      $('#status').textContent = smaller ? `Done: ${fmt(file.size)} → ${fmt(blob.size)} (${Math.round((1 - blob.size / file.size) * 100)}% smaller)` : `This PDF is already well compressed (${fmt(file.size)}). Try "Smallest file".`;
      $('#dl').href = u; $('#dl').download = file.name.replace(/\.pdf$/i, '') + '-compressed.pdf'; $('#result').hidden = !smaller;
    } catch (e) { $('#status').textContent = 'This PDF could not be opened (it may be password-protected).'; }
    $('#go').disabled = false;
  }
  function pick(f) { if (!f || !/pdf$/i.test(f.type || f.name)) { $('#status').textContent = 'Please choose a PDF file.'; return; } file = f; $('#status').textContent = `${f.name} · ${fmt(f.size)}`; $('#go').disabled = false; }
  $('#file').onchange = e => pick(e.target.files[0]); $('#go').onclick = go;
  const drop = $('#drop'); drop.addEventListener('dragover', e => e.preventDefault()); drop.addEventListener('drop', e => { e.preventDefault(); pick(e.dataTransfer.files[0]); });
  chips();
})();
