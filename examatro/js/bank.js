'use strict';
// Bank Soal: import CSV (preview + validasi), tambah manual, soal bergambar. Data disimpan di localStorage ('examatro_custom').
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BK = { rows: [], errs: [], imgs: {}, msg: '' };
const COLS = ['id', 'module', 'question', 'option_a', 'option_b', 'option_c', 'correct_answer', 'explanation', 'difficulty'];
const TPL = COLS.join(',') + ',image\n' +
  'C1-101,C1,What is a circuit breaker?,Protects the circuit,Increases voltage,Measures frequency,A,Protects the electrical circuit,Easy,\n' +
  'C2-101,C2,What does VSI measure?,Altitude,Vertical speed,Airspeed,B,Measures rate of climb or descent,Easy,\n' +
  'C4-101,C4,What supports aircraft on ground?,Landing gear,Hydraulic pump,Generator,A,Supports the aircraft on ground,Easy,\n' +
  'C2-102,C2,"Identify the instrument shown, please",Altimeter,Airspeed indicator,Compass,A,Shows altitude,Medium,images/C2-102.png\n';

function parseCSV(t) {
  t = t.replace(/^\uFEFF/, ''); const first = t.split(/\r?\n/)[0], d = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let r = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === d) { r.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; r.push(f); f = ''; if (r.some(x => x.trim())) rows.push(r); r = []; }
    else f += c;
  }
  r.push(f); if (r.some(x => x.trim())) rows.push(r); return rows;
}
function check(o, seen) {
  const e = [], g = k => (o[k] || '').trim(), id = g('id'), m = g('module').toUpperCase(), k = g('correct_answer').toUpperCase();
  const dl = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[g('difficulty').toLowerCase() || 'medium'];
  if (!id) e.push('id kosong'); else if (!/^[\w.\-]+$/.test(id)) e.push('id hanya boleh huruf, angka, - _ .'); else if (QB[id] || seen.has(id)) e.push('ID duplikat: ' + id);
  if (!['C1', 'C2', 'C4'].includes(m)) e.push('module harus C1/C2/C4');
  if (!g('question')) e.push('question kosong');
  ['option_a', 'option_b', 'option_c'].forEach(c => { if (!g(c)) e.push(c + ' kosong'); });
  if (!['A', 'B', 'C'].includes(k)) e.push('correct_answer harus A/B/C');
  if (!dl) e.push('difficulty harus Easy/Medium/Hard');
  let img = g('image'); const fn = (img.split('/').pop() || '').toLowerCase(), hit = (fn && BK.imgs[fn]) || BK.imgs[id.toLowerCase()];
  if (hit) img = hit; else if (img && !/^(https?:\/\/\S+|data:image\/\S+|[\w\-./]+\.(png|jpe?g|gif|webp|svg))$/i.test(img)) e.push('image tidak valid (URL, path gambar, atau nama file yang dipilih)');
  if (e.length) return { e };
  return { q: { id, m, q: g('question'), o: [g('option_a'), g('option_b'), g('option_c')], k: 'ABC'.indexOf(k), e: g('explanation'), d: dl, img } };
}
function importCSV(text) {
  BK.rows = []; BK.errs = []; BK.msg = '';
  const rows = parseCSV(text); if (rows.length < 2) { BK.msg = 'CSV kosong atau hanya berisi header.'; return; }
  const h = rows[0].map(x => x.trim().toLowerCase()), miss = COLS.filter(c => !h.includes(c));
  if (miss.length) { BK.msg = 'Kolom wajib tidak ada: ' + miss.join(', '); return; }
  const seen = new Set();
  rows.slice(1).forEach((r, i) => { const o = {}; h.forEach((k, j) => o[k] = r[j] ?? ''); const x = check(o, seen); if (x.q) { seen.add(x.q.id); BK.rows.push(x.q); } else BK.errs.push([i + 2, x.e]); });
}
const persist = () => localStorage.setItem('examatro_custom', JSON.stringify(CUSTOM));
function commit(list) {
  const n = CUSTOM.length; CUSTOM.push(...list);
  try { persist(); } catch (e) { CUSTOM.length = n; return false; } rebuildBank(); return true;
}
const FULL = 'Penyimpanan browser penuh. Kecilkan jumlah gambar, atau pakai path gambar di folder images/ (tidak memakai penyimpanan).';
function saveRows() { const add = BK.rows.filter(q => !QB[q.id]); if (!commit(add)) return FULL; BK.rows = []; return add.length + ' soal tersimpan. Data lama tidak dihapus.'; }
function deleteQ(id) {
  if (R && R.ids.includes(id)) return 'Soal sedang dipakai run aktif. Abandon run dulu.';
  const i = CUSTOM.findIndex(q => q.id === id); if (i >= 0) { CUSTOM.splice(i, 1); try { persist(); } catch (e) {} rebuildBank(); } return '';
}
const csvEsc = v => /[",\n\r;]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
const toCSV = () => COLS.join(',') + ',image\n' + CUSTOM.map(q => [q.id, q.m, q.q, ...q.o, 'ABC'[q.k], q.e, q.d, q.img || ''].map(csvEsc).join(',')).join('\n');
function dl(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
const fileImg = f => new Promise(res => {
  const r = new FileReader(); r.onerror = () => res(null);
  r.onload = () => { const im = new Image(); im.onerror = () => res(null);
    im.onload = () => { const s = Math.min(1, 640 / Math.max(im.width, im.height)), c = document.createElement('canvas'), x = c.getContext('2d');
      c.width = Math.max(1, im.width * s | 0); c.height = Math.max(1, im.height * s | 0); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .72)); };
    im.src = r.result; };
  r.readAsDataURL(f);
});
async function loadImgs(files) { for (const f of files || []) { const u = await fileImg(f); if (u) { const n = f.name.toLowerCase(); BK.imgs[n] = u; BK.imgs[n.replace(/\.[^.]+$/, '')] = u; } } }

