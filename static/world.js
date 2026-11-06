// Мир игры: вкладки заданий/достижений/дневника, чип погоды, эффекты на сцене.
// Сервер авторитетен: время суток и погода приходят из /api/state, клиент ведёт их между опросами.
let WORLD = null, QUESTS = [], ACHS = [], DIARY = null;
let DAY_PARTS = ['morning', 'day', 'evening', 'night'];
let WEATHER_NAMES = { clear: 'Ясно', rain: 'Дождь', fog: 'Туман', wind: 'Ветер' };
let DAY_PART_NAMES = { morning: 'Утро', day: 'День', evening: 'Вечер', night: 'Ночь' };
let RAIN_BITE_MULT = .75;               // в дождь общая вероятность поклёвки ниже
let worldSyncAt = 0;                    // Date.now() последнего обновления мира

function setWorldState(s) {
  QUESTS = s.quests || []; ACHS = s.achievements || []; DIARY = s.diary || null;
  if (s.world) { WORLD = s.world; worldSyncAt = Date.now(); }
  updateWorldUI();
}

// Текущая часть суток/погода с учётом прошедшего после опроса времени.
function currentDayPart() {
  if (!WORLD) return 'day';
  const left = WORLD.day_part_left - (Date.now() - worldSyncAt) / 1000;
  if (left > 0) return WORLD.day_part;
  const shift = Math.ceil(-left / 180);
  return DAY_PARTS[(DAY_PARTS.indexOf(WORLD.day_part) + shift) % 4];
}
function currentWeather() { return WORLD ? WORLD.weather : 'clear'; }

// Активна ли рыба сейчас: по времени суток и погоде (null — клюёт всегда).
function fishActive(f, part = currentDayPart(), wx = currentWeather()) {
  return (!f.times || f.times.includes(part)) && (!f.weather || f.weather.includes(wx));
}
function activityLabel(f) {
  const t = f.times ? f.times.map(p => DAY_PART_NAMES[p] || p).join(' и ').toLowerCase() : null;
  const w = f.weather ? f.weather.map(x => WEATHER_NAMES[x] || x).join(' и ').toLowerCase() : null;
  if (t && w) return `${t} · ${w}`;
  if (t) return t[0].toUpperCase() + t.slice(1);
  if (w) return `Только в ${w}`;
  return 'Клюёт в любое время';
}

// ---------- переключение вкладок ----------
const VIEW_IDS = { fishing: 'fishing-view', guide: 'guide-view', quests: 'quests-view', ach: 'ach-view', diary: 'diary-view' };
const VIEW_BUTTONS = { fishing: 'bplay', guide: 'bguide', quests: 'bquests', ach: 'bach', diary: 'bdiary' };
function showView(name) {
  if (!VIEW_IDS[name]) name = 'fishing';
  hold = 0;
  Object.entries(VIEW_IDS).forEach(([k, id]) => { $(id).hidden = k !== name; });
  Object.entries(VIEW_BUTTONS).forEach(([k, id]) => { $(id).setAttribute('aria-pressed', String(k === name)); });
}

