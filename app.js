const STORAGE_KEY = 'karaokevotos_data_v1';

const state = {
  singers: [],               // [{ id, name }]
  votes: {},                 // { [performerId]: { [voterId]: note } }
  performerId: null,         // quem está cantando agora
  cycleDone: [],             // cantores que já cantaram na rodada atual
  totalRounds: 3,            // rodadas escolhidas no início
  currentRound: 1,           // rodada em andamento
  active: false,             // festa iniciada
  finished: false,
};

const phrases = [
  { min: 90, text: 'Parabens, ja pode ligar pra Petta produzir !' },
  { min: 80, text: 'Segura boy! Ja pode entrar pra banda de Carlos Feitosa' },
  { min: 70, text: 'Ja temos o substituto de Daniel diau' },
  { min: 60, text: 'Voce vai estar no precaju ano que vem?' },
  { min: 50, text: 'Voce ja ta melhor que o bosta do renato russo!' },
  { min: 40, text: 'Pelo menos voce tem um coracao bom...' },
  { min: 30, text: 'Quanta ma vontade pra cantar , va dormir !' },
  { min: 0, text: 'Porra......' },
];

const WHEEL_PALETTE = ['#ff2de8', '#00e5ff', '#ffe600', '#39ff14', '#ff8c00', '#ff2e3f', '#b026ff', '#ff5a5a'];

let selectedNote = null;
let wheelOrder = [];
let wheelRotation = 0;
let spinning = false;
let bulbCount = 0;
let tickTimer = null;

// ================= ÁUDIO (WebAudio) =================

let audioCtx = null;
function ac() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* sem áudio */ }
  }
  return audioCtx;
}
function tone(freq, dur, type, vol, when) {
  const c = ac();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime + (when || 0));
    g.gain.linearRampToValueAtTime(vol || .12, c.currentTime + (when || 0) + .01);
    g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + (when || 0) + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(c.currentTime + (when || 0));
    o.stop(c.currentTime + (when || 0) + dur + .03);
  } catch (e) { /* ignora */ }
}
function coin() { tone(880, .08, 'square', .1, 0); tone(1320, .14, 'square', .1, .09); }
function tick() { tone(2200, .03, 'square', .05, 0); }
function fanfare() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, .24, 'square', .12, i * .09));
  tone(1318.5, .5, 'square', .1, .42);
}

// ================= HELPERS =================

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch (e) { /* dados corrompidos: ignora */ }
}

function $(sel) { return document.querySelector(sel); }

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function showToast(msg) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.add('hidden'), 2600);
}

function getSinger(id) { return state.singers.find(s => s.id === id); }

