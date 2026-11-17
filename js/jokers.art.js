// Ilustrasi + data Joker original (SVG) bertema aircraft maintenance. Efek dihitung di game.js (play()).
const H = '<circle cx="32" cy="36" r="12" fill="#f3d9b5"/><circle cx="27.5" cy="35" r="1.6" fill="#1b2430"/><circle cx="36.5" cy="35" r="1.6" fill="#1b2430"/><path d="M27 41q5 4 10 0" stroke="#1b2430" fill="none" stroke-width="1.6"/>';
const B = c => `<path d="M12 64q2-17 20-17t20 17z" fill="${c}"/>`;
const JOKERS = [
  { id: 'electrician', n: 'Electrician', r: 'common', d: '+3 Mult jika memainkan Spades.',
    art: B('#3b6fd8') + H + '<path d="M19 33a13 13 0 0 1 26 0z" fill="#f2b84b"/><rect x="17" y="32" width="30" height="3" rx="1.5" fill="#c98a1b"/><path d="M34 50l-7 9h4l-2 6 9-10h-4z" fill="#f2b84b"/><path d="M8 14l6-6 3 8-5 2z" fill="#f2b84b"/>' },
  { id: 'aviator', n: 'Aviator', r: 'common', d: '+20 Chips untuk hand Straight (termasuk Straight Flush).',
    art: B('#4a6b5a') + H + '<path d="M19 34a13 13 0 0 1 26 0z" fill="#7a4a2b"/><rect x="21" y="30" width="9" height="6" rx="3" fill="#9cd3ff" stroke="#222"/><rect x="34" y="30" width="9" height="6" rx="3" fill="#9cd3ff" stroke="#222"/><path d="M44 10l12 4-12 4 2 7-6-5-9 2z" fill="#f6efdc"/>' },
  { id: 'professor', n: 'Professor', r: 'uncommon', d: '+2 Mult untuk soal yang sebelumnya salah lalu dijawab benar.',
    art: B('#6b3fa0') + H + '<path d="M32 13l23 8-23 8-23-8z" fill="#14213d"/><rect x="24" y="28" width="16" height="5" fill="#14213d"/><path d="M55 21v10" stroke="#f2b84b" stroke-width="2"/><circle cx="27.5" cy="35" r="4" fill="none" stroke="#14213d"/><circle cx="36.5" cy="35" r="4" fill="none" stroke="#14213d"/>' },
  { id: 'lucky', n: 'Lucky Mechanic', r: 'uncommon', d: '30% peluang +15 Chips pada tiap kartu aktif.',
    art: B('#b7791f') + H + '<path d="M20 32a12 12 0 0 1 24 0z" fill="#2f855a"/><g fill="#35c27a"><circle cx="49" cy="16" r="4.5"/><circle cx="57" cy="16" r="4.5"/><circle cx="49" cy="24" r="4.5"/><circle cx="57" cy="24" r="4.5"/></g><path d="M53 24v10" stroke="#1f7a4a" stroke-width="2"/><path d="M8 56l12-12" stroke="#cfd8e3" stroke-width="4"/>' },
  { id: 'examiner', n: 'Examiner', r: 'rare', d: '+3 Mult jika satu hand tanpa kesalahan.',
    art: B('#14213d') + H + '<path d="M18 31a14 14 0 0 1 28 0z" fill="#14213d"/><rect x="16" y="30" width="32" height="4" rx="2" fill="#0a1220"/><circle cx="32" cy="24" r="3.5" fill="#f2b84b"/><rect x="38" y="42" width="18" height="21" rx="2" fill="#f6efdc"/><path d="M42 53l4 4 7-8" stroke="#35c27a" stroke-width="3" fill="none"/>' },
  { id: 'technician', n: 'Technician', r: 'common', d: '+2 Mult jika memainkan 3+ rank berbeda.',
    art: B('#2f855a') + H + '<rect x="19" y="26" width="26" height="6" rx="3" fill="#d9453c"/><circle cx="32" cy="25" r="3" fill="#f6efdc"/><circle cx="50" cy="16" r="7" fill="none" stroke="#cfd8e3" stroke-width="4" stroke-dasharray="4 2.6"/><circle cx="50" cy="16" r="2" fill="#cfd8e3"/>' }
];
const jokerHTML = (j, i) => `<div class="jk r-${j.r}" style="--i:${i}" tabindex="0"><svg viewBox="0 0 64 64" aria-hidden="true">${j.art}</svg><b>${j.n}</b><div class="tip"><strong>${j.n}</strong><small>${j.r}</small><p>${j.d}</p></div></div>`;
const flashJoker = i => { const e = document.querySelectorAll('.jk')[i]; if (e) { e.classList.add('act'); setTimeout(() => e.classList.remove('act'), 700); } }; // dipakai nanti saat efek Joker aktif
