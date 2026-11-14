'use strict';
/* АэроЛаб · wiring.js — Симулятор сборки/подключения квадрокоптера
   Монтажный стол: кликни контакт A → контакт B. Схема проверяется по типам цепей.
   КЗ (питание→земля) = дым и сгоревший провод. Порядок сборки как в настоящем билде. */
(function () {
  const { clamp, $, $$ } = window.AeroLab;
  const page = $('#page-wiring');
  if (!page) return;

  /* ═══════════ Геометрия стола: 1000×700 единиц ═══════════ */
  const VW = 1000, VH = 700;

  /* Компоненты: x,y,w,h в единицах viewBox */
  const COMPONENTS = [
    { id: 'bat', cls: 'wb-bat', x: 18, y: 25, w: 190, h: 125, html: '<div class="wb-title">АКБ 4S 2200</div><div class="wb-sub">16,8 В макс · XT-60</div><div class="wb-sub" style="color:#ffb3bb">НЕ ПОДКЛЮЧАТЬ ДО ПРОВЕРКИ!</div>' },
    { id: 'buz', cls: 'wb-buz', x: 18, y: 190, w: 135, h: 58, html: '<div class="wb-title" style="font-size:11px">BUZZER</div><div class="wb-sub">активный · 5В</div>' },
    { id: 'esc', cls: 'wb-esc', x: 290, y: 22, w: 420, h: 128, html: '<div class="wb-title">4-IN-1 ESC 45A</div><div class="wb-sub">BLHeli_32 · вход питания · 4 фазные группы</div><div class="wb-heatsink"></div>' },
    { id: 'fc', cls: 'wb-fc', x: 372, y: 268, w: 256, h: 150, html: '<div class="wb-fc-inner"><span class="wb-fc-chip"></span><span class="wb-fc-chip s"></span><span class="wb-fc-mcu">F405</span><span class="wb-fc-usb">USB-C</span><span class="wb-fc-led" id="fcLed"></span></div><div class="wb-fc-name">FLIGHT CONTROLLER</div>' },
    { id: 'motor1', cls: 'wb-motor', x: 28, y: 196, w: 84, h: 84, html: motorHtml('M1', 'CW') },
    { id: 'motor2', cls: 'wb-motor', x: 888, y: 196, w: 84, h: 84, html: motorHtml('M2', 'CCW') },
    { id: 'motor3', cls: 'wb-motor', x: 28, y: 470, w: 84, h: 84, html: motorHtml('M3', 'CW') },
    { id: 'motor4', cls: 'wb-motor', x: 888, y: 470, w: 84, h: 84, html: motorHtml('M4', 'CCW') },
    { id: 'rx', cls: 'wb-rx', x: 18, y: 330, w: 135, h: 75, html: '<div class="wb-title" style="font-size:11px">R-XSR</div><div class="wb-sub">SBUS-приёмник</div><div class="wb-antenna"></div>' },
    { id: 'gps', cls: 'wb-gps', x: 812, y: 330, w: 170, h: 105, html: '<div class="wb-title" style="font-size:11px">GPS M10</div><div class="wb-sub">+ компас QMC5883</div><div class="wb-antenna ceramic"></div>' },
    { id: 'cam', cls: 'wb-cam', x: 215, y: 545, w: 125, h: 115, html: '<div class="wb-cam-lens"></div><div class="wb-title" style="font-size:10px;margin-top:6px">FPV CAM</div>' },
    { id: 'vtx', cls: 'wb-vtx', x: 630, y: 545, w: 150, h: 115, html: '<div class="wb-title" style="font-size:11px">VTX 5.8G</div><div class="wb-sub">800 мВт · E4</div><div class="wb-sma"></div>' }
  ];
  function motorHtml(name, dir) {
    return '<svg viewBox="0 0 84 84" class="wb-motor-svg"><circle class="wb-motor-ring" cx="42" cy="42" r="26"/><circle cx="42" cy="42" r="15" fill="#182449" stroke="#8fa3c0" stroke-width="1.6"/><circle cx="42" cy="42" r="4" fill="#ff8a2a"/></svg><div class="wb-motor-name">' + name + ' · ' + dir + '</div>';
  }

  /* Контакты (пины): x,y — абсолютные единицы viewBox */
  const PADS = [
    { id: 'bat.vbat', x: 208, y: 88, type: 'VBAT', label: '+/−', tip: 'Силовой жгут XT-60 (пара)' },
    { id: 'esc.vbat', x: 290, y: 80, type: 'VBAT', label: 'VBAT', tip: 'Вход силового жгута ESC' },

    { id: 'esc.s1', x: 335, y: 22, type: 'PWM_IN', label: 'S1', tip: 'Сигнал M1 (PWM) от ПК' },
    { id: 'esc.s2', x: 428, y: 22, type: 'PWM_IN', label: 'S2', tip: 'Сигнал M2 (PWM) от ПК' },
    { id: 'esc.s3', x: 521, y: 22, type: 'PWM_IN', label: 'S3', tip: 'Сигнал M3 (PWM) от ПК' },
    { id: 'esc.s4', x: 614, y: 22, type: 'PWM_IN', label: 'S4', tip: 'Сигнал M4 (PWM) от ПК' },
    { id: 'esc.v5_out', x: 710, y: 55, type: 'PWR_SRC', label: '5V', tip: 'BEC 5В / 3А (питание ПК)' },
    { id: 'esc.gnd_out', x: 710, y: 112, type: 'GND', label: 'GND', tip: 'Земля BEC' },
    { id: 'esc.ph_m1', x: 342, y: 150, type: 'PHASE', label: 'M1', tip: 'Фазы мотора M1 (жгут 3 жилы)' },
    { id: 'esc.ph_m2', x: 434, y: 150, type: 'PHASE', label: 'M2', tip: 'Фазы мотора M2 (жгут 3 жилы)' },
    { id: 'esc.ph_m3', x: 526, y: 150, type: 'PHASE', label: 'M3', tip: 'Фазы мотора M3 (жгут 3 жилы)' },
    { id: 'esc.ph_m4', x: 618, y: 150, type: 'PHASE', label: 'M4', tip: 'Фазы мотора M4 (жгут 3 жилы)' },

    { id: 'fc.m1', x: 398, y: 268, type: 'PWM_OUT', label: 'M1', tip: 'Выход ПК M1 (PWM)' },
    { id: 'fc.m2', x: 452, y: 268, type: 'PWM_OUT', label: 'M2', tip: 'Выход ПК M2 (PWM)' },
    { id: 'fc.m3', x: 506, y: 268, type: 'PWM_OUT', label: 'M3', tip: 'Выход ПК M3 (PWM)' },
    { id: 'fc.m4', x: 560, y: 268, type: 'PWM_OUT', label: 'M4', tip: 'Выход ПК M4 (PWM)' },
    { id: 'fc.vin_5v', x: 372, y: 300, type: 'PWR_IN', label: '5V IN', tip: 'Питание ПК от BEC ESC' },
    { id: 'fc.gnd_in', x: 372, y: 335, type: 'GND', label: 'GND', tip: 'Земля питания ПК' },
    { id: 'fc.buz', x: 372, y: 385, type: 'BUZ_OUT', label: 'BUZ', tip: 'Выход на пищалку' },
    { id: 'fc.rx1', x: 628, y: 295, type: 'SERIAL_IN', label: 'SBUS', tip: 'Вход SBUS (UART1 RX)' },
    { id: 'fc.v5_out', x: 628, y: 325, type: 'PWR_SRC', label: '5V', tip: 'Шина 5В (питание периферии)' },
    { id: 'fc.gnd_out', x: 628, y: 355, type: 'GND', label: 'GND', tip: 'Шина GND' },
    { id: 'fc.tx2', x: 628, y: 385, type: 'SERIAL_OUT', label: 'TX2', tip: 'UART2 TX → RX GPS' },
    { id: 'fc.rx2', x: 628, y: 413, type: 'SERIAL_IN', label: 'RX2', tip: 'UART2 RX ← TX GPS' },

    { id: 'm1.ph', x: 114, y: 238, type: 'PHASE', label: 'жгут', tip: 'M1: 3 фазы (любой порядок)' },
    { id: 'm2.ph', x: 886, y: 238, type: 'PHASE', label: 'жгут', tip: 'M2: 3 фазы (любой порядок)' },
    { id: 'm3.ph', x: 114, y: 512, type: 'PHASE', label: 'жгут', tip: 'M3: 3 фазы (любой порядок)' },
    { id: 'm4.ph', x: 886, y: 512, type: 'PHASE', label: 'жгут', tip: 'M4: 3 фазы (любой порядок)' },

    { id: 'rx.v5', x: 153, y: 348, type: 'PWR_IN', label: '5V', tip: 'Питание приёмника' },
    { id: 'rx.gnd', x: 153, y: 372, type: 'GND', label: 'GND', tip: 'Земля приёмника' },
    { id: 'rx.sbus', x: 153, y: 396, type: 'SERIAL_OUT', label: 'SBUS', tip: 'Сигнал SBUS → ПК' },

    { id: 'gps.v5', x: 812, y: 348, type: 'PWR_IN', label: '5V', tip: 'Питание GPS' },
    { id: 'gps.gnd', x: 812, y: 372, type: 'GND', label: 'GND', tip: 'Земля GPS' },
    { id: 'gps.tx', x: 812, y: 396, type: 'SERIAL_OUT', label: 'TX', tip: 'Передача GPS → ПК RX2' },
    { id: 'gps.rx', x: 812, y: 420, type: 'SERIAL_IN', label: 'RX', tip: 'Приём GPS ← ПК TX2' },

    { id: 'cam.v5', x: 340, y: 572, type: 'PWR_IN', label: '5V', tip: 'Питание камеры (от VTX)' },
    { id: 'cam.gnd', x: 340, y: 596, type: 'GND', label: 'GND', tip: 'Земля камеры' },
    { id: 'cam.vout', x: 340, y: 620, type: 'VIDEO_OUT', label: 'VID', tip: 'Видеовыход (композит)' },

    { id: 'vtx.campwr5', x: 630, y: 566, type: 'PWR_IN', label: 'CAM 5V', tip: 'Питание камеры на разъёме VTX' },
    { id: 'vtx.campwrgnd', x: 630, y: 588, type: 'GND', label: 'CAM GND', tip: 'Земля камеры на разъёме VTX' },
    { id: 'vtx.vin', x: 630, y: 610, type: 'VIDEO_IN', label: 'VID', tip: 'Видеовход' },
    { id: 'vtx.v5', x: 780, y: 572, type: 'PWR_IN', label: '5V', tip: 'Питание VTX от ПК' },
    { id: 'vtx.gnd', x: 780, y: 610, type: 'GND', label: 'GND', tip: 'Земля VTX' },

    { id: 'buz.sig', x: 153, y: 219, type: 'BUZ_IN', label: 'SIG', tip: 'Сигнал пищалки' }
  ];
  const PAD = {};
  PADS.forEach(p => { PAD[p.id] = p; });

  /* ═══════════ Рендер стола ═══════════ */
  const bench = $('#workbench');
  const wiresSvg = $('#wiresSvg');
  if (!bench || !wiresSvg) return;

  const padById = {};
  COMPONENTS.forEach(c => {
    const div = document.createElement('div');
    div.className = 'wb-comp ' + c.cls;
    div.style.left = (c.x / VW * 100) + '%';
    div.style.top = (c.y / VH * 100) + '%';
    div.style.width = (c.w / VW * 100) + '%';
    div.style.height = (c.h / VH * 100) + '%';
    div.innerHTML = c.html;
    bench.appendChild(div);
  });
  PADS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'wb-pad type-' + p.type.toLowerCase().replace('_', '-');
    btn.id = 'pad-' + p.id;
    btn.style.left = (p.x / VW * 100) + '%';
    btn.style.top = (p.y / VH * 100) + '%';
    btn.dataset.pad = p.id;
    btn.title = p.tip;
    btn.innerHTML = '<span>' + p.label + '</span>';
    btn.setAttribute('aria-label', p.tip);
    bench.appendChild(btn);
    padById[p.id] = btn;
  });

  /* ═══════════ Классификатор соединений ═══════════ */
  function wirelessBoom() { return { verdict: 'boom', msg: 'КЗ! Питание на землю — дым, запах, отключите АКБ!' }; }
  const isPower = t => t === 'PWR_SRC' || t === 'PWR_IN';

  function classify(aId, bId) {
    const A = PAD[aId], B = PAD[bId];
    const ta = A.type, tb = B.type;

    if (ta === tb) {
      if (ta === 'GND') return { verdict: 'ok', cat: 'ground', msg: 'Общая земля' };
      if (ta === 'VBAT') return { verdict: 'ok', cat: 'vbat', msg: 'Силовой жгут подключён' };
      if (ta === 'PHASE') {
        const m1 = aId.match(/m([1-4])/), m2 = bId.match(/m([1-4])/);
        if (aId.startsWith('esc.ph_') && bId.startsWith('m') && m1 && m2 && m1[1] === m2[1]) {
          return { verdict: 'ok', cat: 'phase', msg: 'Фазы M' + m1[1] + ' подключены' };
        }
        if (aId.startsWith('esc.ph_') && bId.startsWith('esc.ph_')) return wirelessBoom();
        if (aId.startsWith('m') && bId.startsWith('m')) return { verdict: 'err', cat: null, msg: 'Фаза на фазу двух моторов — бессмысленно и опасно' };
        return { verdict: 'err', cat: null, msg: 'Не тот мотор: жгут ESC M' + (m1 ? m1[1] : '?') + ' → мотор M' + (m2 ? m2[1] : '?') };
      }
      if (ta === 'PWR_SRC') return { verdict: 'ok', cat: 'power', msg: 'Параллельные источники 5В — не страшно, но и не нужно' };
      if (ta === 'PWR_IN') return { verdict: 'ok', cat: 'power', msg: 'Питание потребителей в параллель' };
      if (ta === 'PWM_IN' || ta === 'PWM_OUT') {
        return { verdict: 'err', cat: null, msg: ta === 'PWM_OUT' ? 'Выходы ПК в параллель — спалите таймер ШИМ' : 'Входы ESC в параллель — сигналы смешаются' };
      }
      if (ta === 'SERIAL_OUT' || ta === 'SERIAL_IN') {
        return { verdict: 'err', cat: null, msg: ta === 'SERIAL_OUT' ? 'Два передатчика — никто не слушает' : 'Два слушателя в тишине: нужен передатчик (TX)' };
      }
      if (ta === 'VIDEO_OUT' || ta === 'VIDEO_IN') {
        return { verdict: 'err', cat: null, msg: ta === 'VIDEO_OUT' ? 'Два видеовыхода — куда картинка?' : 'Два видеовхода — нечего смотреть' };
      }
      if (ta === 'BUZ_OUT' || ta === 'BUZ_IN') return { verdict: 'err', cat: null, msg: 'Пищалка одна: BUZ выход → SIG вход, и всё' };
    }

    const pair = [ta, tb].sort().join('+');
    if (pair === 'GND+PWR_IN' || pair === 'GND+PWR_SRC') return wirelessBoom();
    if (pair === 'PWR_IN+PWR_SRC') return { verdict: 'ok', cat: 'power', msg: 'Питание от шины' };
    if (pair === 'PWR_IN+PWR_IN') return { verdict: 'ok', cat: 'power', msg: 'Общая шина питания' };
    if (pair === 'PWR_SRC+PWR_SRC') return { verdict: 'ok', cat: 'power', msg: 'Шины в параллель' };
    if (pair === 'PWM_IN+PWM_OUT') return { verdict: 'ok', cat: 'pwm', msg: 'Сигнал ШИМ ПК → ESC' };
    if (pair === 'PHASE+PWM_OUT') return { verdict: 'err', cat: null, msg: 'ШИМ — это не силовая фаза: мотор не закрутится' };
    if (pair === 'PHASE+PWM_IN') return { verdict: 'err', cat: null, msg: 'Фаза мотора на сигнальный вход ESC — Gate драйвер умрёт' };
    if (pair === 'SERIAL_IN+SERIAL_OUT') return { verdict: 'ok', cat: 'serial', msg: 'UART: говорящий → слушающий' };
    if (pair === 'VIDEO_IN+VIDEO_OUT') return { verdict: 'ok', cat: 'video', msg: 'Композитный видеосигнал' };
    if (pair === 'BUZ_IN+BUZ_OUT') return { verdict: 'ok', cat: 'buzzer', msg: 'Сигнал на пищалку' };
    if (pair === 'GND+VBAT') return wirelessBoom();
    if (pair === 'PHASE+VBAT') return wirelessBoom();
    if (pair === 'PWR_IN+VBAT' || pair === 'PWR_SRC+VBAT') return { verdict: 'err', cat: null, msg: '16,8 В напрямую на 5В! Сначала BEC регулятора' };
    if (pair === 'SERIAL_IN+PWM_OUT' || pair === 'SERIAL_OUT+PWM_OUT' || pair === 'SERIAL_IN+PWM_IN' || pair === 'SERIAL_OUT+PWM_IN') {
      return { verdict: 'err', cat: null, msg: 'ШИМ и UART — разные протоколы, договориться не смогут' };
    }
    if (pair === 'VIDEO_IN+PWM_OUT' || pair === 'VIDEO_OUT+PWM_OUT') return { verdict: 'err', cat: null, msg: 'Видео и ШИМ несовместимы' };
    if (pair === 'BUZ_IN+PWM_OUT' || pair === 'BUZ_OUT+PWM_OUT' || pair === 'BUZ_IN+SERIAL_OUT') {
      return { verdict: 'ok', cat: 'buzzer', msg: 'Сигнал на пищалку (подойдёт любое переключение)' };
    }
    return { verdict: 'err', cat: null, msg: 'Несовместимые контакты: ' + A.label + ' (' + ta + ') ↔ ' + B.label + ' (' + tb + ')' };
  }

  const CAT_COLOR = { vbat: '#ff4d5e', power: '#ff8a2a', ground: '#8fa3c0', pwm: '#ffb066', phase: '#2fe08c', serial: '#38d0ff', video: '#ffd23e', buzzer: '#ff6fd8' };
  const CAT_WIDTH = { vbat: 8, power: 4.5, ground: 3.2, pwm: 3, phase: 7, serial: 3, video: 3.4, buzzer: 3 };

  /* ═══════════ Состояние ═══════════ */
  let wires = [];       // {id, a, b, cat}
  let selected = null;
  let wireSeq = 0, errorCount = 0, burntCount = 0;

  const statsEl = { wires: $('#wireCount'), errors: $('#errCount'), burnt: $('#burntCount') };
  const benchMsg = $('#benchMsg');

  function updateStats() {
    if (statsEl.wires) statsEl.wires.textContent = String(wires.length);
    if (statsEl.errors) statsEl.errors.textContent = String(errorCount);
    if (statsEl.burnt) statsEl.burnt.textContent = String(burntCount);
  }
  function benchNote(text, tone) {
    if (!benchMsg) return;
    benchMsg.textContent = text;
    benchMsg.style.color = tone === 'ok' ? 'var(--green)' : tone === 'err' ? '#ffb3bb' : tone === 'warn' ? 'var(--yellow)' : 'var(--muted)';
  }

  /* ═══════════ Отрисовка проводов ═══════════ */
  function drawWires() {
    wiresSvg.innerHTML = '';
    wires.forEach(w => {
      const A = PAD[w.a], B = PAD[w.b];
      const mx = (A.x + B.x) / 2;
      const sag = 34 + Math.abs(B.x - A.x) * 0.08;
      const path = 'M ' + A.x + ' ' + A.y + ' C ' + mx + ' ' + (Math.max(A.y, B.y) + sag) + ', ' + mx + ' ' + (Math.max(A.y, B.y) + sag) + ', ' + B.x + ' ' + B.y;
      const color = CAT_COLOR[w.cat] || '#e9eefb';
      const width = CAT_WIDTH[w.cat] || 3.2;
      wiresSvg.innerHTML +=
        '<path d="' + path + '" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="' + (width + 2.4) + '" stroke-linecap="round"/>' +
        '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round"/>';
    });
    // свежий провод подсветим
    if (wires.length) {
      const w = wires[wires.length - 1];
      const A = PAD[w.a], B = PAD[w.b];
      const mx = (A.x + B.x) / 2;
      const sag = 34 + Math.abs(B.x - A.x) * 0.08;
      const path = 'M ' + A.x + ' ' + A.y + ' C ' + mx + ' ' + (Math.max(A.y, B.y) + sag) + ', ' + mx + ' ' + (Math.max(A.y, B.y) + sag) + ', ' + B.x + ' ' + B.y;
      wiresSvg.innerHTML += '<path d="' + path + '" fill="none" stroke="#ffffff" stroke-width="1.1" stroke-opacity="0.65" stroke-linecap="round" stroke-dasharray="5 9" class="wire-shine"/>';
    }
  }

  function renderWireList() {
    const list = $('#wireList');
    if (!list) return;
    if (!wires.length) { list.innerHTML = '<div class="wb-empty">Провода не подключены. Кликните первый контакт…</div>'; return; }
    list.innerHTML = wires.map(w => {
      const A = PAD[w.a], B = PAD[w.b];
      return '<div class="wb-wire"><span class="wb-wire-dot" style="background:' + (CAT_COLOR[w.cat] || '#fff') + '"></span>' +
        '<span class="wb-wire-text">' + A.label + ' <i>(' + compName(w.a) + ')</i> → ' + B.label + ' <i>(' + compName(w.b) + ')</i></span>' +
        '<button class="wb-wire-del" data-id="' + w.id + '" aria-label="Удалить провод">×</button></div>';
    }).join('');
    $$('.wb-wire-del', list).forEach(btn => btn.addEventListener('click', () => {
      wires = wires.filter(w => w.id !== btn.dataset.id);
      drawWires(); renderWireList(); refreshChecklist(); updateStats();
    }));
  }
  function compName(padId) {
    const c = padId.split('.')[0];
    const names = { bat: 'АКБ', esc: 'ESC', fc: 'ПК', m1: 'M1', m2: 'M2', m3: 'M3', m4: 'M4', rx: 'RX', gps: 'GPS', cam: 'CAM', vtx: 'VTX', buz: 'BUZ' };
    return names[c] || c.toUpperCase();
  }

  /* ═══════════ Чек-лист сборки ═══════════ */
  const W = (a, b) => wires.some(w => (w.a === a && w.b === b) || (w.a === b && w.b === a));
  const Wany = (pairs) => pairs.some(([a, b]) => W(a, b));
  const CHECKLIST = [
    { group: '1 · Силовая цепь', items: [
      { id: 'vbat', label: 'Силовой жгут АКБ → ESC (VBAT)', pads: ['bat.vbat', 'esc.vbat'], test: () => W('bat.vbat', 'esc.vbat') },
      { id: 'esc5v', label: 'BEC ESC 5В → ПК (5V IN)', pads: ['esc.v5_out', 'fc.vin_5v'], test: () => W('esc.v5_out', 'fc.vin_5v') },
      { id: 'esgnd', label: 'ESC GND → ПК (GND)', pads: ['esc.gnd_out', 'fc.gnd_in'], test: () => W('esc.gnd_out', 'fc.gnd_in') }
    ]},
    { group: '2 · Моторная ось', items: [
      { id: 'pwm1', label: 'ПК M1 → ESC S1', pads: ['fc.m1', 'esc.s1'], test: () => W('fc.m1', 'esc.s1') },
      { id: 'pwm2', label: 'ПК M2 → ESC S2', pads: ['fc.m2', 'esc.s2'], test: () => W('fc.m2', 'esc.s2') },
      { id: 'pwm3', label: 'ПК M3 → ESC S3', pads: ['fc.m3', 'esc.s3'], test: () => W('fc.m3', 'esc.s3') },
      { id: 'pwm4', label: 'ПК M4 → ESC S4', pads: ['fc.m4', 'esc.s4'], test: () => W('fc.m4', 'esc.s4') },
      { id: 'ph1', label: 'Жгут ESC → мотор M1', pads: ['esc.ph_m1', 'm1.ph'], test: () => W('esc.ph_m1', 'm1.ph') },
      { id: 'ph2', label: 'Жгут ESC → мотор M2', pads: ['esc.ph_m2', 'm2.ph'], test: () => W('esc.ph_m2', 'm2.ph') },
      { id: 'ph3', label: 'Жгут ESC → мотор M3', pads: ['esc.ph_m3', 'm3.ph'], test: () => W('esc.ph_m3', 'm3.ph') },
      { id: 'ph4', label: 'Жгут ESC → мотор M4', pads: ['esc.ph_m4', 'm4.ph'], test: () => W('esc.ph_m4', 'm4.ph') }
    ]},
    { group: '3 · Периферия', items: [
      { id: 'gpspwr', label: 'GPS: питание 5В и GND', pads: ['fc.v5_out', 'gps.v5', 'fc.gnd_out', 'gps.gnd'], test: () => W('fc.v5_out', 'gps.v5') && W('fc.gnd_out', 'gps.gnd') },
      { id: 'gpstx', label: 'GPS TX → ПК RX2', pads: ['gps.tx', 'fc.rx2'], test: () => W('gps.tx', 'fc.rx2') },
      { id: 'gpsrx', label: 'ПК TX2 → GPS RX', pads: ['fc.tx2', 'gps.rx'], test: () => W('fc.tx2', 'gps.rx') },
      { id: 'rxpwr', label: 'Приёмник: питание 5В и GND', pads: ['fc.v5_out', 'rx.v5', 'fc.gnd_out', 'rx.gnd'], test: () => W('fc.v5_out', 'rx.v5') && W('fc.gnd_out', 'rx.gnd') },
      { id: 'sbus', label: 'Приёмник SBUS → ПК SBUS', pads: ['rx.sbus', 'fc.rx1'], test: () => W('rx.sbus', 'fc.rx1') },
      { id: 'campwr', label: 'Камера → VTX: питание (5В+GND)', pads: ['cam.v5', 'vtx.campwr5', 'cam.gnd', 'vtx.campwrgnd'], test: () => W('cam.v5', 'vtx.campwr5') && W('cam.gnd', 'vtx.campwrgnd') },
      { id: 'camvid', label: 'Камера VID → VTX VID', pads: ['cam.vout', 'vtx.vin'], test: () => W('cam.vout', 'vtx.vin') },
      { id: 'vtxpwr', label: 'VTX: питание 5В и GND от ПК', pads: ['fc.v5_out', 'vtx.v5', 'fc.gnd_out', 'vtx.gnd'], test: () => W('fc.v5_out', 'vtx.v5') && W('fc.gnd_out', 'vtx.gnd') },
      { id: 'buz', label: 'Пищалка → ПК BUZ', pads: ['buz.sig', 'fc.buz'], test: () => W('buz.sig', 'fc.buz') }
    ]}
  ];

  function refreshChecklist() {
    let done = 0, total = 0;
    CHECKLIST.forEach(group => group.items.forEach(item => {
      total++;
      const ok = item.test();
      if (ok) done++;
      const row = document.getElementById('chk-' + item.id);
      if (row) row.classList.toggle('done', ok);
    }));
    const bar = $('#buildProgress');
    if (bar) bar.style.width = (total ? done / total * 100 : 0).toFixed(0) + '%';
    const cnt = $('#buildDone');
    if (cnt) cnt.textContent = done + ' / ' + total;
    // питание ПК → светодиод
    const powered = W('esc.v5_out', 'fc.vin_5v') && W('esc.gnd_out', 'fc.gnd_in');
    const led = document.getElementById('fcLed');
    if (led) led.classList.toggle('on', powered);
    // ARM появляется при полной сборке
    const armZone = $('#wiringArmZone');
    if (armZone) armZone.classList.toggle('visible', done === total);
    if (done === total) {
      benchNote('СХЕМА СОБРАНА! Копеечка на ARM — и коптер дёрнется.', 'ok');
    }
  }

  /* подсказка: подсветить следующую пару */
  const hintBtn = $('#wiringHint');
  if (hintBtn) hintBtn.addEventListener('click', () => {
    const next = CHECKLIST.flatMap(g => g.items).find(i => !i.test());
    if (!next) { benchNote('Всё подключено! Жмите ARM.', 'ok'); return; }
    next.pads.forEach(id => {
      const el = document.getElementById('pad-' + id);
      if (el) { el.classList.add('hint-pulse'); setTimeout(() => el.classList.remove('hint-pulse'), 2600); }
    });
    benchNote('Подсказка: ' + next.label, 'warn');
  });

  const undoBtn = $('#wiringUndo');
  if (undoBtn) undoBtn.addEventListener('click', () => {
    if (!wires.length) return;
    wires.pop();
    drawWires(); renderWireList(); refreshChecklist(); updateStats();
    benchNote('Последний провод убран.', 'muted');
  });
  const resetBtn = $('#wiringReset');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (!wires.length) return;
    if (window.confirm('Сжечь схему и снять все провода?')) {
      wires = [];
      selected = null;
      $$('.wb-pad.selected', bench).forEach(el => el.classList.remove('selected'));
      drawWires(); renderWireList(); refreshChecklist(); updateStats();
      benchNote('Стол чист. Собираем заново — осознанно.', 'muted');
    }
  });

  const armBtn = $('#wiringArm');
  if (armBtn) armBtn.addEventListener('click', () => {
    $$('.wb-motor', bench).forEach(el => el.classList.add('spinning'));
    benchNote('ARMED! Моторы дёрнулись. Теперь — в мастер Pixhawk за калибровками.', 'ok');
    armBtn.disabled = true;
    armBtn.textContent = 'КОПТЕР ЖИВ ✓';
    window.AeroLab.unlock('wiring_ok');
  });

  /* ═══════════ Взрыв при КЗ ═══════════ */
  function explode(x, y) {
    burntCount++;
    updateStats();
    const flash = document.createElement('div');
    flash.className = 'bench-flash';
    bench.appendChild(flash);
    for (let i = 0; i < 7; i++) {
      const puff = document.createElement('div');
      puff.className = 'smoke-puff';
      puff.style.left = (clamp(x + (Math.random() - 0.5) * 60, 10, VW - 30) / VW * 100) + '%';
      puff.style.top = (clamp(y + (Math.random() - 0.5) * 40, 10, VH - 30) / VH * 100) + '%';
      puff.style.animationDelay = (Math.random() * 0.25) + 's';
      bench.appendChild(puff);
      setTimeout(() => puff.remove(), 1400);
    }
    setTimeout(() => flash.remove(), 700);
    bench.classList.add('bench-shake');
    setTimeout(() => bench.classList.remove('bench-shake'), 550);
    benchNote('БА-БАХ! Короткое замыкание. Провод сгорел — заменили бесплатно (это симулятор).', 'err');
  }

  /* ═══════════ Клики по контактам ═══════════ */
  const UNLIMITED = new Set(['fc.v5_out', 'fc.gnd_out', 'esc.v5_out', 'esc.gnd_out']);
  const countOnPad = id => wires.filter(w => w.a === id || w.b === id).length;
  const isGnd = id => PAD[id].type === 'GND';

  PADS.forEach(p => {
    const btn = padById[p.id];
    btn.addEventListener('click', () => {
      // сняли выделение
      if (selected === p.id) {
        selected = null;
        btn.classList.remove('selected');
        return;
      }
      if (!selected) {
        selected = p.id;
        btn.classList.add('selected');
        benchNote('Выбрано: ' + p.tip + '. Теперь кликните второй контакт.', 'muted');
        return;
      }
      const a = selected, b = p.id;
      const selBtn = padById[a];
      selected = null;
      selBtn.classList.remove('selected');

      // уже подключено?
      if (wires.some(w => (w.a === a && w.b === b) || (w.a === b && w.b === a))) {
        benchNote('Такое соединение уже есть.', 'warn');
        return;
      }
      // лимит на занятый контакт (кроме шин)
      const limit = id => UNLIMITED.has(id) || isGnd(id);
      if (!limit(a) && countOnPad(a) >= 1) { errorCount++; updateStats(); benchNote('Контакт ' + PAD[a].tip + ' уже занят.', 'err'); return; }
      if (!limit(b) && countOnPad(b) >= 1) { errorCount++; updateStats(); benchNote('Контакт ' + PAD[b].tip + ' уже занят.', 'err'); return; }

      const verdict = classify(a, b);
      if (verdict.verdict === 'boom') {
        const A = PAD[a], B = PAD[b];
        explode((A.x + B.x) / 2, (A.y + B.y) / 2);
        return;
      }
      if (verdict.verdict === 'err') {
        errorCount++;
        updateStats();
        const btn2 = padById[b];
        btn2.classList.add('pad-error');
        setTimeout(() => btn2.classList.remove('pad-error'), 900);
        benchNote(verdict.msg, 'err');
        return;
      }
      wires.push({ id: 'w' + (++wireSeq), a, b, cat: verdict.cat || 'ground' });
      drawWires();
      renderWireList();
      refreshChecklist();
      updateStats();
      benchNote(verdict.msg, 'ok');
    });
  });

  /* ═══════════ Пуск ═══════════ */
  renderWireList();
  refreshChecklist();
  updateStats();
})();
