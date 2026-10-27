/* Live market status: computes each exchange's local time and whether its regular session is open now. */
(function () {
  const X = window.MARKETS, H = window.HOLIDAYS || {};
  const parts = (tz, d) => { const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
    const o = {}; f.formatToParts(d).forEach(p => o[p.type] = p.value); return { date: `${o.year}-${o.month}-${o.day}`, wd: o.weekday, min: (+o.hour % 24) * 60 + +o.minute, hm: `${o.hour % 24}:${o.minute}`.replace(/^(\d):/, '0$1:') }; };
  const m = s => { const [h, mm] = s.split(':').map(Number); return h * 60 + mm; };
  function status(x, now) {
    const p = parts(x.tz, now); const hol = (H[x.cal] || {})[p.date]; const early = (H[x.cal + '_early'] || {})[p.date];
    if (p.wd === 'Sat' || p.wd === 'Sun') return { open: false, why: 'Weekend', p };
    if (hol) return { open: false, why: 'Holiday: ' + hol, p };
    const sess = x.sessions.map(s => [m(s[0]), m(early && s === x.sessions[x.sessions.length - 1] ? early : s[1])]);
    for (const [a, b] of sess) if (p.min >= a && p.min < b) return { open: true, why: `Open until ${String(Math.floor(b / 60)).padStart(2, '0')}:${String(b % 60).padStart(2, '0')}${early ? ' (early close)' : ''}`, p };
    if (p.min < sess[0][0]) return { open: false, why: `Opens at ${x.sessions[0][0]}`, p };
    for (let k = 0; k < sess.length - 1; k++) if (p.min >= sess[k][1] && p.min < sess[k + 1][0]) return { open: false, why: `Lunch break, reopens ${x.sessions[k + 1][0]}`, p };
    return { open: false, why: 'Closed for the day', p };
  }
  function render() {
    const now = new Date(); const el = document.getElementById('mk'); if (!el) return;
    el.innerHTML = X.map(x => { const s = status(x, now); return `<tr><td><b>${x.name}</b><br><span class="small">${x.city}</span></td><td>${s.p.hm}<br><span class="small">${s.p.wd}</span></td>
      <td>${x.sessions.map(z => z.join('–')).join(', ')}</td><td><span class="pill ${s.open ? 'on' : 'off'}">${s.open ? 'Open' : 'Closed'}</span><br><span class="small">${s.why}</span></td></tr>`; }).join('');
    const us = X.find(x => x.id === 'nyse'); const a = document.getElementById('answer');
    if (a && us) { const s = status(us, now); a.innerHTML = s.open ? `<b>Yes.</b> The US stock market (NYSE and Nasdaq) is open right now. ${s.why}, New York time.` : `<b>No.</b> The US stock market is closed right now (${s.why.toLowerCase()}). Regular hours are 9:30 am to 4:00 pm New York time, Monday to Friday.`;
      a.className = 'answer ' + (s.open ? 'on' : 'off'); }
  }
  render(); setInterval(render, 30000);
})();
