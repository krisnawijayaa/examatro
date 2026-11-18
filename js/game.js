'use strict';
// ===== Config (mudah diubah) =====
const CFG = { hand: 8, max: 5, hands: 4, discards: 3, penalty: 1, spadeChips: 8, heartMult: 2 };
const BASE = [150, 250, 400, 600, 850, 1150, 1500, 2000], MUL = [1, 1.4, 1.8];
const BN = ['Small Blind', 'Big Blind', 'Boss Blind'];
const SUITS = ['♠', '♥', '♣', '♦'], FACE = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const RL = r => FACE[r] || r, CV = r => r === 14 ? 11 : Math.min(r, 10);
const $ = s => document.querySelector(s), sleep = ms => new Promise(r => setTimeout(r, ms));
const sh = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ld = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

// ===== Question bank (dummy; nanti bisa diganti hasil import CSV) =====
const DUM = DUMMY_QUESTIONS.map(([id, m, q, a, b, c, k, e, d]) => ({ id, m, q, o: [a, b, c], k: 'ABC'.indexOf(k), e, d, img: '' }));
let CUSTOM = ld('examatro_custom', []);           // soal hasil import / input manual
const USE_DUMMY = () => localStorage.getItem('examatro_dummy') !== '0';
const BANK = [], QB = {};                          // BANK = soal yang bisa dipilih di mode; QB = semua soal (untuk run yang sedang jalan)
function rebuildBank() {
  BANK.length = 0; Object.keys(QB).forEach(k => delete QB[k]);
  [...DUM, ...CUSTOM].forEach(q => QB[q.id] = q);
  BANK.push(...[...DUM, ...CUSTOM].filter(q => USE_DUMMY() || !DUM.includes(q)));
}
rebuildBank();

// ===== State =====
let R = ld('examatro_run', null), M = ld('examatro_mastery', {}), calc = '', busy = false, view = 'menu', seen = new Set(), playing = [], pst = {}, lnd = false, showSet = false, bp = 0;
const save = () => { localStorage.setItem('examatro_run', JSON.stringify(R)); localStorage.setItem('examatro_mastery', JSON.stringify(M)); };
const card = id => ({ id, r: R.map[id][0], s: R.map[id][1] });
const blankSt = () => ({ best: 0, hands: {}, played: 0, disc: 0, bought: 0, rr: 0, ok: 0, bad: 0 });
if (R) { R.st = R.st || blankSt(); R.jokers = R.jokers || []; }
const PRICE = { common: 4, uncommon: 6, rare: 8 }, JK = id => JOKERS.find(j => j.id === id), dollars = n => '$'.repeat(Math.max(0, n));
const hasJ = id => R.jokers.includes(id), jf = id => { const i = R.jokers.indexOf(id); if (i >= 0) flashJoker(i); };
const rec = (id, ok) => Smart.record(M, id, ok);   // riwayat belajar + jadwal review (selector.js)

