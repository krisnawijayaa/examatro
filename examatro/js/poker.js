// Poker evaluator. Kartu: {r:2..14 (14=Ace), s:0..3}. Menerima 1..n kartu, mengevaluasi kombinasi terbaik (maks 5 kartu).
const HANDS = [
  ['High Card',5,1],['Pair',10,2],['Two Pair',20,2],['Three of a Kind',30,3],['Straight',30,4],
  ['Flush',35,4],['Full House',40,4],['Four of a Kind',60,7],['Straight Flush',100,8],['Royal Flush',120,10]
];

function eval5(cs) {
  const n = cs.length, cnt = {};
  cs.forEach(c => cnt[c.r] = (cnt[c.r] || 0) + 1);
  const g = Object.entries(cnt).map(([r, k]) => [+r, k]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = n === 5 && cs.every(c => c.s === cs[0].s);
  const rs = [...new Set(cs.map(c => c.r))].sort((a, b) => a - b);
  let high = 0;
  if (n === 5 && rs.length === 5) {
    if (rs[4] - rs[0] === 4) high = rs[4];
    else if (rs.join() === '2,3,4,5,14') high = 5; // wheel A-2-3-4-5
  }
  const top = g[0][1], second = g[1] ? g[1][1] : 0;
  let idx;
  if (high && flush) idx = (high === 14) ? 9 : 8;
  else if (top >= 4) idx = 7;
  else if (top === 3 && second === 2) idx = 6;
  else if (flush) idx = 5;
  else if (high) idx = 4;
  else if (top === 3) idx = 3;
  else if (top === 2 && second === 2) idx = 2;
  else if (top === 2) idx = 1;
  else idx = 0;
  let sc;
  if ([4, 5, 6, 8, 9].includes(idx)) sc = cs;
  else if (idx === 0) sc = [cs.reduce((a, b) => b.r > a.r ? b : a)];
  else {
    const need = idx === 2 ? [g[0][0], g[1][0]] : [g[0][0]];
    sc = cs.filter(c => need.includes(c.r));
  }
  return { idx, name: HANDS[idx][0], sc, key: [idx, high, ...g.map(x => x[0])] };
}

const cmpKey = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
};

function evalBest(cs) {
  if (!cs.length) return null;
  if (cs.length <= 5) return eval5(cs);
  let best = null;
  (function pick(start, cur) {
    if (cur.length === 5) {
      const e = eval5(cur);
      if (!best || cmpKey(e.key, best.key) > 0) best = e;
      return;
    }
    for (let i = start; i < cs.length; i++) pick(i + 1, [...cur, cs[i]]);
  })(0, []);
  return best;
}