const rowHTML = (q, del) => `<div class="qrow">${q.img ? `<img src="${esc(q.img)}" alt="">` : '<span class="noimg"></span>'}<div><b>${esc(q.id)}</b> <small>${q.m} · ${esc(q.d)} · Jawaban ${'ABC'[q.k]}</small><p>${esc(q.q)}</p></div>${del ? `<button class="ghost" data-bk="del" data-id="${esc(q.id)}">Hapus</button>` : ''}</div>`;
const listHTML = () => `<p class="note">${['C1', 'C2', 'C4'].map(m => m + ': ' + CUSTOM.filter(q => q.m === m).length).join(' · ')} · Dengan gambar: ${CUSTOM.filter(q => q.img).length}</p>` + (CUSTOM.map(q => rowHTML(q, true)).join('') || '<p class="note">Belum ada soal buatanmu. Import CSV atau tambah manual.</p>');
const prevHTML = () => `${BK.msg ? `<p class="bmsg">${esc(BK.msg)}</p>` : ''}${BK.rows.length || BK.errs.length ? `<p><b class="g">${BK.rows.length} valid</b> · <b class="r">${BK.errs.length} error</b></p>` : ''}` +
  (BK.errs.length ? `<ul class="errs">${BK.errs.slice(0, 60).map(([n, m]) => `<li>Baris ${n}: ${esc(m.join('; '))}</li>`).join('')}</ul>` : '') +
  (BK.rows.length ? `<div class="plist">${BK.rows.slice(0, 50).map(q => rowHTML(q)).join('')}</div>${BK.rows.length > 50 ? '<p class="note">Menampilkan 50 pertama.</p>' : ''}<button data-bk="save">Simpan ${BK.rows.length} soal valid</button>` : '');
