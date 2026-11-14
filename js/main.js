'use strict';
/* АэроЛаб · main.js — вкладки, утилиты, достижения (localStorage), тосты */
window.AeroLab = (function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* --- живая заливка range-слайдеров --- */
  function paintRange(input) {
    const min = parseFloat(input.min), max = parseFloat(input.max), v = parseFloat(input.value);
    const pct = ((v - min) / (max - min)) * 100;
    input.style.setProperty('--fill', pct.toFixed(2) + '%');
  }
  function bindRange(input) {
    if (!input) return;
    paintRange(input);
    input.addEventListener('input', () => paintRange(input));
  }

  /* --- переключение вкладок --- */
  function activateTab(name) {
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.tab-page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
    window.dispatchEvent(new CustomEvent('aerolab:tab', { detail: name }));
  }
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
  $$('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.goto);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* --- форматирование чисел --- */
  function fmt(n, digits) {
    if (!isFinite(n)) return '—';
    return n.toFixed(digits === undefined ? 1 : digits);
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ══════════ Достижения и прогресс (localStorage) ══════════ */
  const ACHIEVEMENTS = [
    { id: 'stall_hunter', name: 'Укротитель срыва', desc: 'Довели крыло до срыва в трубе' },
    { id: 'polar_master', name: 'Полярная эксперт', desc: 'Выполнили все 3 задания трубы' },
    { id: 'venturi_ace',   name: 'Мастер Бернулли', desc: 'Ответили про точку минимального давления' },
    { id: 'prop_master',   name: 'Винтомоторник',   desc: 'Задача: винт для коптера 1,2 кг' },
    { id: 'builder_ok',    name: 'Сборщик',         desc: 'Собрали БПЛА без ошибок совместимости' },
    { id: 'pid_zone',      name: 'PID-шепотун',     desc: 'Поймали зелёный отклик в PID-бенче' },
    { id: 'pixhawk_ok',    name: 'Настройщик Pixhawk', desc: 'Прошли мастер настройки Pixhawk (5 шагов)' },
    { id: 'quiz_ace',      name: 'Аэро-Эрудит',     desc: 'Квиз: не менее 10 из 12' },
    { id: 'clearance',     name: 'Допуск к полётам', desc: 'Открыли все остальные достижения' }
  ];
  const STORE_KEY = 'aerolab_progress_v1';
  const JOURNAL_KEY = 'aerolab_journal_v1';

  function loadJSON(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* приватный режим */ }
  }

  function getUnlocked() { return loadJSON(STORE_KEY, []); }
  function isUnlocked(id) { return getUnlocked().indexOf(id) !== -1; }

  function unlock(id) {
    const list = getUnlocked();
    if (list.indexOf(id) !== -1) return false;
    list.push(id);
    saveJSON(STORE_KEY, list);
    showToast('Достижение: ' + achievementName(id));
    // финальное достижение — когда открыты все остальные
    if (id !== 'clearance') {
      const allOthers = ACHIEVEMENTS.filter(a => a.id !== 'clearance').every(a => list.indexOf(a.id) !== -1);
      if (allOthers) {
        list.push('clearance');
        saveJSON(STORE_KEY, list);
        showToast('Достижение: Допуск к полётам!');
      }
    }
    window.dispatchEvent(new CustomEvent('aerolab:achievement', { detail: id }));
    return true;
  }
  function achievementName(id) {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    return a ? a.name : id;
  }
  function resetProgress() {
    try { window.localStorage.removeItem(STORE_KEY); window.localStorage.removeItem(JOURNAL_KEY); } catch (e) {}
    window.dispatchEvent(new CustomEvent('aerolab:achievement', { detail: '__reset__' }));
  }

  /* --- тосты --- */
  function showToast(text) {
    let toast = document.getElementById('aeToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'aeToast';
      toast.className = 'ae-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = '🏆 ' + text;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3800);
  }

  return {
    $, $$, bindRange, paintRange, activateTab, fmt, clamp,
    ACHIEVEMENTS, getUnlocked, isUnlocked, unlock, achievementName,
    resetProgress, loadJSON, saveJSON, JOURNAL_KEY
  };
})();
