'use strict';
// Efek visual & suara (WebAudio sintetis, tanpa aset). Tidak mengubah logika gameplay.
let SND = localStorage.getItem('examatro_sound') !== '0', AC = null, armed = false;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.addEventListener('pointerdown', () => armed = true, { once: true }); // audio baru aktif setelah interaksi pertama
const setSound = v => { SND = v; localStorage.setItem('examatro_sound', v ? '1' : '0'); };
function tone(f, d, type = 'sine', v = .06, at = 0) {
  if (!SND || !armed) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
  } catch (e) {}
}
const seq = (fs, d, type, v, gap) => fs.forEach((f, i) => tone(f, d, type, v, i * gap));
const S = {
  hover: () => tone(900, .04, 'sine', .02), sel: () => tone(600, .07, 'square', .04), deal: () => tone(260, .06, 'triangle', .05),
  play: () => { tone(180, .15, 'sawtooth', .05); tone(360, .12, 'triangle', .05, .06); }, disc: () => tone(200, .12, 'triangle', .04),
  ok: () => seq([523, 784], .15, 'triangle', .07, .09), bad: () => tone(150, .3, 'sawtooth', .06),
  tick: n => tone(500 + (n || 0) * 70, .06, 'square', .04), score: () => seq([523, 659, 784, 1047], .14, 'triangle', .06, .07),
  win: () => seq([523, 659, 784, 1047, 1319], .25, 'triangle', .07, .1), lose: () => seq([330, 262, 196, 147], .3, 'sawtooth', .05, .16)
};
const sfx = (k, n) => S[k] && S[k](n);
const fxl = () => document.getElementById('fx');
function tween(el, a, b, ms) {
  if (!el) return; if (RM) { el.textContent = b; return; }
  const t0 = performance.now();
  (function f(t) { const p = Math.min(1, (t - t0) / ms); el.textContent = Math.round(a + (b - a) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
}
function floatTxt(txt, cls, d = 0) {
  const c = document.querySelector('.calc'); if (!c || RM) return;
  const r = c.getBoundingClientRect(), e = document.createElement('span');
  e.className = 'flt ' + cls; e.textContent = txt; e.style.left = (r.left + r.width / 2 + (Math.random() - .5) * 140) + 'px';
  e.style.top = r.top + 'px'; e.style.animationDelay = d + 'ms'; fxl().appendChild(e); setTimeout(() => e.remove(), 1200 + d);
}
function burst(n) {
  if (RM) return; const cs = ['#f2b84b', '#35c27a', '#3b82f6', '#d9453c', '#f6efdc'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'), a = Math.random() * 6.28, d = 120 + Math.random() * 320;
    p.className = 'ptc'; p.style.cssText = `--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - 80}px;background:${cs[i % 5]};left:50%;top:45%`;
    fxl().appendChild(p); setTimeout(() => p.remove(), 1300);
  }
}
// Intensitas naik sesuai tingkat poker hand (idx 0..9)
function celebrate(i) {
  if (i >= 6) sfx('win');
  if (RM) return;
  if (i >= 6) { const f = document.createElement('div'); f.className = 'flash'; fxl().appendChild(f); setTimeout(() => f.remove(), 600); }
  if (i >= 7) { const a = document.getElementById('app'); a.classList.add('sk'); setTimeout(() => a.classList.remove('sk'), 450); }
  if (i >= 8) burst(i === 9 ? 80 : 40); else if (i >= 6) burst(16);
}
document.addEventListener('mouseover', e => {
  const c = e.target.closest && e.target.closest('.card[data-id]');
  if (c && !c.contains(e.relatedTarget)) sfx('hover');
});