// ---------- уведомления ----------
function toast(title, text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<b>${title}</b>${text ? `<span>${text}</span>` : ''}`;
  $('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('gone'); setTimeout(() => el.remove(), 500); }, 5200);
}

// ---------- чип погоды/времени ----------
function updateWorldChip() {
  if (!WORLD) return;
  $('world-time').textContent = DAY_PART_NAMES[currentDayPart()] || currentDayPart();
  $('world-weather').textContent = WEATHER_NAMES[WORLD.weather] || WORLD.weather;
  const w = $('world-chip');
  w.className = `world-chip wx-${WORLD.weather} tp-${currentDayPart()}`;
}

// ---------- вкладки ----------
function renderQuests() {
  const done = QUESTS.filter(q => q.progress >= q.goal).length;
  $('quests-summary').textContent = `Выполнено ${done} из ${QUESTS.length} · обновятся завтра`;
  $('quests-list').innerHTML = QUESTS.map(q => {
    const ready = q.progress >= q.goal, pct = Math.min(100, Math.round(q.progress / q.goal * 100));
    const reward = [q.reward.money ? `${q.reward.money} ₽` : null,
                    q.reward.bait && q.reward.bait_qty ? `${q.reward.bait_qty} × ${B[q.reward.bait] || q.reward.bait}` : null]
      .filter(Boolean).join(' + ');
    const action = q.claimed ? '<span class="quest-done">Награда получена</span>'
      : ready ? `<button data-claim="${q.id}">Получить награду</button>`
      : '<span class="quest-locked">В процессе</span>';
    return `<article class="quest-card${ready ? ' ready' : ''}${q.claimed ? ' claimed' : ''}"><h3>${q.text}</h3>
      <div class="quest-bar" role="progressbar" aria-valuenow="${Math.min(q.progress, q.goal)}" aria-valuemin="0" aria-valuemax="${q.goal}"><span style="width:${pct}%"></span></div>
      <p class="quest-count">${Math.min(q.progress, q.goal)} / ${q.goal} · Награда: ${reward}</p>${action}</article>`;
  }).join('') || '<p class="guide-note">Задания появятся после первого обращения к серверу.</p>';
}
function renderAchievements() {
  const unlocked = ACHS.filter(a => a.unlocked_at).length;
  $('ach-summary').textContent = `Открыто ${unlocked} из ${ACHS.length}`;
  $('ach-list').innerHTML = ACHS.map(a => `<article class="ach-card${a.unlocked_at ? ' on' : ''}">
    <div class="ach-badge" aria-hidden="true">${a.unlocked_at ? '★' : '·'}</div>
    <h3>${a.name}</h3><p>${a.hint}</p>
    <small>${a.unlocked_at ? 'Открыто: ' + a.unlocked_at : 'Не открыто'}</small></article>`).join('');
}
function renderDiary() {
  if (!DIARY) return;
  const heaviest = DIARY.heaviest ? `${DIARY.heaviest.name} · ${DIARY.heaviest.weight.toFixed(2)} кг` : 'пока никого';
  $('diary-summary').textContent = `${DIARY.total} рыб за всё время`;
  const caught = new Map(DIARY.species.map(s => [s.id, s]));
  const rows = F.map(f => {
    const s = caught.get(f.id);
    return `<tr><td>${s ? f.name : '<span class="diary-unknown">? — вид не открыт</span>'}</td><td>${s ? s.n : '—'}</td><td>${s ? s.best.toFixed(2) + ' кг' : '—'}</td></tr>`;
  }).join('');
  $('diary-body').innerHTML = `<div class="diary-cards">
      <div class="diary-card"><small>Всего поймано</small><b>${DIARY.total}</b></div>
      <div class="diary-card"><small>Самая тяжёлая рыба</small><b>${heaviest}</b></div>
      <div class="diary-card"><small>Открыто видов</small><b>${DIARY.discovered} из ${DIARY.species_total}</b></div>
    </div><div class="table-scroll"><table aria-label="Статистика по видам"><thead><tr><th>Вид</th><th>Поймано</th><th>Рекорд</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function updateWorldUI() { updateWorldChip(); renderQuests(); renderAchievements(); renderDiary(); }

function initWorld() {
  ['quests', 'ach', 'diary'].forEach(name => {
    $(VIEW_BUTTONS[name]).disabled = false;
    $(VIEW_BUTTONS[name]).onclick = () => showView(name);
    $(`${name === 'ach' ? 'ach' : name}-return`).onclick = () => { showView('fishing'); $('bplay').focus(); };
  });
  $('quests-list').onclick = async e => {
    const button = e.target.closest('button[data-claim]');
    if (!button) return;
    button.disabled = true;
    const r = await post('/api/quest/claim', { id: +button.dataset.claim }).catch(() => ({}));
    if (r.ok) {
      const parts = [r.money ? `+${r.money} ₽` : null, r.bait && r.bait_qty ? `+${r.bait_qty} × ${B[r.bait] || r.bait}` : null].filter(Boolean);
      toast('Задание выполнено!', `Награда получена: ${parts.join(', ')}`);
    } else button.disabled = false;
    await refresh(); if (currentViewName() !== 'fishing') renderQuests();
  };
  // Погода и задания живут на сервере: подтягиваем их в фоне, пока игрок на рыбалке.
  setInterval(() => { if (S === 'idle' && !document.hidden && $('fishing-view') && !$('fishing-view').hidden) refresh(); }, 30000);
}
function currentViewName() {
  return Object.keys(VIEW_IDS).find(k => !$(VIEW_IDS[k]).hidden) || 'fishing';
}

// ---------- эффекты погоды и времени суток на сцене ----------
function dayTint(g2) {
  const part = currentDayPart();
  const tints = { morning: 'rgba(255,220,150,.09)', day: null, evening: 'rgba(255,140,60,.11)', night: 'rgba(14,26,58,.38)' };
  if (tints[part]) { g2.fillStyle = tints[part]; g2.fillRect(0, 0, 800, 420); }
}
function drawWeatherEffects(g2, time2) {
  const wx = currentWeather(), part = currentDayPart();
  if (wx === 'rain') {
    g2.strokeStyle = 'rgba(190,215,235,.45)'; g2.lineWidth = .8;
    for (let i = 0; i < 70; i++) {
      const x = (noise(i + 900) * 860 + time2 * 260) % 860 - 30, y = (noise(i + 901) * 420 + time2 * 430) % 440;
      g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x - 4, y + 13); g2.stroke();
    }
    g2.strokeStyle = 'rgba(210,230,240,.30)';
    for (let i = 0; i < 14; i++) {
      const x = (noise(i + 950) * 800 + time2 * 24) % 800, y = 195 + noise(i + 960) * 210, r = 2 + ((time2 * 14 + i * 9) % 16);
      g2.beginPath(); g2.ellipse(x, y, r, r * .3, 0, 0, 7); g2.stroke();
    }
  } else if (wx === 'fog') {
    for (let i = 0; i < 5; i++) {
      const y = 150 + i * 52, x = ((time2 * (9 + i * 3)) % (800 + 320)) - 160;
      g2.fillStyle = `rgba(226,232,228,${.16 - i * .015})`;
      g2.beginPath(); g2.ellipse(x, y, 260, 26 + i * 4, 0, 0, 7); g2.fill();
      g2.beginPath(); g2.ellipse((x + 430) % 960 - 80, y + 8, 220, 20 + i * 3, 0, 0, 7); g2.fill();
    }
  } else if (wx === 'wind') {
    g2.strokeStyle = 'rgba(235,240,235,.28)'; g2.lineWidth = .7;
    for (let i = 0; i < 9; i++) {
      const y = 60 + noise(i + 970) * 300, x = (time2 * (60 + i * 12)) % 960 - 80;
      g2.beginPath(); g2.moveTo(x, y); g2.quadraticCurveTo(x + 34, y - 4, x + 70, y + 2); g2.stroke();
    }
  }
  if (part === 'night' && (S === 'wait' || S === 'bite')) {
    // Ночью поплавок подсвечен, чтобы оставаться заметным.
    const p = waterPoint(bx), glow = g2.createRadialGradient(p[0], p[1], 2, p[0], p[1], 26);
    glow.addColorStop(0, 'rgba(255,214,120,.5)'); glow.addColorStop(1, 'rgba(255,214,120,0)');
    g2.fillStyle = glow; g2.beginPath(); g2.arc(p[0], p[1], 26, 0, 7); g2.fill();
  }
}
// Ветер сносит заброс: разброс дальности при каждом забросе.
function windRangeFactor() { return currentWeather() === 'wind' ? .88 + Math.random() * .24 : 1; }
function windDrift(time2) { return currentWeather() === 'wind' ? Math.sin(time2 * .5) * 12 + 14 : 0; }