function newRun(mode) {
  const ids = sh(BANK.filter(q => mode === 'MIXED' || q.m === mode).map(q => q.id));
  // Hybrid rank/suit: dikocok sekali per run, seimbang (blok 52 kombinasi), disimpan di R.map
  let combos = [];
  for (let i = 0; i < Math.ceil(ids.length / 52); i++) {
    const b = []; for (let r = 2; r <= 14; r++) for (let s = 0; s < 4; s++) b.push([r, s]);
    combos.push(...sh(b));
  }
  const map = {}; ids.forEach((id, i) => map[id] = combos[i]);
  R = { mode, ids, map, ante: 1, bi: 0, money: 4, streak: 0, phase: 'play', jokers: [], st: blankSt(), pile: [...ids], mc: {}, cycle: 0 };
  startBlind();
}
function startBlind() {
  Object.assign(R, { hand: [], sel: [], hands: CFG.hands, disc: CFG.discards, score: 0, phase: 'play',
    target: Math.round(BASE[R.ante - 1] * MUL[R.bi] / 10) * 10 });
  seen = new Set(); bp = 0; draw(); save();
}
function draw() {   // Smart Hybrid: tiap kartu dipilih oleh Smart.pickNext; ID yang sudah dibagikan keluar dari R.pile (seen_in_run)
  while (R.hand.length < CFG.hand) {
    if (!R.pile.length) {   // cadangan: bank lebih kecil dari kebutuhan run -> mulai siklus baru agar game tetap berjalan
      R.pile = R.ids.filter(i => !R.hand.includes(i)); R.cycle = (R.cycle || 0) + 1; R.mc = {}; if (!R.pile.length) break;
    }
    const p = Smart.pickNext({ pile: R.pile, all: R.ids, mode: R.mode, M, QB, mc: R.mc || (R.mc = {}) }); if (!p) break;
    R.pile.splice(R.pile.indexOf(p.id), 1); R.hand.push(p.id); R.mc[p.mod] = (R.mc[p.mod] || 0) + 1;
  }
}

// ===== Question modal =====
function ask(id, i, n) {
  return new Promise(res => {
    const q = QB[id], m = $('#modal'); m.hidden = false; delete m.dataset.done;
    m.innerHTML = `<div class="q"><div class="meta">${q.m} · ${q.d} · Kartu ${i + 1}/${n}</div><h3>${esc(q.q)}</h3>${q.img ? `<img class="qimg" src="${esc(q.img)}" alt="Gambar soal">` : ''}` +
      q.o.map((t, k) => `<button class="opt" data-k="${k}"><b>${'ABC'[k]}</b>${esc(t)}</button>`).join('') + `<div class="fb"></div></div>`;
    m.onclick = e => {
      const b = e.target.closest('.opt'); if (!b || m.dataset.done) return;
      m.dataset.done = 1; const k = +b.dataset.k, ok = k === q.k; m.firstChild.classList.add(ok ? 'good' : 'bad'); pst[id] = ok; sfx(ok ? 'ok' : 'bad');
      m.querySelectorAll('.opt').forEach((o, j) => { o.disabled = true; if (j === q.k) o.classList.add('ok'); else if (j === k) o.classList.add('bad'); });
      m.querySelector('.fb').innerHTML = `<p><strong>${ok ? 'Benar!' : 'Salah.'}</strong> Jawaban: ${'ABC'[q.k]}. ${esc(q.e)}</p><button class="next">${i + 1 < n ? 'Lanjut' : 'Hitung skor'}</button>`;
      m.querySelector('.next').onclick = () => { m.hidden = true; res(ok); };
    };
  });
}

