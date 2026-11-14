'use strict';
/* АэроЛаб · teacher.js — Наставнику: журнал, достижения, допуск к полётам (печать) */
(function () {
  const { $, $$ } = window.AeroLab;
  const page = $('#page-teacher');
  if (!page) return;

  const JOURNAL_ITEMS = [
    { id: 'm1', text: 'Теория мультироторных систем: С1–С3 пройдены, «Учимся летать» — допуск получен' },
    { id: 'm2', text: 'Аэродинамическая труба: все 3 задания с автопроверкой выполнены' },
    { id: 'm3', text: 'Трубка Вентури и Бернулли: опыт выполнен, вопрос стенда верный' },
    { id: 'm4', text: 'Воздушный винт: задача на взлётную массу квадрокоптера решена' },
    { id: 'm5', text: 'Конструктор БПЛА: сборка без ошибок совместимости, T/W ≥ 1,6' },
    { id: 'm6', text: 'Симулятор полётного контроллера: отклик в зелёной зоне, ARM осознан' },
    { id: 'm7', text: 'Квиз «Аэро-Эрудит»: не менее 10 из 12' },
    { id: 'm8', text: 'Первый полёт на симуляторе (FPV) или учебном коптере — под контролем наставника' },
    { id: 'm9', text: 'Техника безопасности: винты, АКБ, наушники/очки — отработано' },
    { id: 'm10', text: 'Итоговая защита мини-проекта (орден «Аэроквантумец»)' }
  ];
  const LEARNER_KEY = window.AeroLab.JOURNAL_KEY;

  /* ───────────── Журнал ───────────── */
  const nameInput = $('#learnerName');
  const journalBox = $('#journalItems');
  const journalDone = $('#journalDone');
  const journalBar = $('#journalBar');

  const store = window.AeroLab.loadJSON(LEARNER_KEY, { name: '', items: {} });
  if (nameInput) nameInput.value = store.name || '';

  function saveJournal() {
    const items = {};
    $$('input[type=checkbox]', journalBox).forEach(cb => { items[cb.dataset.id] = cb.checked; });
    window.AeroLab.saveJSON(LEARNER_KEY, { name: nameInput ? nameInput.value.trim() : '', items });
    updateJournalCount(items);
    updatePrintSheet();
  }
  function updateJournalCount(items) {
    const done = Object.values(items || store.items || {}).filter(Boolean).length;
    if (journalDone) journalDone.textContent = done + ' / ' + JOURNAL_ITEMS.length;
    if (journalBar) journalBar.style.width = (done / JOURNAL_ITEMS.length * 100).toFixed(0) + '%';
  }

  if (journalBox) {
    JOURNAL_ITEMS.forEach(item => {
      const label = document.createElement('label');
      label.className = 'journal-item';
      const checked = store.items && store.items[item.id] ? 'checked' : '';
      label.innerHTML = '<input type="checkbox" data-id="' + item.id + '" ' + checked + '><span>' + item.text + '</span>';
      journalBox.appendChild(label);
    });
    $$('input[type=checkbox]', journalBox).forEach(cb => cb.addEventListener('change', saveJournal));
  }
  if (nameInput) nameInput.addEventListener('input', () => { saveJournal(); });

  /* ───────────── Достижения ───────────── */
  const achGrid = $('#achGrid');
  function renderAchievements() {
    if (!achGrid) return;
    const unlocked = window.AeroLab.getUnlocked();
    achGrid.innerHTML = '';
    window.AeroLab.ACHIEVEMENTS.forEach(a => {
      const has = unlocked.indexOf(a.id) !== -1;
      const div = document.createElement('div');
      div.className = 'ach-badge' + (has ? ' unlocked' : ' locked');
      div.innerHTML =
        '<div class="ach-icon">' + (has ? achTrophySvg() : achLockSvg()) + '</div>' +
        '<div class="ach-name">' + a.name + '</div>' +
        '<div class="ach-desc">' + a.desc + '</div>';
      achGrid.appendChild(div);
    });
    const achCount = $('#achCount');
    if (achCount) {
      const core = window.AeroLab.ACHIEVEMENTS.filter(a => a.id !== 'clearance');
      const done = core.filter(a => unlocked.indexOf(a.id) !== -1).length;
      achCount.textContent = done + ' / ' + core.length + ' базовых';
    }
  }
  function achTrophySvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/></svg>';
  }
  function achLockSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  }
  window.addEventListener('aerolab:achievement', renderAchievements);

  /* ───────────── Печать «Допуска к полётам» ───────────── */
  const printBtn = $('#printClearance');
  const sheetName = $('#sheetLearner');
  const sheetDate = $('#sheetDate');
  const sheetAch = $('#sheetAchievements');
  const sheetJournal = $('#sheetJournal');

  function updatePrintSheet() {
    const unlocked = window.AeroLab.getUnlocked();
    const journal = window.AeroLab.loadJSON(LEARNER_KEY, { name: '', items: {} });
    const jDone = Object.values(journal.items || {}).filter(Boolean).length;
    if (sheetName) sheetName.textContent = (journal.name && journal.name.trim()) || '____________________________';
    if (sheetDate) sheetDate.textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    if (sheetAch) sheetAch.textContent = String(unlocked.length);
    if (sheetJournal) sheetJournal.textContent = jDone + ' / ' + JOURNAL_ITEMS.length;
  }
  if (printBtn) printBtn.addEventListener('click', () => { updatePrintSheet(); window.print(); });

  /* ───────────── Сброс ───────────── */
  const resetBtn = $('#resetProgress');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (window.confirm('Стереть прогресс этого браузера (достижения и журнал)?')) {
      window.AeroLab.resetProgress();
      const fresh = { name: '', items: {} };
      window.AeroLab.saveJSON(LEARNER_KEY, fresh);
      if (nameInput) nameInput.value = '';
      $$('input[type=checkbox]', journalBox).forEach(cb => { cb.checked = false; });
      updateJournalCount({});
      renderAchievements();
      updatePrintSheet();
    }
  });

  /* ───────────── Пуск ───────────── */
  updateJournalCount(store.items || {});
  renderAchievements();
  updatePrintSheet();
})();
