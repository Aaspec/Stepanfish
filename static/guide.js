// Общие с ловлей данные /api/config; цены рыб указаны за экземпляр.
let guideSection = 'fish';
function guideLinks(items, kind) {
  return items.map(item => `<button class="guide-link" data-guide-kind="${kind}" data-guide-id="${escapeLocationText(item.code ?? item.id)}">${escapeLocationText(item.name)}</button>`).join('') || '<span>Не указаны</span>';
}
function renderGuide() {
  $('guide-summary').textContent = `${F.length} видов рыб · ${BL.length} ${BL.length === 1 ? 'приманка' : BL.length < 5 ? 'приманки' : 'приманок'} · ${Object.keys(L).length} водоёма`;
  $('guide-fish').innerHTML = F.map(f => {
    const baits = BL.filter(b => f.baits[b.code] > 0);
    return `<article class="guide-card" id="guide-fish-${f.id}" aria-labelledby="guide-fish-name-${f.id}"><div class="guide-illustration" role="img" aria-label="${escapeLocationText(f.name)}">${fishIllustration(f)}</div><div class="guide-card-body"><div class="guide-card-title"><h3 tabindex="-1" id="guide-fish-name-${f.id}">${escapeLocationText(f.name)}</h3><span class="guide-price">${f.price} ₽ <small>за рыбу</small></span></div><p class="guide-weight">Вес: ${locationWeight(f.min)}–${locationWeight(f.max)} кг</p><p class="guide-activity">Клёв: ${activityLabel(f)}</p><dl><dt>Где поймать</dt><dd>${f.locs.map(code => escapeLocationText(L[code]?.name || code)).join(', ') || 'Не указано'}</dd><dt>Подходящие приманки</dt><dd class="guide-links">${guideLinks(baits, 'bait')}</dd></dl></div></article>`;
  }).join('') || '<p>В справочнике пока нет рыб.</p>';
  $('guide-baits').innerHTML = BL.map(b => {
    const fishes = F.filter(f => f.baits[b.code] > 0);
    return `<article class="guide-card guide-bait-card" id="guide-bait-${escapeLocationText(b.code)}" aria-labelledby="guide-bait-name-${escapeLocationText(b.code)}"><div class="guide-card-body"><div class="guide-card-title"><h3 tabindex="-1" id="guide-bait-name-${escapeLocationText(b.code)}">${escapeLocationText(b.name)}</h3><span class="guide-price">${b.price} ₽ <small>за 1 шт.</small></span></div><dl><dt>Можно поймать</dt><dd class="guide-links">${guideLinks(fishes, 'fish')}</dd></dl><p class="guide-weight">Одна приманка расходуется на один заброс.</p></div></article>`;
  }).join('') || '<p>В справочнике пока нет приманок.</p>';
}
function selectGuideSection(section) {
  guideSection = section;
  ['fish', 'baits'].forEach(key => {
    const selected = key === section;
    $(`guide-tab-${key}`).setAttribute('aria-selected', String(selected));
    $(`guide-tab-${key}`).tabIndex = selected ? 0 : -1;
    $(`guide-panel-${key}`).hidden = !selected;
  });
}
function showGuide(on) {
  // Переключение вкладок едино для всех разделов — см. world.js showView.
  showView(on ? 'guide' : 'fishing');
}
function initGuide() {
  renderGuide();
  $('bguide').disabled = false;
  $('bguide').onclick = () => showGuide(true);
  $('bplay').onclick = () => showGuide(false);
  $('guide-return').onclick = () => { showGuide(false); $('bplay').focus(); };
  ['fish', 'baits'].forEach(section => {
    const tab = $(`guide-tab-${section}`);
    tab.onclick = () => selectGuideSection(section);
    tab.onkeydown = event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'fish' : event.key === 'End' ? 'baits' : guideSection === 'fish' ? 'baits' : 'fish';
      selectGuideSection(next); $(`guide-tab-${next}`).focus();
    };
  });
  $('guide-view').addEventListener('click', event => {
    const link = event.target.closest('[data-guide-kind]');
    if (!link) return;
    const kind = link.dataset.guideKind, id = link.dataset.guideId;
    selectGuideSection(kind === 'bait' ? 'baits' : 'fish');
    const card = $(`guide-${kind}-${id}`);
    card.scrollIntoView({block: 'center'});
    card.querySelector('h3').focus({preventScroll: true});
  });
}
