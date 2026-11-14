'use strict';
/* АэроЛаб · builder.js — Конструктор БПЛА: подбор компонентов, расчёт, диагностика */
(function () {
  const { clamp, $, $$ } = window.AeroLab;
  const page = $('#page-builder');
  if (!page) return;

  /* ───────────── Каталог (учебные спецификации) ───────────── */
  const FRAMES = [
    { id: 'f250', name: 'Учебная 250 X', maxProp: 5, weight: 160, price: 3500, desc: 'первый коптер · 5″' },
    { id: 'f330', name: 'Спортивная 330 X', maxProp: 7, weight: 280, price: 5200, desc: 'фристайл · 7″' },
    { id: 'f450', name: 'Съёмочная 450 X', maxProp: 10, weight: 430, price: 8500, desc: 'под камеру · 10″' },
    { id: 'f650', name: 'Тренер 650', maxProp: 13, weight: 650, price: 14000, desc: 'большой · 13″' }
  ];
  const VGMS = [
    { id: 'v1', name: '2207 1750KV + 5×4.5″', cells: '4S', thrust: 1250, weight: 30, price: 1450, maxCurrent: 32, desc: 'учебная классика' },
    { id: 'v2', name: '2306 2600KV + 5×4.5″', cells: '4S', thrust: 1400, weight: 29, price: 1600, maxCurrent: 38, desc: 'горячий фристайл' },
    { id: 'v3', name: '2806.5 1300KV + 7×3.5″', cells: '4S', thrust: 1900, weight: 52, price: 1900, maxCurrent: 34, desc: 'долголёт 7″' },
    { id: 'v4', name: '4010 370KV + 10×4.7″', cells: '6S', thrust: 2900, weight: 85, price: 2400, maxCurrent: 28, desc: 'съёмка 6S' },
    { id: 'v5', name: '5010 340KV + 13×4″', cells: '6S', thrust: 4200, weight: 118, price: 3200, maxCurrent: 30, desc: 'грузовой 13″' }
  ];
  const ESCS = [
    { id: 'e1', name: '4-in-1 35A', weight: 28, price: 3300, cont: 35, desc: 'до 35A на мотор' },
    { id: 'e2', name: '4-in-1 45A', weight: 31, price: 4100, cont: 45, desc: 'запас под 12″' },
    { id: 'e3', name: '4-in-1 60A', weight: 40, price: 5600, cont: 60, desc: 'тяжёлые 6S' },
    { id: 'e4', name: 'Отдельные 30A ×4', weight: 38, price: 3800, cont: 30, desc: 'ремонтопригодно' }
  ];
  const BATTERIES = [
    { id: 'b1', name: '4S 1500 mAh 45C', cells: '4S', weight: 145, price: 1800, mah: 1500, c: 45, desc: 'лёгкий учебный' },
    { id: 'b2', name: '4S 2200 mAh 65C', cells: '4S', weight: 215, price: 2400, mah: 2200, c: 65, desc: 'фристайл' },
    { id: 'b3', name: '6S 5000 mAh 30C', cells: '6S', weight: 760, price: 6500, mah: 5000, c: 30, desc: 'долгая съёмка' },
    { id: 'b4', name: '6S 6000 mAh 25C', cells: '6S', weight: 880, price: 7800, mah: 6000, c: 25, desc: 'максимальная ёмкость' }
  ];
  const FCS = [
    { id: 'fc1', name: 'F405 обучающий', weight: 26, price: 3900, desc: 'Betaflight · USB · баро' },
    { id: 'fc2', name: 'F7 спортивный', weight: 24, price: 6400, desc: 'двойной гиро · 8 UART' },
    { id: 'fc3', name: 'H743 продвинутый', weight: 27, price: 9800, desc: 'для автопилота и GPS' }
  ];

  const WIRE_G = 25; // приёмник, проводка, стяжки
  const state = { frame: 'f250', vgm: 'v1', esc: 'e1', batt: 'b1', fc: 'fc1' };
  const pick = (arr, id) => arr.find(x => x.id === id);

  /* ───────────── Расчёт ───────────── */
  function calc() {
    const f = pick(FRAMES, state.frame), v = pick(VGMS, state.vgm),
          e = pick(ESCS, state.esc), b = pick(BATTERIES, state.batt), fc = pick(FCS, state.fc);

    const total = f.weight + v.weight * 4 + e.weight + b.weight + fc.weight + WIRE_G;
    const thrust = v.thrust * 4;
    const tw = thrust / total;
    const thr = Math.sqrt(clamp(total / thrust, 0.01, 0.98));     // доля газа на висении
    const iHover = 4 * v.maxCurrent * Math.pow(thr, 2.2);         // ток висения, А
    const tMin = (b.mah / 1000) / iHover * 60 * 0.8;              // 80 % до отсечки
    const price = f.price + v.price * 4 + e.price + b.price + fc.price;
    const battMaxA = b.mah / 1000 * b.c;
    const needA = 4 * v.maxCurrent;

    const errs = [], warns = [];
    if (v.thrust && /″/.test(v.name)) {
      const prop = parseFloat(v.name.match(/(\d+)×/)[1]);
      if (prop > f.maxProp) errs.push('Пропеллер ' + prop + '″ больше, чем рама ' + f.name + ' (макс. ' + f.maxProp + '″) — лопасти о раму');
    }
    if (v.cells !== b.cells) errs.push('Мотор на ' + v.cells + ', а батарея ' + b.cells + ' — не та напруга');
    if (e.cont < v.maxCurrent) errs.push('ESC на ' + e.cont + 'A при пике мотора ' + v.maxCurrent + 'A — регулятор уйдёт в защиту/дым');
    if (battMaxA < needA * 0.55) errs.push('Батарея не вытягивает ток: нужно ~' + needA + 'A, отдаёт только ' + battMaxA.toFixed(0) + 'A (' + b.c + 'C)');
    else if (battMaxA < needA * 0.8) warns.push('Батарея на пределе по току: ~' + needA + 'A против ' + battMaxA.toFixed(0) + 'A — просадка газа');
    if (tw < 1) errs.push('Тяга меньше веса: T/W = ' + tw.toFixed(2) + ' — не взлетит');
    else if (tw < 1.6) warns.push('T/W = ' + tw.toFixed(2) + ' — висение почти на полный газ, вялый аппарат');
    if (tMin < 3 && errs.length === 0) warns.push('Оценка висения < 3 минут — мало тяги на ёмкость или слишком тяжёлый сетап');

    return { f, v, e, b, fc, total, thrust, tw, thr, iHover, tMin, price, battMaxA, needA, errs, warns };
  }

  /* ───────────── Карточки выбора ───────────── */
  function buildCards(containerId, items, stateKey, specFn) {
    const box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = '';
    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'comp-card' + (item.id === state[stateKey] ? ' on' : '');
      btn.dataset.id = item.id;
      btn.innerHTML = '<div class="comp-name">' + item.name + '</div><div class="comp-spec">' + specFn(item) + '</div>';
      btn.addEventListener('click', () => {
        state[stateKey] = item.id;
        $$('.comp-card', box).forEach(c => c.classList.toggle('on', c.dataset.id === item.id));
        refresh();
      });
      box.appendChild(btn);
    });
  }
  const fmtKg = g => (g / 1000).toFixed(2) + ' кг';
  const fmtRub = n => n.toLocaleString('ru-RU') + ' ₽';

  buildCards('frameCards', FRAMES, 'frame', i => 'макс. винт ' + i.maxProp + '″ · ' + i.weight + ' г · ' + fmtRub(i.price));
  buildCards('vgmCards', VGMS, 'vgm', i => i.cells + ' · тяга ' + i.thrust + ' г · ' + i.weight + ' г · ' + i.maxCurrent + 'A · ' + fmtRub(i.price));
  buildCards('escCards', ESCS, 'esc', i => i.cont + 'A · ' + i.weight + ' г · ' + fmtRub(i.price));
  buildCards('battCards', BATTERIES, 'batt', i => i.mah + ' mAh ' + i.c + 'C · ' + i.weight + ' г · ' + fmtRub(i.price));
  buildCards('fcCards', FCS, 'fc', i => i.desc + ' · ' + i.weight + ' г · ' + fmtRub(i.price));

  /* ───────────── SVG-схема коптера сверху ───────────── */
  const svg = $('#quadSvg');
  function renderQuad(c) {
    if (!svg) return;
    const cx = 150, cy = 118;
    const armLen = 74;
    const diag = Math.PI / 4;
    const dirs = [diag, Math.PI - diag, Math.PI + diag, -diag]; // M1 ПР, M2 ЗЛ? — почасовой порядок
    const rot = [1, -1, 1, -1];                                  // 1 = CW, −1 = CCW
    const propR = 15 + parseInt((c.v.name.match(/(\d+)×/) || [0, '5'])[1], 10) * 1.15;
    let s = '';
    // руки
    for (let i = 0; i < 4; i++) {
      const x = cx + Math.cos(dirs[i]) * armLen, y = cy + Math.sin(dirs[i]) * armLen;
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '" stroke="#33477c" stroke-width="13" stroke-linecap="round"/>';
    }
    // моторы и винты
    for (let i = 0; i < 4; i++) {
      const x = cx + Math.cos(dirs[i]) * armLen, y = cy + Math.sin(dirs[i]) * armLen;
      const cw = rot[i] === 1;
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + propR + '" fill="rgba(56,208,255,0.07)" stroke="' + (cw ? '#38d0ff' : '#ff8a2a') + '" stroke-width="2" stroke-dasharray="7 11" class="prop-disc ' + (cw ? 'spin-cw' : 'spin-ccw') + '" style="transform-origin:' + x + 'px ' + y + 'px"/>';
      s += '<circle cx="' + x + '" cy="' + y + '" r="9.5" fill="#182449" stroke="#8fa3c0" stroke-width="1.6"/>';
      s += '<text x="' + x + '" y="' + (y + 3.4) + '" text-anchor="middle" font-size="8.5" fill="#e9eefb" font-weight="800">M' + (i + 1) + '</text>';
      s += '<text x="' + x + '" y="' + (y - propR - 4) + '" text-anchor="middle" font-size="8" fill="' + (cw ? '#38d0ff' : '#ffb066') + '">' + (cw ? 'CW' : 'CCW') + '</text>';
    }
    // рама + ПК + батарея
    s += '<rect x="' + (cx - 24) + '" y="' + (cy - 13) + '" width="48" height="26" rx="7" fill="#182449" stroke="#ff8a2a" stroke-width="2"/>';
    s += '<rect x="' + (cx - 8) + '" y="' + (cy - 8) + '" width="16" height="16" rx="3" fill="#0e1730" stroke="#38d0ff" stroke-width="1.5"/>';
    s += '<text x="' + cx + '" y="' + (cy + 3.6) + '" text-anchor="middle" font-size="8.5" fill="#8ae4ff" font-weight="700">ПК</text>';
    svg.innerHTML = s;
  }

  /* ───────────── Сводка и вердикт ───────────── */
  const el = {
    totalWeight: $('#bTotalWeight'), thrust: $('#bThrust'), tw: $('#bTw'), twBar: $('#bTwBar'),
    hover: $('#bHover'), flightTime: $('#bFlightTime'), iHover: $('#bIhover'),
    price: $('#bPrice'), battA: $('#bBattA'),
    verdict: $('#bVerdict'), verdictText: $('#bVerdictText'),
    issues: $('#bIssues'),
    task1: $('#bTask1'), task2: $('#bTask2'), task3: $('#bTask3')
  };
  const B_TASKS = [
    { key: 'task1', name: 'task1', pass: c => c.errs.length === 0 && c.tw >= 1.6 },
    { key: 'task2', name: 'task2', pass: c => c.errs.length === 0 && c.tMin >= 12 },
    { key: 'task3', name: 'task3', pass: c => c.errs.length === 0 && c.price <= 30000 && c.thrust >= 3000 }
  ];

  function refresh() {
    const c = calc();
    el.totalWeight.textContent = c.total + ' г';
    el.thrust.textContent = fmtKg(c.thrust);
    el.tw.textContent = c.tw.toFixed(2);
    el.twBar.style.width = clamp(c.tw / 3 * 100, 0, 100).toFixed(1) + '%';
    el.twBar.style.background = c.tw < 1.6 ? 'linear-gradient(90deg,#ff4d5e,#ff8a2a)' : 'linear-gradient(90deg,#2fe08c,#38d0ff)';
    el.hover.textContent = Math.round(c.thr * 100) + ' % газа';
    el.flightTime.textContent = c.tMin.toFixed(1) + ' мин';
    el.iHover.textContent = c.iHover.toFixed(1) + ' А';
    el.price.textContent = fmtRub(c.price);
    el.battA.textContent = c.battMaxA.toFixed(0) + ' А из ~' + c.needA + ' А';

    const ok = c.errs.length === 0;
    el.verdict.className = 'build-verdict ' + (ok ? 'ok' : 'bad');
    el.verdictText.textContent = ok
      ? (c.warns.length ? 'ГОТОВ К ПОЛЁТУ (с замечаниями)' : 'ГОТОВ К ПОЛЁТУ')
      : 'НЕ ГОТОВ: ' + c.errs.length + ' ош.';
    let html = '';
    c.errs.forEach(t => { html += '<li class="err">✕ ' + t + '</li>'; });
    c.warns.forEach(t => { html += '<li class="warn">⚠ ' + t + '</li>'; });
    if (!html) html = '<li class="okline">✓ Совместимость в норме: рама, моторы, ESC, батарея, ПК.</li>';
    el.issues.innerHTML = html;

    renderQuad(c);
  }

  function checkTask(idx) {
    const c = calc();
    const task = B_TASKS[idx];
    const btnBox = document.getElementById('bTaskCheck' + (idx + 1));
    const status = document.getElementById('bTaskStatus' + (idx + 1));
    const wrap = document.getElementById('bTask' + (idx + 1));
    const ok = task.pass(c);
    wrap.classList.toggle('done', ok);
    status.textContent = ok ? '✓ Выполнено!' : statusText(idx, c);
    status.style.color = ok ? 'var(--green)' : 'var(--muted2)';
    if (ok) window.AeroLab.unlock('builder_ok');
  }
  function statusText(idx, c) {
    if (idx === 0) return 'Нужно: без ошибок и T/W ≥ 1,6 (сейчас ' + c.tw.toFixed(2) + ')';
    if (idx === 1) return 'Нужно: без ошибок и висение ≥ 12 мин (сейчас ' + c.tMin.toFixed(1) + ' мин)';
    return 'Нужно: без ошибок, тяга ≥ 3 кг, до 30 000 ₽ (сейчас ' + (c.thrust / 1000).toFixed(1) + ' кг, ' + fmtRub(c.price) + ')';
  }
  [1, 2, 3].forEach(n => {
    const b = document.getElementById('bTaskCheck' + n);
    if (b) b.addEventListener('click', () => checkTask(n - 1));
  });

  refresh();
})();
