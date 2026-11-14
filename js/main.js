'use strict';
/* АэроЛаб · main.js — вкладки, общие утилиты */
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
    // уведомляем модули о показе вкладки (для корректного resize канвасов)
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

  return { $, $$, bindRange, paintRange, activateTab, fmt, clamp };
})();