// ===== Play / Discard =====
async function play() {
  if (busy || !R.sel.length || R.phase !== 'play') return;
  busy = true; const ids = [...R.sel], res = [], pw = []; playing = ids; pst = {}; lnd = true; sfx('play'); render(); await sleep(450);
  for (let i = 0; i < ids.length; i++) {
    const pw0 = !!(M[ids[i]] && M[ids[i]].w), ok = await ask(ids[i], i, ids.length); pw.push(pw0 && ok); rec(ids[i], ok); R.streak = ok ? R.streak + 1 : 0; res.push(ok);
  }
  const act = ids.filter((_, i) => res[i]), bad = res.filter(x => !x).length;
  R.st.played += ids.length; R.st.ok += act.length; R.st.bad += bad;
  if (act.length) {
    const ev = evalBest(act.map(card)); let ch = HANDS[ev.idx][1], mu = HANDS[ev.idx][2], step = 0;
    const show = async (t, w, first, fl) => {
      calc = `<div class="hn t${ev.idx}${first ? ' anim' : ''}">${ev.name}</div><div class="cm"><span class="ch${w === 'c' ? ' bump' : ''}">${ch}</span> × <span class="mu${w === 'm' ? ' bump' : ''}">${mu}</span></div><small>${t || ''}</small>`;
      render(); (fl || []).forEach((f, i) => { floatTxt(f[0], f[1], i * 90); if (f[2]) jf(f[2]); }); await sleep(420);
    };
    celebrate(ev.idx); await show('', '', true);
    const pre = [];
    if (hasJ('aviator') && [4, 8, 9].includes(ev.idx)) { ch += 20; pre.push(['+20 Chips', 'c', 'aviator']); }
    if (hasJ('examiner') && !bad) { mu += 3; pre.push(['+3 Mult', 'm', 'examiner']); }
    if (hasJ('technician') && new Set(act.map(i => card(i).r)).size >= 3) { mu += 2; pre.push(['+2 Mult', 'm', 'technician']); }
    if (pre.length) { sfx('tick', 6); await show('Bonus Joker', 'c', false, pre); }
    for (const c of ev.sc) {
      ch += CV(c.r); let t = `${RL(c.r)}${SUITS[c.s]} +${CV(c.r)} chips`, w = 'c', fl = [['+' + CV(c.r), 'c']];
      if (c.s === 0) { ch += CFG.spadeChips; t += ` +${CFG.spadeChips} chips`; fl.push(['+' + CFG.spadeChips, 'c']); }
      if (c.s === 1) { mu += CFG.heartMult; t += ` +${CFG.heartMult} mult`; w = 'm'; fl.push(['+' + CFG.heartMult + ' Mult', 'm']); }
      if (c.s === 2) { const b = Math.min(5, R.streak >> 1); mu += b; t += ` +${b} mult (streak ${R.streak})`; w = 'm'; if (b) fl.push(['+' + b + ' Mult', 'm']); }
      if (c.s === 3) { R.money++; t += ' +$1'; fl.push(['+$1', 'g']); }
      if (hasJ('electrician') && c.s === 0) { mu += 3; w = 'm'; fl.push(['+3 Mult', 'm', 'electrician']); }
      if (hasJ('professor') && pw[ids.indexOf(c.id)]) { mu += 2; w = 'm'; fl.push(['+2 Mult', 'm', 'professor']); }
      if (hasJ('lucky') && Math.random() < .3) { ch += 15; fl.push(['+15', 'c', 'lucky']); }
      sfx('tick', step++); await show(t, w, false, fl);
    }
    const gain = ch * mu, old = R.score; R.score += gain; R.st.hands[ev.name] = (R.st.hands[ev.name] || 0) + 1; R.st.best = Math.max(R.st.best, gain);
    calc = `<div class="hn t${ev.idx}">${ev.name}</div><div class="cm"><span class="ch">${ch}</span> × <span class="mu">${mu}</span> = <b class="gn">${gain}</b></div>`;
    render(); tween(document.querySelector('.gn'), 0, gain, 600); tween(document.querySelector('.sc b'), old, R.score, 800); sfx('score'); await sleep(1000);
  } else { calc = '<div class="hn">Semua jawaban salah</div>'; render(); await sleep(900); }
  R.money = Math.max(0, R.money - bad * CFG.penalty);
  R.hands--; R.hand = R.hand.filter(x => !ids.includes(x)); R.sel = []; playing = []; pst = {}; draw(); calc = ''; busy = false;
  if (R.score >= R.target) { R.cash = { blind: 3 + R.bi, hands: R.hands, interest: Math.min(5, Math.floor(R.money / 5)) }; R.reward = R.cash.blind + R.cash.hands + R.cash.interest; R.phase = (R.ante === 8 && R.bi === 2) ? 'victory' : 'cash'; }
  else if (!R.hands) R.phase = 'lost';
  if (R.phase === 'cash' || R.phase === 'victory') { sfx('win'); burst(60); } else if (R.phase === 'lost') sfx('lose');
  save(); render();
}
async function discard() {
  if (busy || !R.sel.length || R.disc < 1) return;
  busy = true; sfx('disc'); document.querySelectorAll('.card.up').forEach(c => c.classList.add('out')); await sleep(300);
  R.st.disc += R.sel.length; R.hand = R.hand.filter(x => !R.sel.includes(x)); R.sel = []; R.disc--; draw(); busy = false; save(); render();
}
function nextBlind() { if (++R.bi > 2) { R.bi = 0; R.ante++; } startBlind(); }
const sortHand = by => R.hand.sort((a, b) => { const x = card(a), y = card(b); return by === 'r' ? y.r - x.r || x.s - y.s : x.s - y.s || y.r - x.r; });
const rollShop = () => { R.shop.items = sh(JOKERS.filter(j => !hasJ(j.id))).slice(0, 2).map(j => j.id); };
function buy(id) { const p = PRICE[JK(id).r]; if (R.money < p || R.jokers.length >= 5) return; R.money -= p; R.jokers.push(id); R.shop.items = R.shop.items.filter(x => x !== id); R.st.bought++; sfx('ok'); }
function reroll() { const c = 5 + R.shop.rr; if (R.money < c) return; R.money -= c; R.shop.rr++; R.st.rr++; rollShop(); sfx('deal'); }

