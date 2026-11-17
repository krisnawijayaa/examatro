'use strict';
// SMART HYBRID: pemilihan soal adaptif + spaced repetition. Murni logika (tanpa DOM) agar mudah diuji dan diubah.
// Riwayat per soal (M[id]): a=attempts, c=correct, w=incorrect, cc=consecutive_correct, f=first_attempted_at, t=last_attempted_at,
// nr=next_review_at, lr=last_answer_result, ms=mastery_status, acc=accuracy.
const Smart = (() => {
  const DAY = 864e5, INTERVAL_DAYS = [1, 3, 7, 14], MASTER_STREAK = 3, WEAK_ACC = .7;
  const RATIO = { high: .8, mid: .65 }, POOLW = { INC: 50, WEAK: 30, REV: 15, MAS: 5 };

  // Normalisasi rekaman (kompatibel dengan rekaman lama {a,c,w,t})
  const norm = m => { if (!m || !m.a) return null; return { ...m, lr: m.lr || (m.c > 0 ? 'correct' : 'incorrect'), cc: m.cc ?? (m.w ? 0 : m.c), acc: m.c / m.a }; };
  // Kategori: NEW, INCORRECT, WEAK, REVIEW, MASTERED
  const cat = m => {
    const n = norm(m); if (!n) return 'NEW';
    if (n.cc >= MASTER_STREAK) return 'MASTERED';
    if (n.lr === 'incorrect') return 'INCORRECT';
    if (n.w > 0 && n.acc < WEAK_ACC) return 'WEAK';
    return 'REVIEW';
  };
  const status = m => { const c = cat(m); return c === 'NEW' ? 'new' : c === 'MASTERED' ? 'mastered' : c === 'REVIEW' ? 'familiar' : 'learning'; };

  function record(M, id, ok, now = Date.now()) {
    const m = M[id] || (M[id] = { a: 0, c: 0, w: 0, cc: 0 }), p = norm(m);
    if (p) { m.cc = p.cc; m.lr = p.lr; }
    m.a++; m.f = m.f || now; m.t = now; m.lr = ok ? 'correct' : 'incorrect';
    if (ok) { m.c++; m.cc = (m.cc || 0) + 1; m.nr = now + INTERVAL_DAYS[Math.min(m.cc, 4) - 1] * DAY; }
    else { m.w++; m.cc = 0; m.nr = now; }          // salah: langsung eligible, streak reset, status kembali learning
    m.acc = +(m.c / m.a).toFixed(3); m.ms = status(m); return m;
  }

  const wpick = (list, wf, rnd) => {
    const w = list.map(wf); let r = rnd() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) if ((r -= w[i]) < 0) return list[i];
    return list[list.length - 1];
  };

  // ctx: pile (ID yang belum keluar di run ini), all (semua ID run), mode, M, QB, mc (jumlah kartu per modul yang sudah dibagikan di run)
  function pickNext({ pile, all, mode, M, QB, mc = {}, now = Date.now(), rnd = Math.random }) {
    const mods = [...new Set(pile.map(i => QB[i].m))]; if (!mods.length) return null;
    let mod = mods[0];
    if (mode === 'MIXED') {   // seimbang: modul dengan rasio (sudah dibagikan / total modul) terendah dulu
      const tot = x => all.filter(i => QB[i].m === x).length || 1, ratio = x => (mc[x] || 0) / tot(x);
      const lo = Math.min(...mods.map(ratio)), c = mods.filter(x => ratio(x) <= lo + 1e-9); mod = c[rnd() * c.length | 0];
    }
    const bank = all.filter(i => QB[i].m === mod), newFrac = bank.filter(i => !M[i] || !M[i].a).length / bank.length;
    const pNew = newFrac > .5 ? RATIO.high : newFrac > 0 ? RATIO.mid : 0;
    const el = pile.filter(i => QB[i].m === mod), news = el.filter(i => cat(M[i]) === 'NEW'), rest = el.filter(i => cat(M[i]) !== 'NEW');
    if ((rnd() < pNew && news.length) || !rest.length) return { id: wpick(news, () => 1, rnd), src: 'NEW', mod };
    const G = { INC: [], WEAK: [], REV: [], MAS: [] };
    rest.forEach(i => { const c = cat(M[i]); if (c === 'INCORRECT') G.INC.push(i); else if (c === 'WEAK') G.WEAK.push(i); else if (c === 'MASTERED') G.MAS.push(i); else if ((M[i].nr ?? 0) <= now) G.REV.push(i); });
    if (!Object.values(G).some(g => g.length)) G.REV.push(...rest);   // belum ada yang jatuh tempo: tetap lanjut
    const k = wpick(Object.keys(G).filter(x => G[x].length), x => POOLW[x], rnd);   // bobot didistribusi ulang otomatis
    const wf = { INC: i => 1 + 2 * M[i].w, WEAK: i => 1 + 3 * (1 - M[i].c / M[i].a) + .5 * M[i].w, REV: i => 1 + Math.min(7, Math.max(0, (now - (M[i].nr ?? now)) / DAY)), MAS: () => 1 }[k];
    return { id: wpick(G[k], wf, rnd), src: k, mod };
  }

  function summary(M, ids, QB, now = Date.now()) {
    const z = () => ({ total: 0, NEW: 0, INCORRECT: 0, WEAK: 0, REVIEW: 0, MASTERED: 0, due: 0, studied: 0, att: 0, cor: 0 }), all = z(), mod = {};
    ids.forEach(id => {
      const m = M[id], c = cat(m), t = mod[QB[id].m] || (mod[QB[id].m] = z());
      [all, t].forEach(s => { s.total++; s[c]++; if (m && m.a) { s.studied++; s.att += m.a; s.cor += m.c; if ((m.nr ?? 0) <= now) s.due++; } });
    });
    return { all, mod };
  }
  return { DAY, INTERVAL_DAYS, cat, status, record, pickNext, summary, norm };
})();
