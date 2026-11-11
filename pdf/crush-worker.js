/* FitMyPDF Web encoder worker: scales a page image and encodes it as JPEG. Runs on this device only. */
'use strict';
const cache = new Map();
function toGray(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const y = (p[i] * 77 + p[i + 1] * 150 + p[i + 2] * 29) >> 8;
    p[i] = p[i + 1] = p[i + 2] = y;
  }
  ctx.putImageData(d, 0, 0);
}
self.onmessage = async (e) => {
  const m = e.data;
  if (m.op === 'clear') { cache.forEach(b => b.close && b.close()); cache.clear(); return; }
  try {
    let bmp = m.key != null ? cache.get(m.key) : null;
    if (!bmp) { bmp = await createImageBitmap(m.src); if (m.key != null) cache.set(m.key, bmp); }
    const c = new OffscreenCanvas(m.w, m.h), x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, m.w, m.h);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(bmp, 0, 0, m.w, m.h);
    if (m.key == null && bmp.close) bmp.close();
    if (m.gray) toGray(x, m.w, m.h);
    const b = await c.convertToBlob({ type: 'image/jpeg', quality: m.q });
    const buf = await b.arrayBuffer();
    self.postMessage({ id: m.id, buf }, [buf]);
  } catch (err) {
    self.postMessage({ id: m.id, err: String(err && err.message || err) });
  }
};