// ===== Render =====
const prev = () => { if (!R.sel.length) return 'Pilih 1–5 kartu'; const e = evalBest(R.sel.map(card)); return `Jika semua benar: ${e.name} (${HANDS[e.idx][1]} × ${HANDS[e.idx][2]})`; };
const menu = () => `<section class="menu"><h1>EXAMATRO</h1><p class="tag">Master the Questions. Beat the Odds.</p>
  <div class="modes">${['C1', 'C2', 'C4', 'MIXED'].map(m => { const n = BANK.filter(q => m === 'MIXED' || q.m === m).length; return `<button data-mode="${m}" ${n < CFG.hand ? 'disabled' : ''}>${m}<small>${n} soal${n < CFG.hand ? ' (min. ' + CFG.hand + ')' : ''}</small></button>`; }).join('')}</div>
  ${R ? `<div class="btns"><button data-act="cont">Continue Run (${R.mode}, Ante ${R.ante})</button><button class="ghost" data-act="quit">Abandon</button></div>` : ''}<button class="ghost" data-act="prog">Progress</button><button class="ghost" data-act="bank">Bank Soal</button><button class="ghost" data-act="set">Settings</button>${showSet ? `<div class="mask"><div class="q"><h2>Settings</h2><button data-act="snd">Sound: ${SND ? 'ON' : 'OFF'}</button><button data-act="dmy">Soal dummy: ${USE_DUMMY() ? 'ON' : 'OFF'}</button><button class="ghost" data-act="setclose">Tutup</button></div></div>` : ''}</section>`;

