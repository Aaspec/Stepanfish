// Карточки используют те же данные, что и расчёт поклёвки: отдельного списка рыб нет.
const escapeLocationText = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const locationWeight = value => value.toLocaleString('ru-RU', {maximumFractionDigits: 2});
const locationPreviews = {};
let fishIllustrationId = 0;
function fishIllustration(f) {
  const color = escapeLocationText(f.color), id = `fish-shine-${++fishIllustrationId}`;
  const long = f.name.includes('Щука'), ry = long ? 13 : f.name.includes('Лещ') || f.name.includes('Карась') ? 26 : 19;
  // SVG остаётся чётким на телефоне; чешуя, жабры и плавники различимы без внешних файлов.
  return `<svg viewBox="0 0 160 88" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x2="0" y2="1"><stop stop-color="#455747"/><stop offset=".45" stop-color="${color}"/><stop offset="1" stop-color="#e0ddbb"/></linearGradient><pattern id="scales-${id}" width="9" height="7" patternUnits="userSpaceOnUse"><path d="M0 0Q5 8 9 0" fill="none" stroke="#263c32" stroke-opacity=".27" stroke-width=".7"/></pattern></defs><g transform="translate(0 44)"><path d="M113 0L149 -23L142 0L149 23Z" fill="${color}" stroke="#a49c75"/><path d="M58 ${-ry+4}L75 ${-ry-13}L101 ${-ry+7}M63 ${ry-5}L77 ${ry+11}L95 ${ry-5}" fill="${color}" stroke="#b9ad7f"/><ellipse cx="73" rx="52" ry="${ry}" fill="url(#${id})" stroke="#a5aa8f"/><ellipse cx="73" rx="52" ry="${ry}" fill="url(#scales-${id})"/><path d="M43 ${-ry*.75}Q54 0 43 ${ry*.75}M64 3L85 ${ry+6}L88 3" fill="none" stroke="#68725d"/><circle cx="32" cy="-5" r="4" fill="#e6d9a0"/><circle cx="32" cy="-5" r="2.3" fill="#182d28"/><path d="M21 3L29 4" stroke="#47594d"/></g></svg>`;
}
function fishTile(f, caption) {
  return `<div class="location-fish">${fishIllustration(f)}<span>${escapeLocationText(f.name)}</span>${caption ? `<small>${caption}</small>` : ''}</div>`;
}
function renderLocations() {
  $('location-list').innerHTML = Object.values(L).map((l, index) => {
    const fishes = F.filter(f => f.locs.includes(l.code));
    const popular = [...fishes].sort((a,b) => b.freq-a.freq || a.id-b.id).slice(0,3);
    const light = [...fishes].sort((a,b) => a.min-b.min)[0];
    const heavy = [...fishes].sort((a,b) => b.max-a.max)[0];
    const selected = sl.value === l.code;
    const habitat = l.code === 'sea' ? (boatOwned ? 'Открытое море · ваша лодка' : 'Бонусная локация · нужна лодка за 6 000 ₽') : l.current ? 'Течение · открытый берег' : l.forest ? 'Тихая вода · хвойный лес' : 'Тихая вода · открытый берег';
    return `<article class="location-option${selected?' is-current':''}" aria-labelledby="location-name-${index}"><img class="location-preview" src="${locationPreviews[l.code]}" alt="Пейзаж локации ${escapeLocationText(l.name)}"><h3 id="location-name-${index}">${escapeLocationText(l.name)}</h3><p class="location-habitat">${habitat}</p><section class="fish-panel"><h4>Наиболее популярные рыбы</h4><div class="popular-fish">${popular.map(f=>fishTile(f)).join('') || '<p>Виды пока не указаны.</p>'}</div></section><section class="fish-panel"><h4>Диапазон веса рыб</h4><div class="weight-fish">${light ? fishTile(light,`от ${locationWeight(light.min)} кг`)+fishTile(heavy,`до ${locationWeight(heavy.max)} кг`) : '<p>Нет данных о весе.</p>'}</div></section><p class="location-species"><b>Все виды:</b> ${fishes.map(f=>escapeLocationText(f.name)).join(', ') || 'не указаны'}</p><button data-location="${escapeLocationText(l.code)}" aria-pressed="${selected}">${l.code === 'sea' && !boatOwned ? 'Нужна лодка · 6 000 ₽' : (selected?'Выбрано: ':'Ловить здесь: ')+escapeLocationText(l.name)}</button></article>`;
  }).join('');
}
function initLocations() {
  // Снимки настоящих игровых пейзажей, а не несвязанные фотографии водоёмов.
  Object.values(L).forEach(l => { paintLandscape(l); locationPreviews[l.code] = landscape.toDataURL('image/png'); });
  landscapeKey = '';
  const updateCurrent = () => { $('location-current').textContent = L[sl.value].name; };
  sl.addEventListener('change', updateCurrent); updateCurrent();
  $('blocations').disabled = false;
  $('blocations').onclick = () => {
    if (S !== 'idle' || sl.disabled) return;
    $('locations-help').textContent = 'Изучите водоёмы и выберите, за какой рыбой отправиться.';
    renderLocations(); modal('locations', true);
    $('locations').querySelector('.location-window').scrollTop = 0;
  };
  $('location-list').onclick = e => {
    const button = e.target.closest('button[data-location]');
    if (!button || S !== 'idle' || sl.disabled || !L[button.dataset.location]) return;
    if(button.dataset.location === 'sea' && !boatOwned) {
      $('locations-help').textContent = 'Для морской рыбалки необходимо приобрести лодку за 6 000 ₽ в магазине.';
      $('locations').querySelector('.location-window').scrollTop = 0; return;
    }
    sl.value = button.dataset.location;
    updateLocationInfo();
    say(`Место ловли: ${L[sl.value].name}. Снасти готовы.`);
    modal('locations', false);
  };
}