const bankView = () => `<section class="bank"><div class="bhead"><button class="ghost" data-bk="back">← Kembali</button><h2>Bank Soal</h2></div>
<div class="bcard"><h3>1. Import CSV</h3><p class="note">Kolom wajib: ${COLS.join(', ')}. Kolom opsional <b>image</b>: URL, path (images/C2-102.png), atau nama file gambar yang dipilih di bawah. Gambar tanpa kolom image otomatis cocok bila nama file = ID soal (mis. C2-102.png). Soal lama tidak dihapus.</p>
<input type="file" id="bk-csv" accept=".csv,text/csv" aria-label="File CSV"><textarea id="bk-txt" rows="4" placeholder="...atau tempel isi CSV di sini"></textarea>
<label class="note">Gambar soal (opsional, boleh banyak)<input type="file" id="bk-img" accept="image/*" multiple></label>
<div class="btns"><button data-bk="prev">Preview</button><button class="ghost" data-bk="tpl">Unduh template</button></div><div id="bk-prev"></div></div>
<div class="bcard"><h3>2. Tambah manual</h3><div class="bgrid"><input id="bk-id" placeholder="ID (mis. C2-050)"><select id="bk-mod"><option>C1</option><option>C2</option><option>C4</option></select></div>
<textarea id="bk-q" rows="2" placeholder="Teks soal"></textarea><div class="bgrid"><input id="bk-a" placeholder="Opsi A"><input id="bk-b" placeholder="Opsi B"><input id="bk-c" placeholder="Opsi C"><select id="bk-k"><option value="A">Jawaban benar: A</option><option value="B">Jawaban benar: B</option><option value="C">Jawaban benar: C</option></select></div>
<input id="bk-e" placeholder="Penjelasan (opsional)"><div class="bgrid"><select id="bk-d"><option>Easy</option><option selected>Medium</option><option>Hard</option></select><input type="file" id="bk-mimg" accept="image/*" aria-label="Gambar soal"></div>
<p id="bk-mmsg" class="bmsg"></p><button data-bk="add">Tambah soal</button></div>
<div class="bcard"><h3>3. Soal saya (${CUSTOM.length})</h3><div id="bk-list">${listHTML()}</div><div class="btns"><button class="ghost" data-bk="export">Export CSV</button></div></div></section>`;

document.addEventListener('click', async e => {
  const t = e.target.closest('[data-bk]'); if (!t) return; const a = t.dataset.bk, q = s => document.querySelector(s);
  if (a === 'back') { view = 'menu'; render(); }
  if (a === 'tpl') dl('examatro_template.csv', TPL);
  if (a === 'export') dl('examatro_soal_saya.csv', toCSV());
  if (a === 'prev') {
    t.disabled = true; await loadImgs(q('#bk-img').files);
    const f = q('#bk-csv').files[0], txt = q('#bk-txt').value.trim() || (f ? await f.text() : '');
    if (txt) importCSV(txt); else { BK.rows = []; BK.errs = []; BK.msg = 'Pilih file CSV atau tempel isinya.'; }
    q('#bk-prev').innerHTML = prevHTML(); t.disabled = false;
  }
  if (a === 'save') { BK.msg = saveRows(); q('#bk-prev').innerHTML = prevHTML(); q('#bk-list').innerHTML = listHTML(); }
  if (a === 'del') { const m = deleteQ(t.dataset.id); q('#bk-list').innerHTML = listHTML(); if (m) alert(m); }
  if (a === 'add') {
    t.disabled = true; const v = i => q(i).value, f = q('#bk-mimg').files[0], img = f ? await fileImg(f) : '';
    const x = check({ id: v('#bk-id'), module: v('#bk-mod'), question: v('#bk-q'), option_a: v('#bk-a'), option_b: v('#bk-b'), option_c: v('#bk-c'), correct_answer: v('#bk-k'), explanation: v('#bk-e'), difficulty: v('#bk-d'), image: img || '' }, new Set());
    const m = q('#bk-mmsg');
    if (x.e) m.textContent = 'Error: ' + x.e.join('; ');
    else if (!commit([x.q])) m.textContent = FULL;
    else { m.textContent = 'Soal ' + x.q.id + ' ditambahkan.'; ['#bk-id', '#bk-q', '#bk-a', '#bk-b', '#bk-c', '#bk-e', '#bk-mimg'].forEach(i => q(i).value = ''); q('#bk-list').innerHTML = listHTML(); }
    t.disabled = false;
  }
});