function cardHTML(x, cls, attrs, st) {
  const c = `${RL(x.r)}</b><u>${SUITS[x.s]}</u></i>`;
  return `<div class="card${x.s % 2 ? ' red' : ''}${cls}" data-m="${QB[x.id].m}" data-s="${x.s}" ${attrs} style="${st}"><i class="cn"><b>${c}<span class="pip">${SUITS[x.s]}</span><i class="cn bt"><b>${c}<em>${QB[x.id].m}</em></div>`;
}
function updSel() {
  document.querySelectorAll('.card[data-id]').forEach(c => c.classList.toggle('up', R.sel.includes(c.dataset.id)));
  const h = $('.calc .hint'); if (h) h.textContent = prev();
  $('[data-act=play]').disabled = !R.sel.length; $('[data-act=disc]').disabled = !R.sel.length || !R.disc;
}
function shopCard(id) {
  const j = JK(id), p = PRICE[j.r], ok = R.money >= p && R.jokers.length < 5;
  return `<div class="offer"><em class="pt">$${p}</em>${jokerHTML(j, 2)}<button data-act="buy" data-id="${id}" ${ok ? '' : 'disabled'}>Beli</button></div>`;
}
function overHTML(win) {
  const s = R.st, mh = Object.entries(s.hands).sort((a, b) => b[1] - a[1])[0], rd = (R.ante - 1) * 3 + R.bi + 1;
  const row = (l, v) => `<div class="gr"><span>${l}</span><b>${v}</b></div>`;
  return `<div class="mask ${win ? '' : 'lost'}"><div class="q go"><h1>${win ? 'MENANG!' : 'GAME OVER'}</h1><div class="gg">${row('Best Hand', s.best)}${row('Most Played Hand', mh ? mh[0] + ' (' + mh[1] + ')' : '-')}${row('Cards Played', s.played)}${row('Cards Discarded', s.disc)}${row('Jokers Bought', s.bought)}${row('Times Rerolled', s.rr)}${row('Jawaban Benar', s.ok)}${row('Jawaban Salah', s.bad)}${row('Ante', R.ante)}${row('Round', rd)}${row('Mode', R.mode)}${row('Defeated By', win ? '-' : BN[R.bi] + ' · ' + R.target)}</div><div class="btns"><button data-act="again">New Run</button><button class="ghost" data-act="quit">Main Menu</button></div></div></div>`;
}
function game() {
  const ph = R.phase, hand = R.hand.filter(i => !playing.includes(i)).map(card), n = hand.length, pct = Math.min(100, R.score / R.target * 100).toFixed(1);
  const hc = hand.map((x, i) => cardHTML(x, (R.sel.includes(x.id) ? ' up' : '') + (seen.has(x.id) ? '' : ' deal'),
    `data-act="sel" data-id="${x.id}" role="button" tabindex="0"`, `--i:${i};--r:${((i - (n - 1) / 2) * 2).toFixed(1)}deg`)).join('');
  const pc = playing.map((id, i) => cardHTML(card(id), (lnd ? ' land' : '') + (pst[id] === true ? ' right' : pst[id] === false ? ' wrong' : ''), '', `--i:${i}`)).join('');
  const from = bp; bp = +pct; seen = new Set(R.hand); lnd = false;
  const jk = [0, 1, 2, 3, 4].map(i => R.jokers[i] ? jokerHTML(JK(R.jokers[i]), i) : '<i class="slot"><small>Joker</small></i>').join('');
  const head = ph === 'shop' ? `<div class="sign"><b>SHOP</b><small>Belanja untuk run-mu!</small></div>` :
    `<div class="plaque b${R.bi}"><small>Ante ${R.ante} / 8</small><h2>${BN[R.bi]}</h2></div>
    <div class="tgt"><span>Target skor</span><b>${R.target}</b><div class="bar"><i style="width:${from}%" data-w="${pct}"></i></div><span class="sc">Skor ronde <b>${R.score}</b></span></div>`;
  let mid;
  if (ph === 'cash') {
    const c = R.cash, row = (d, a, b, z) => `<div class="crow" style="--d:${d}">${a}<span>${b}</span><i>${dollars(z)}</i></div>`;
    mid = `<div class="panel cash"><button class="cobtn" data-act="cashout">Cash Out: $${R.reward}</button>
      ${row(0, '<span class="coin"></span>', 'Target skor <b>' + R.target + '</b> tercapai', c.blind)}${row(1, '<b>' + c.hands + '</b>', 'Sisa Hands ($1 each)', c.hands)}${row(2, '<b>' + c.interest + '</b>', 'Bunga $1 per $5 (maks 5)', c.interest)}</div>`;
  } else if (ph === 'shop') {
    const rc = 5 + R.shop.rr;
    mid = `<div class="panel shop"><div class="sbtns"><button class="nr" data-act="nextr">Next Round</button><button class="rr" data-act="reroll" ${R.money < rc ? 'disabled' : ''}>Reroll<b>$${rc}</b></button></div>
      <div class="offers">${R.shop.items.map(shopCard).join('') || '<span class="hint">Stok habis. Coba Reroll.</span>'}</div>
      <div class="locks"><div class="lock"><small>Voucher</small><i>Segera hadir</i></div><div class="lock"><small>Booster Pack</small><i>Segera hadir</i></div></div></div>`;
  } else {
    mid = `<div class="center"><div class="played">${pc}</div><div class="calc">${calc || `<span class="hint">${prev()}</span>`}</div></div>
    <div class="hand">${hc}</div>
    <div class="btns"><button class="play" data-act="play" ${!R.sel.length || busy ? 'disabled' : ''}>PLAY HAND</button><div class="sort"><small>Sort Hand</small><button data-act="sortR">Rank</button><button data-act="sortS">Suit</button></div><button class="disc" data-act="disc" ${!R.sel.length || !R.disc || busy ? 'disabled' : ''}>DISCARD (${R.disc})</button></div>`;
  }
  const over = ph === 'victory' ? overHTML(true) : ph === 'lost' ? overHTML(false) : '';
  return `<main class="g"><aside class="hud">${head}
    <div class="tiles"><div class="t th"><span>Hands</span><b>${R.hands}</b></div><div class="t td"><span>Discards</span><b>${R.disc}</b></div>
    <div class="t tm"><span>Uang</span><b>$${R.money}</b></div><div class="t tk"><span>Deck</span><b>${R.pile.length}</b></div></div>
    <button class="ghost" data-act="menu">Menu</button></aside>
    <section class="table${playing.length ? ' focus' : ''} ${ph}"><div class="jokers">${jk}</div>${mid}<div class="pile"><i></i><i></i><i></i><b>${R.pile.length}</b></div></section>${over}</main>`;
}