function avgOf(singer) {
  const votes = state.votes[singer.id] || {};
  const values = Object.values(votes);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getPhrase(avg) {
  const pct = avg * 10;
  return (phrases.find(p => pct >= p.min) || phrases[phrases.length - 1]).text;
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

// ================= RODADAS =================

function remainingSingers() {
  return state.singers.filter(s => !state.cycleDone.includes(s.id));
}

function allSangInRound() {
  return state.singers.length > 0 && state.cycleDone.length >= state.singers.length;
}

// 'finished' → festa terminou (resultados mostrados)
// 'advanced' → rodada avançou
// 'none' → ainda tem gente pra cantar
function advanceRoundOrFinish() {
  if (!allSangInRound()) return 'none';
  if (state.currentRound >= state.totalRounds) {
    state.finished = true;
    state.performerId = null;
    save();
    renderResults();
    showView('view-results');
    return 'finished';
  }
  state.currentRound++;
  state.cycleDone = [];
  save();
  return 'advanced';
}

// ================= VIEWS =================

function renderRegister() {
  const list = $('#singer-list');
  if (!state.singers.length) {
    list.innerHTML = '<div class="empty-state">NENHUM CANTOR CADASTRADO AINDA. ADICIONE O PRIMEIRO!</div>';
  } else {
    list.innerHTML = state.singers.map(s => `
      <div class="singer-row">
        <span class="avatar">${esc((s.name || '?')[0])}</span>
        <div class="singer-info">
          <span class="name">${esc(s.name)}</span>
        </div>
        <div class="singer-actions">
          <button class="btn ghost small" data-edit="${s.id}">EDITAR</button>
          <button class="btn danger small" data-del="${s.id}">REMOVER</button>
        </div>
      </div>`).join('');
  }
  $('#btn-start').disabled = state.singers.length < 2;
  $('#btn-start').textContent =
    state.singers.length < 2
      ? 'CADASTRE PELO MENOS 2 CANTORES'
      : `COMEÇAR A FESTA (${state.singers.length} CANTORES)`;
  const rv = $('#round-value');
  if (rv) rv.textContent = state.totalRounds;
}

function renderRoletaRemaining() {
  const remaining = remainingSingers();
  if (!remaining.length) {
    $('#roleta-remaining').textContent = 'RODADA CONCLUÍDA! TODOS CANTARAM.';
  } else {
    $('#roleta-remaining').textContent =
      `FALTAM CANTAR: ${remaining.map(s => s.name).join(', ')}`;
  }
}

function buildBulbs(count) {
  bulbCount = count;
  const layer = document.querySelector('.wheel-bulbs');
  if (!layer) return;
  layer.innerHTML = '';
  const size = document.querySelector('.wheel-wrap').offsetWidth || 340;
  const r = size / 2 + 5;
  for (let i = 0; i < count; i++) {
    const b = document.createElement('div');
    b.className = 'bulb';
    b.style.transform = `rotate(${(360 / count) * i}deg) translateY(-${r}px)`;
    b.style.animationDelay = `${-i * .06}s`;
    layer.appendChild(b);
  }
}

function renderRoleta() {
  const remaining = remainingSingers();
  wheelOrder = remaining.map(s => s.id);
  const n = remaining.length;
  const svg = $('#wheel-svg');
  if (!svg) return;
  if (!n) {
    svg.innerHTML = '';
    return;
  }

  const cx = 160, cy = 160, R = 148;
  const slice = 360 / n;
  const fs = n <= 6 ? 17 : n <= 10 ? 13 : 10;
  const fsLong = n <= 6 ? 13 : n <= 10 ? 10 : 8;
  let parts = '';

  if (n === 1) {
    const s = remaining[0];
    parts += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${WHEEL_PALETTE[0]}" stroke="#000" stroke-width="3"/>`;
    parts += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
      font-family="Menlo, monospace" font-size="20" font-weight="700"
      fill="#fff" stroke="#000" stroke-width="2.5" paint-order="stroke">${esc(s.name.toUpperCase())}</text>`;
    svg.innerHTML = parts;
    buildBulbs(10);
    return;
  }

  remaining.forEach((s, i) => {
    const a1 = ((i * slice) - 90) * Math.PI / 180;
    const a2 = (((i + 1) * slice) - 90) * Math.PI / 180;
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    const large = slice > 180 ? 1 : 0;
    const col = WHEEL_PALETTE[i % WHEEL_PALETTE.length];
    parts += `<path d="M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${col}" stroke="#000" stroke-width="3"/>`;

    const mid = ((i * slice + slice / 2) - 90) * Math.PI / 180;
    const tx = cx + R * .56 * Math.cos(mid);
    const ty = cy + R * .56 * Math.sin(mid);
    const rot = i * slice + slice / 2;
    const flip = rot > 90 && rot < 270;
    const longName = s.name.length > 14;
    parts += `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${flip ? rot + 180 : rot})">
        <text x="0" y="0" text-anchor="middle" dominant-baseline="middle"
          font-family="Menlo, monospace" font-size="${longName ? fsLong : fs}" font-weight="700"
          fill="#fff" stroke="#000" stroke-width="2.5" paint-order="stroke">${esc(s.name.toUpperCase())}</text>
      </g>`;
  });

  svg.innerHTML = parts;
  buildBulbs(Math.max(10, Math.min(28, n * 3)));
}

function renderRoundIndicator() {
  const el = $('#round-indicator');
  if (el) el.textContent = `RODADA ${state.currentRound} DE ${state.totalRounds}`;
}

function renderPanel() {
  renderRoundIndicator();
  if (state.performerId) {
    $('#sing-selector').classList.add('hidden');
    $('#sing-mode').classList.remove('hidden');
    const performer = getSinger(state.performerId);

    $('#performer-name').textContent = performer.name;

    const others = state.singers.filter(s => s.id !== state.performerId);
    $('#voter-select').innerHTML = `
      <option value="" disabled selected>ESCOLHA SEU NOME</option>
      ${others.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}`;

    renderNotePicker();
    renderVotersStatus();
  } else {
    $('#sing-mode').classList.add('hidden');
    $('#sing-selector').classList.remove('hidden');
    renderRoleta();
    renderRoletaRemaining();
  }
}

function renderNotePicker() {
  const picker = $('#note-picker');
  picker.innerHTML = Array.from({ length: 10 }, (_, i) => i + 1)
    .map(n => `<button class="note-btn ${selectedNote === n ? 'selected' : ''}" data-note="${n}">${n}</button>`)
    .join('');
}

function renderVotersStatus() {
  const votes = state.votes[state.performerId] || {};
  const voters = state.singers.filter(s => s.id !== state.performerId);
  const votedCount = voters.filter(s => votes[s.id]).length;

  $('#vote-progress-bar').style.width = `${(votedCount / voters.length) * 100}%`;
  $('#vote-progress-text').textContent = `${votedCount} DE ${voters.length} VOTOS`;

  $('#voters-status').innerHTML = voters.map(v => {
    const done = !!votes[v.id];
    return `<span class="voter-chip ${done ? 'voted' : 'missing'}">${done ? 'OK ' : '-- '}${esc(v.name)}</span>`;
  }).join('');

  $('#btn-finish-vote').disabled = votedCount < voters.length;
}

function renderResults() {
  const results = state.singers
    .map(s => ({ singer: s, avg: avgOf(s) }))
    .filter(r => r.avg !== null)
    .sort((a, b) => b.avg - a.avg);

  if (!results.length) {
    $('#results-list').innerHTML = '<div class="empty-state">NENHUM VOTO REGISTRADO!</div>';
    return;
  }

  const champ = results[0].singer.name;
  const banner = `<div class="winner-marquee">★ ${esc(champ.toUpperCase())} VENCEU ★</div>`;

  const rows = results.map((r, i) => {
    const rank = i === 0 ? '1ST' : i === 1 ? '2ND' : i === 2 ? '3RD' : `${i + 1}TH`;
    const cls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const rkcls = i === 0 ? 'rank1' : i === 1 ? 'rank2' : i === 2 ? 'rank3' : '';
    return `
      <div class="result-card ${cls}">
        <span class="rank-badge ${rkcls}">${rank}</span>
        <div class="result-main">
          <div class="name">${esc(r.singer.name)}</div>
          <div class="phrase">“${esc(getPhrase(r.avg))}”</div>
        </div>
        <div class="result-score">
          <div class="avg">${r.avg.toFixed(1)}</div>
          <div class="pct">${Math.round(r.avg * 10)}%</div>
        </div>
      </div>`;
  }).join('');

  $('#results-list').innerHTML = banner + rows;
}

// ================= ROLETA =================

function startVote(singerId) {
  state.performerId = singerId;
  if (!state.votes[singerId]) state.votes[singerId] = {};
  selectedNote = null;
  save();
  renderPanel();
}

function spawnConfetti() {
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  for (let i = 0; i < 42; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    const size = 8 + Math.random() * 8;
    const col = WHEEL_PALETTE[i % WHEEL_PALETTE.length];
    p.style.cssText =
      `left:${Math.random() * 100}vw;` +
      `width:${size}px;height:${size * .6}px;` +
      `background:${col};` +
      `animation-duration:${2 + Math.random() * 1.8}s;` +
      `animation-delay:${Math.random() * .5}s;` +
      `transform:rotate(${Math.random() * 360}deg);`;
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 4600);
}

function spinRoleta() {
  if (spinning) return;
  if (!state.singers.length) return;

  let candidates = remainingSingers();
  if (!candidates.length) {
    const res = advanceRoundOrFinish();
    if (res === 'finished') return;
    renderRoleta();
    renderRoletaRemaining();
    candidates = remainingSingers();
  }
  const winner = candidates[Math.floor(Math.random() * candidates.length)];

  const n = candidates.length;
  const slice = 360 / n;
  const winnerIndex = wheelOrder.indexOf(winner.id);
  const sliceCenter = winnerIndex * slice + slice / 2;
  const needed = ((360 - sliceCenter) % 360 + 360) % 360;
  const spinTurns = 5 + Math.floor(Math.random() * 3);
  wheelRotation = (Math.floor(wheelRotation / 360) + spinTurns) * 360 + needed;

  const wheel = $('#wheel');
  const wrap = document.querySelector('.wheel-wrap');
  wheel.style.transition = 'transform 4.6s cubic-bezier(0.12, 0.8, 0.08, 1)';
  void wheel.offsetWidth;
  wheel.style.transform = `rotate(${wheelRotation}deg)`;

  wrap.classList.add('spinning');
  spinning = true;
  $('#btn-spin').disabled = true;

  coin();

  clearInterval(tickTimer);
  let d = 120, step = 0;
  const stepFn = () => {
    tick();
    step++;
    d *= 1.07;
    clearInterval(tickTimer);
    if (step >= 44) { tickTimer = null; }
    else { tickTimer = setInterval(stepFn, d); }
  };
  tickTimer = setInterval(stepFn, d);

  let landed = false;
  const onLand = () => {
    if (landed) return;
    landed = true;
    clearInterval(tickTimer);
    tickTimer = null;
    spinning = false;
    if (state.finished || !state.active) {
      $('#btn-spin').disabled = false;
      return;
    }
    wrap.classList.remove('spinning');
    wrap.classList.add('landed');
    state.cycleDone.push(winner.id);
    save();
    fanfare();
    spawnConfetti();
    $('#btn-spin').disabled = false;
    setTimeout(() => {
      wrap.classList.remove('landed');
      const panelActive = document.getElementById('view-panel').classList.contains('active');
      if (!panelActive || state.finished || !state.active) return;
      startVote(winner.id);
    }, 1300);
  };

  const safety = setTimeout(onLand, 5200);
  wheel.addEventListener('transitionend', function handler(ev) {
    if (ev.propertyName !== 'transform') return;
    clearTimeout(safety);
    wheel.removeEventListener('transitionend', handler);
    onLand();
  });
}

// ================= EVENTOS =================

function addSinger(name) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  state.singers.push({ id, name });
  save();
  renderRegister();
}

$('#register-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#input-name').value.trim();
  if (!name) return;
  addSinger(name);
  $('#input-name').value = '';
  $('#input-name').focus();
});

$('#singer-list').addEventListener('click', e => {
  const delBtn = e.target.closest('[data-del]');
  const editBtn = e.target.closest('[data-edit]');

  if (delBtn) {
    const id = delBtn.dataset.del;
    if (!confirm('Remover este cantor?')) return;
    state.singers = state.singers.filter(s => s.id !== id);
    delete state.votes[id];
    state.cycleDone = state.cycleDone.filter(c => c !== id);
    save();
    renderRegister();
    showToast('CANTOR REMOVIDO');
  }

  if (editBtn) {
    const id = editBtn.dataset.edit;
    const s = getSinger(id);
    const name = prompt('Nome:', s.name);
    if (name === null) return;
    s.name = name.trim() || s.name;
    save();
    renderRegister();
  }
});

$('#btn-start').addEventListener('click', () => {
  if (!state.active) {
    const rv = parseInt($('#round-value').textContent, 10);
    state.totalRounds = Math.min(10, Math.max(1, rv || 1));
    state.currentRound = 1;
    state.cycleDone = [];
    state.active = true;
    state.finished = false;
  }
  save();
  showView('view-panel');
  renderPanel();
});

$('#round-minus').addEventListener('click', () => {
  const el = $('#round-value');
  const v = Math.max(1, (parseInt(el.textContent, 10) || 1) - 1);
  el.textContent = v;
});

$('#round-plus').addEventListener('click', () => {
  const el = $('#round-value');
  const v = Math.min(10, (parseInt(el.textContent, 10) || 1) + 1);
  el.textContent = v;
});

$('#btn-spin').addEventListener('click', spinRoleta);

$('#voter-select').addEventListener('change', () => {
  selectedNote = null;
  renderNotePicker();
});

$('#note-picker').addEventListener('click', e => {
  const btn = e.target.closest('[data-note]');
  if (!btn) return;
  const voterId = $('#voter-select').value;
  if (!voterId) { showToast('ESCOLHA PRIMEIRO QUEM ESTÁ VOTANDO!'); return; }
  if (state.votes[state.performerId][voterId]) {
    showToast('ESTE VOTANTE JÁ VOTOU!');
    return;
  }
  selectedNote = Number(btn.dataset.note);
  renderNotePicker();
});

$('#btn-submit-vote').addEventListener('click', () => {
  const voterId = $('#voter-select').value;
  if (!voterId) { showToast('ESCOLHA PRIMEIRO QUEM ESTÁ VOTANDO!'); return; }
  if (selectedNote === null) { showToast('ESCOLHA A NOTA DE 1 A 10!'); return; }
  if (state.votes[state.performerId][voterId]) {
    showToast('ESTE VOTANTE JÁ VOTOU!');
    return;
  }
  state.votes[state.performerId][voterId] = selectedNote;
  selectedNote = null;
  save();
  renderPanel();
  showToast('VOTO REGISTRADO!');
});

$('#btn-finish-vote').addEventListener('click', () => {
  const votes = state.votes[state.performerId] || {};
  const voters = state.singers.filter(s => s.id !== state.performerId);
  const missing = voters.filter(v => !votes[v.id]);
  if (missing.length) {
    showToast(`FALTAM ${missing.length} VOTO(S) OBRIGATÓRIO(S)!`);
    return;
  }
  state.performerId = null;
  selectedNote = null;
  save();
  const res = advanceRoundOrFinish();
  if (res === 'finished') return;
  renderPanel();
  if (res === 'advanced') {
    showToast(`RODADA ${state.currentRound} DE ${state.totalRounds} COMEÇOU!`);
  } else {
    showToast('VOTAÇÃO CONCLUÍDA!');
  }
});

$('#btn-back-register').addEventListener('click', () => {
  state.performerId = null;
  renderRegister();
  showView('view-register');
});

$('#btn-end-party').addEventListener('click', () => {
  const partial = state.singers.some(s => {
    const voted = state.votes[s.id] ? Object.keys(state.votes[s.id]).length : 0;
    if (!voted) return false;
    const others = state.singers.filter(x => x.id !== s.id);
    return others.some(v => !state.votes[s.id][v.id]);
  });
  if (partial && !confirm('Alguns cantores ainda não receberam votos de todos. Encerrar mesmo assim?')) return;

  state.finished = true;
  state.performerId = null;
  save();
  renderResults();
  showView('view-results');
});

$('#btn-new-party').addEventListener('click', () => {
  if (!confirm('Isso apaga TODOS os dados e começa uma festa nova. Continuar?')) return;
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, {
    singers: [],
    votes: {},
    performerId: null,
    cycleDone: [],
    totalRounds: 3,
    currentRound: 1,
    active: false,
    finished: false,
  });
  selectedNote = null;
  spinning = false;
  wheelRotation = 0;
  renderRegister();
  showView('view-register');
});

window.addEventListener('resize', () => {
  if (state.active && !state.performerId && !spinning && bulbCount) {
    buildBulbs(bulbCount);
  }
});

// ================= INIT =================

load();
if (state.finished) {
  renderResults();
  showView('view-results');
} else if (state.active) {
  showView('view-panel');
  renderPanel();
} else {
  renderRegister();
  showView('view-register');
}
