'use strict';
// Dashboard belajar (UI). Logika ada di selector.js (Smart.summary).
const pgPct = (a, b) => b ? Math.round(a / b * 100) : 0;
function progressView() {
  const { all, mod } = Smart.summary(M, BANK.map(q => q.id), QB), acc = pgPct(all.cor, all.att);
  const tile = (l, v, c) => `<div class="t" style="--c:${c}"><span>${l}</span><b>${v}</b></div>`;
  const bar = (a, b) => `<div class="bar"><i style="width:${pgPct(a, b)}%"></i></div>`;
  return `<section class="bank"><div class="bhead"><button class="ghost" data-pg="back">← Kembali</button><h2>Progress Belajar</h2></div>
  <div class="bcard"><div class="tiles pgt">${tile('Total Soal', all.total, '#5b6b7a')}${tile('New', all.NEW, '#3b82f6')}${tile('Incorrect', all.INCORRECT, '#d9453c')}${tile('Weak', all.WEAK, '#f2b84b')}${tile('Due Review', all.due, '#a855f7')}${tile('Mastered', all.MASTERED, '#35c27a')}${tile('Akurasi', acc + '%', '#f6efdc')}</div>
  <p class="note">Sudah dipelajari: ${all.studied} / ${all.total} soal (${pgPct(all.studied, all.total)}%)</p>${bar(all.studied, all.total)}</div>
  ${['C1', 'C2', 'C4'].map(m => { const s = mod[m] || { total: 0, studied: 0, MASTERED: 0, NEW: 0, INCORRECT: 0, WEAK: 0, due: 0, att: 0, cor: 0 };
    return `<div class="bcard"><h3>${m}</h3><p class="note">Dipelajari ${s.studied}/${s.total} · Mastered ${s.MASTERED} · New ${s.NEW} · Incorrect ${s.INCORRECT} · Weak ${s.WEAK} · Due ${s.due} · Akurasi ${pgPct(s.cor, s.att)}%</p>${bar(s.studied, s.total)}</div>`; }).join('')}</section>`;
}
document.addEventListener('click', e => { if (e.target.closest('[data-pg=back]')) { view = 'menu'; render(); } });