function render() {
  $('#app').innerHTML = view === 'progress' ? progressView() : view === 'bank' ? bankView() : (R && view === 'game') ? game() : menu();
  const b = $('.bar i'); if (b) requestAnimationFrame(() => requestAnimationFrame(() => b.style.width = b.dataset.w + '%'));
  document.querySelectorAll('.card.deal').forEach((c, i) => setTimeout(() => sfx('deal'), i * 70));
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act],[data-mode]'); if (!t || busy) return;
  if (t.dataset.mode) { if (R && !confirm('Run lama akan dihapus. Mulai run baru?')) return; newRun(t.dataset.mode); view = 'game'; }
  else {
    const a = t.dataset.act;
    if (a === 'sel') { const id = t.dataset.id; R.sel = R.sel.includes(id) ? R.sel.filter(x => x !== id) : (R.sel.length < CFG.max ? [...R.sel, id] : R.sel); save(); sfx('sel'); return updSel(); }
    if (a === 'play') return play();
    if (a === 'disc') return discard();
    if (a === 'next') nextBlind();
    if (a === 'menu') view = 'menu';
    if (a === 'set') showSet = true;
    if (a === 'setclose') showSet = false;
    if (a === 'snd') setSound(!SND);
    if (a === 'dmy') { localStorage.setItem('examatro_dummy', USE_DUMMY() ? '0' : '1'); rebuildBank(); }
    if (a === 'bank') view = 'bank';
    if (a === 'prog') view = 'progress';
    if (a === 'sortR' || a === 'sortS') { sortHand(a === 'sortR' ? 'r' : 's'); save(); }
    if (a === 'cashout') { R.money += R.reward; R.phase = 'shop'; R.shop = { items: [], rr: 0 }; rollShop(); sfx('win'); save(); }
    if (a === 'nextr') nextBlind();
    if (a === 'buy') { buy(t.dataset.id); save(); }
    if (a === 'reroll') { reroll(); save(); }
    if (a === 'again') { const m = R.mode; newRun(m); }
    if (a === 'cont') { view = 'game'; seen = new Set(); }
    if (a === 'quit') { R = null; view = 'menu'; localStorage.removeItem('examatro_run'); }
  }
  render();
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.act === 'sel') { e.preventDefault(); e.target.click(); } });
render();
