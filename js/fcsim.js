'use strict';
/* АэроЛаб · fcsim.js — Симулятор полётного контроллера: PID-бенч, моторы/микшер, CLI */
(function () {
  const { clamp, $, $$ } = window.AeroLab;
  const page = $('#page-fcsim');
  if (!page) return;

  /* Общее состояние «полётника» — его же крутит CLI */
  const fc = { p: 45, i: 35, d: 25, ff: 15, armed: false };
  window.AeroLab.fcState = fc;

  /* ═══════════════ Под-вкладки ═══════════════ */
  const subBtns = $$('.fc-subtab', page);
  function activateSub(name) {
    subBtns.forEach(b => b.classList.toggle('active', b.dataset.fc === name));
    $$('.fc-panel', page).forEach(p => p.classList.toggle('active', p.id === 'fcPanel-' + name));
    $$('.fc-stage', page).forEach(p => p.classList.toggle('active', p.id === 'fcStage-' + name));
    if (name === 'motors') drawMotors();
  }
  subBtns.forEach(b => b.addEventListener('click', () => activateSub(b.dataset.fc)));

  /* ═══════════════ PID-БЕНЧ ═══════════════
     Сервомодель угла (градусы): θ'' = (a·u − d·θ'), лаг мотора 90 мс.
     u = (P·e + I·∫e − D·θ')/1000. Ступенька 0 → 25°, рампа 250 мс. */
  const pid = {
    canvas: $('#pidCanvas'),
    ctx: null,
    target: 25
  };
  pid.ctx = pid.canvas ? pid.canvas.getContext('2d') : null;

  function runPidSim() {
    const T = 2.0, dt = 0.0008, a = 400, d = 1.5, rampMs = 250;
    const target = pid.target;
    let th = 0, w = 0, integ = 0, m = 0, maxTh = 0, prevTgt = 0, settle = 0;
    let crossings = 0, prevSign = 1, crossed = false;
    const trace = [];
    const steps = Math.floor(T / dt);
    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      const tgt = target * Math.min(1, t / (rampMs / 1000));
      const e = tgt - th;
      integ = clamp(integ + e * dt, -2.2, 2.2);
      const dTgt = (tgt - prevTgt) / dt; prevTgt = tgt;
      let u = (fc.p * e + fc.i * integ - fc.d * w + fc.ff * dTgt * 0.06) / 1000;
      u = clamp(u, -1.5, 1.5);
      m += (u - m) * (dt / 0.09);
      w += (a * m - d * w) * dt;
      th += w * dt;
      const dv = th - target, s = Math.sign(dv) || 1;
      if (Math.abs(dv) > 2) settle = t;
      if (crossed && Math.abs(dv) > 2) { if (s !== prevSign) { crossings++; prevSign = s; } }
      if (!crossed && th >= target) { crossed = true; prevSign = Math.sign(dv) || 1; }
      if (th > maxTh) maxTh = th;
      if (i % 8 === 0) trace.push({ t, th, tgt });
    }
    const over = Math.max(0, (maxTh - target) / target * 100);
    return { trace, over, settle, crossings, end: th, maxTh };
  }

  const pidEl = {
    p: $('#pidP'), i: $('#pidI'), d: $('#pidD'), ff: $('#pidFf'),
    pOut: $('#pidPOut'), iOut: $('#pidIOut'), dOut: $('#pidDOut'), ffOut: $('#pidFfOut'),
    os: $('#pidOvershoot'), settle: $('#pidSettle'), osc: $('#pidOsc'), end: $('#pidEnd'),
    verdict: $('#pidVerdict'), verdictText: $('#pidVerdictText'), diag: $('#pidDiag')
  };

  const PID_PRESETS = {
    factory: { p: 45, i: 35, d: 25, ff: 15 },
    soft:    { p: 30, i: 25, d: 32, ff: 5 },
    ringing: { p: 140, i: 60, d: 4, ff: 0 },
    lazy:    { p: 12, i: 10, d: 12, ff: 0 }
  };

  function syncPidInputs() {
    ['p', 'i', 'd', 'ff'].forEach(k => {
      const input = pidEl[k];
      if (input) {
        input.value = fc[k];
        window.AeroLab.paintRange(input);
      }
    });
    pidEl.pOut.textContent = fc.p;
    pidEl.iOut.textContent = fc.i;
    pidEl.dOut.textContent = fc.d;
    pidEl.ffOut.textContent = fc.ff;
  }

  function drawPid(fromUser) {
    const ctx = pid.ctx;
    if (!ctx) return;
    const W = pid.canvas.width, H = pid.canvas.height;
    const res = runPidSim();

    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#070d1f'); bg.addColorStop(1, '#0a1330');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const padL = 40, padR = 12, padT = 14, padB = 30;
    const tMax = 2.0, yMax = 60; // градусы
    const X = t => padL + t / tMax * (W - padL - padR);
    const Y = v => H - padB - clamp(v, -8, yMax) / yMax * (H - padT - padB);

    // полоса ±2°
    ctx.fillStyle = 'rgba(47,224,140,0.09)';
    ctx.fillRect(padL, Y(27), W - padL - padR, Y(23) - Y(27));
    // сетка
    ctx.strokeStyle = 'rgba(140,165,210,0.13)'; ctx.lineWidth = 1;
    ctx.font = '10px "Segoe UI",sans-serif'; ctx.fillStyle = '#6b7ca3';
    for (let v = 0; v <= 60; v += 15) {
      ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(W - padR, Y(v)); ctx.stroke();
      ctx.fillText(v + '°', 8, Y(v) + 3);
    }
    for (let t = 0; t <= 2; t += 0.5) {
      ctx.beginPath(); ctx.moveTo(X(t), padT); ctx.lineTo(X(t), H - padB); ctx.stroke();
      ctx.fillText(t.toFixed(1) + ' с', X(t) - 10, H - padB + 14);
    }
    // линия задания
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,210,62,0.75)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(padL, Y(pid.target)); ctx.lineTo(W - padR, Y(pid.target)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd23e'; ctx.fillText('задание 25°', padL + 6, Y(pid.target) - 5);

    // кривая отклика
    ctx.beginPath();
    res.trace.forEach((pt, i) => { const x = X(pt.t), y = Y(pt.th); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.strokeStyle = '#38d0ff'; ctx.lineWidth = 2.4; ctx.stroke();
    // точка пика
    if (res.maxTh > pid.target) {
      ctx.beginPath(); ctx.arc(W - 22, Y(clamp(res.maxTh, -8, yMax)), 0, 0, Math.PI * 2); // noop, keeps symmetry
    }
    // рамка
    ctx.strokeStyle = 'rgba(56,208,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB);

    // метрики
    pidEl.os.textContent = res.over.toFixed(0) + ' %';
    pidEl.settle.textContent = res.settle >= 1.98 ? '> 2 с' : res.settle.toFixed(2) + ' с';
    pidEl.osc.textContent = String(res.crossings);
    pidEl.end.textContent = res.end.toFixed(1) + '°';

    // вердикт
    const os = res.over, cross = res.crossings, settle = res.settle;
    let cls, text, diag;
    if (cross >= 2 || os > 25) {
      cls = 'bad'; text = 'ЗВЕНИТ — НАСТРОЙКА НЕБЕЗОПАСНА';
      diag = 'Выраженное перерегулирование и колебания вокруг задания. Так коптер «тюбится» в воздухе и раскачивается. Лечение: добавьте D или снизьте P. I трогать в последнюю очередь.';
    } else if (os > 12) {
      cls = 'warn'; text = 'ЛЁГКИЙ ПЕРЕЛЁТ';
      diag = 'Небольшой перелёт через задание. Чуть увеличьте D или убавьте P на 10–15%.';
    } else if (settle > 1.6 || res.end < pid.target - 3) {
      cls = 'warn'; text = 'ВЯЛО';
      diag = 'Отклик затянут, коптер «не успевает» за стиком. Поднимите P (например, до 30–45) и убедитесь, что I не ноль.';
    } else {
      cls = 'ok'; text = 'ЗЕЛЁНАЯ ЗОНА BETAFLIGHT';
      diag = 'Перерегулирование в пределах 12%, колебаний нет, установление быстрое. Такую настройку можно смело прошивать в учебный коптер.';
    }
    pidEl.verdict.className = 'fc-verdict ' + cls;
    pidEl.verdictText.textContent = text;
    pidEl.diag.textContent = diag;
    if (cls === 'ok' && fromUser) window.AeroLab.unlock('pid_zone');
    return res;
  }

  [['pidP', 'p'], ['pidI', 'i'], ['pidD', 'd'], ['pidFf', 'ff']].forEach(([id, key]) => {
    const input = $('#' + id);
    if (!input) return;
    window.AeroLab.bindRange(input);
    input.addEventListener('input', () => {
      fc[key] = parseFloat(input.value);
      syncPidInputs();
      drawPid(true);
    });
  });

  $$('.pid-preset', page).forEach(btn => btn.addEventListener('click', () => {
    const p = PID_PRESETS[btn.dataset.preset];
    if (!p) return;
    fc.p = p.p; fc.i = p.i; fc.d = p.d; fc.ff = p.ff;
    syncPidInputs();
    drawPid(true);
  }));

  const saveBtn = $('#pidFlash');
  if (saveBtn) saveBtn.addEventListener('click', () => {
    cliLog('set pid_roll_p = ' + fc.p);
    cliLog('set pid_roll_i = ' + fc.i);
    cliLog('set pid_roll_d = ' + fc.d);
    cliLog('set pid_roll_ff = ' + fc.ff);
    cliLog('save');
    activateSub('cli');
  });

  /* ═══════════════ МОТОРЫ И МИКШЕР (X) ═══════════════ */
  const mixEl = {
    thr: $('#mixThrottle'), roll: $('#mixRoll'), pitch: $('#mixPitch'), yaw: $('#mixYaw'),
    thrOut: $('#mixThrottleOut'), rollOut: $('#mixRollOut'), pitchOut: $('#mixPitchOut'), yawOut: $('#mixYawOut'),
    armBtn: $('#mixArm'), armLamp: $('#mixArmLamp'), armText: $('#mixArmText'),
    canvas: $('#mixCanvas'), ctx: null
  };
  mixEl.ctx = mixEl.canvas ? mixEl.canvas.getContext('2d') : null;

  ['mixThrottle', 'mixRoll', 'mixPitch', 'mixYaw'].forEach(id => { const el = $('#' + id); if (el) window.AeroLab.bindRange(el); });

  function mixValues() {
    const thr = parseFloat(mixEl.thr.value), roll = parseFloat(mixEl.roll.value),
          pitch = parseFloat(mixEl.pitch.value), yaw = parseFloat(mixEl.yaw.value);
    if (!fc.armed) return { thr: 0, roll, pitch, yaw, m: [0, 0, 0, 0] };
    const m = [
      clamp(thr - roll + pitch - yaw, 0, 100),  // M1 ПП CW
      clamp(thr - roll - pitch + yaw, 0, 100),  // M2 ЗП CCW
      clamp(thr + roll - pitch - yaw, 0, 100),  // M3 ЗЛ CW
      clamp(thr + roll + pitch + yaw, 0, 100)   // M4 ПЛ CCW
    ];
    return { thr, roll, pitch, yaw, m };
  }

  function drawMotors() {
    const ctx = mixEl.ctx;
    if (!ctx) return;
    const W = mixEl.canvas.width, H = mixEl.canvas.height;
    const vals = mixValues();

    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.75);
    bg.addColorStop(0, '#0e1730'); bg.addColorStop(1, '#060b18');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2 - 8, arm = 92;
    const pos = [[1, -1], [1, 1], [-1, 1], [-1, -1]]; // M1 ПП, M2 ЗП, M3 ЗЛ, M4 ПЛ
    const cw = [true, false, true, false];

    // руки
    pos.forEach(([sx, sy]) => {
      ctx.strokeStyle = fc.armed ? '#33477c' : '#1d2947';
      ctx.lineWidth = 16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sx * arm * 0.72, cy + sy * arm * 0.72); ctx.stroke();
    });
    // корпус
    ctx.fillStyle = '#182449';
    roundRect(ctx, cx - 42, cy - 26, 84, 52, 12); ctx.fill();
    ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 2;
    roundRect(ctx, cx - 42, cy - 26, 84, 52, 12); ctx.stroke();
    ctx.fillStyle = '#38d0ff'; ctx.font = 'bold 12px "Segoe UI",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(fc.armed ? 'ARMED' : 'DISARM', cx, cy + 4);
    ctx.textAlign = 'left';

    // моторы
    pos.forEach(([sx, sy], i) => {
      const x = cx + sx * arm * 0.72, y = cy + sy * arm * 0.72;
      const out = vals.m[i];
      // дуговая стрелка направления вращения
      const dir = cw[i] ? 1 : -1;
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = out > 2 ? (cw[i] ? '#38d0ff' : '#ff8a2a') : '#263563';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 26, dir > 0 ? -0.4 : Math.PI + 0.4, dir > 0 ? 1.5 : Math.PI - 1.5, dir < 0);
      ctx.stroke();
      // наконечник стрелки
      const aEnd = dir > 0 ? 1.5 : Math.PI - 1.5;
      const tx = Math.cos(aEnd) * 26, ty = Math.sin(aEnd) * 26;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.arc(tx, ty, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // мотор
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fillStyle = out > 2 ? '#1f2c55' : '#141f3d'; ctx.fill();
      ctx.strokeStyle = out > 2 ? '#8ae4ff' : '#33477c'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#e9eefb'; ctx.font = 'bold 10px "Segoe UI",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('M' + (i + 1), x, y + 3.5);
      // бар выхода
      const barH = 34, barW = 8;
      ctx.fillStyle = '#0b1220';
      roundRect(ctx, x - barW / 2, y + 22, barW, barH, 4); ctx.fill();
      const h = barH * out / 100;
      ctx.fillStyle = out > 85 ? '#ff4d5e' : out > 55 ? '#ffb066' : '#2fe08c';
      if (h > 0.5) { roundRect(ctx, x - barW / 2, y + 22 + (barH - h), barW, h, 4); ctx.fill(); }
      ctx.textAlign = 'left';
    });

    // итоговая таблица
    ctx.fillStyle = 'rgba(6,11,24,0.78)';
    ctx.fillRect(10, H - 30, W - 20, 22);
    ctx.fillStyle = '#8ae4ff'; ctx.font = '11px "Consolas",monospace';
    ctx.fillText('M1 ' + fmt2(vals.m[0]) + '%   M2 ' + fmt2(vals.m[1]) + '%   M3 ' + fmt2(vals.m[2]) + '%   M4 ' + fmt2(vals.m[3]) + '%', 18, H - 15);
  }
  const fmt2 = v => v.toFixed(0).padStart(2, '0');
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const mixOut = { thr: mixEl.thrOut, roll: mixEl.rollOut, pitch: mixEl.pitchOut, yaw: mixEl.yawOut };
  function syncMixOutputs() {
    mixOut.thr.textContent = mixEl.thr.value + ' %';
    mixOut.roll.textContent = signed(mixEl.roll.value);
    mixOut.pitch.textContent = signed(mixEl.pitch.value);
    mixOut.yaw.textContent = signed(mixEl.yaw.value);
  }
  const signed = v => (parseFloat(v) >= 0 ? '+' : '') + v;
  ['thr', 'roll', 'pitch', 'yaw'].forEach(k => {
    const id = 'mix' + k.charAt(0).toUpperCase() + k.slice(1);
    const input = $('#' + id);
    if (input) input.addEventListener('input', () => { syncMixOutputs(); drawMotors(); });
  });

  if (mixEl.armBtn) mixEl.armBtn.addEventListener('click', () => {
    fc.armed = !fc.armed;
    mixEl.armBtn.textContent = fc.armed ? 'DISARM' : 'ARM';
    mixEl.armBtn.classList.toggle('armed', fc.armed);
    mixEl.armText.textContent = fc.armed ? 'Коптер армирован' : 'Моторы заблокированы';
    if (mixEl.armLamp) mixEl.armLamp.classList.toggle('on', fc.armed);
    drawMotors();
  });

  /* ═══════════════ КОНСОЛЬ CLI ═══════════════ */
  const cliOut = $('#cliOutput');
  const cliInput = $('#cliInput');
  function cliLog(text) {
    if (!cliOut) return;
    cliOut.textContent += text + '\n';
    cliOut.scrollTop = cliOut.scrollHeight;
  }
  const CLI_HELP = [
    'Доступные команды:',
    '  status                — состояние полётника',
    '  dump                  — выгрузка конфигурации (Betaflight-стиль)',
    '  get pid_roll_p        — показать значение (i, d, ff тоже)',
    '  set pid_roll_p 52     — установить значение (синхронно с PID-бенчем)',
    '  save                  — записать во флеш',
    '  defaults              — заводские значения',
    '  clear                 — очистить экран',
    '  version               — версия прошивки'
  ];
  function cliExec(raw) {
    const line = raw.trim();
    if (!line) return;
    cliLog('> ' + line);
    const parts = line.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const key = (parts[1] || '').toLowerCase();
    switch (cmd) {
      case 'help':
        CLI_HELP.forEach(cliLog);
        break;
      case 'version':
        cliLog('Betaflight 4.5.0 (АэроЛаб SITL, учебная сборка) 2026.11.14');
        break;
      case 'status':
        cliLog('task: AIRBORNE · cpu: 7% · profile: 0 (rate 0) · armed: ' + (fc.armed ? 'armed' : 'disarmed'));
        cliLog('mixer: QUADX · pid_roll: ' + fc.p + '/' + fc.i + '/' + fc.d + ' · ff: ' + fc.ff);
        break;
      case 'dump':
        cliLog('# АэроЛаб SITL dump 2026.11.14');
        cliLog('set pid_roll_p = ' + fc.p);
        cliLog('set pid_roll_i = ' + fc.i);
        cliLog('set pid_roll_d = ' + fc.d);
        cliLog('set pid_roll_ff = ' + fc.ff);
        cliLog('set mixer_type = QUADX');
        cliLog('feature RX_SERIAL');
        cliLog('save');
        break;
      case 'get':
        if (/^pid_roll_(p|i|d|ff)$/.test(key)) cliLog(key + ' = ' + fc[key.split('_')[2]]);
        else cliLog('get: неизвестный параметр «' + key + '» (есть: pid_roll_p/i/d/ff)');
        break;
      case 'set': {
        const value = parseFloat(parts[2]);
        if (/^pid_roll_(p|i|d|ff)$/.test(key) && isFinite(value)) {
          const k = key.split('_')[2];
          fc[k] = clamp(Math.round(value), 0, 300);
          syncPidInputs();
          drawPid(true);
          cliLog(key + ' = ' + fc[k] + '  (применено)');
        } else {
          cliLog('set: ожидается «set pid_roll_p 52» с числом 0..300');
        }
        break;
      }
      case 'defaults':
        fc.p = 45; fc.i = 35; fc.d = 25; fc.ff = 15;
        syncPidInputs(); drawPid(true);
        cliLog('Заводские значения восстановлены (45/35/25, ff 15).');
        break;
      case 'save':
        cliLog('Configuration saved to flash (16 кБ свободно). Перезагрузка не требуется.');
        break;
      case 'clear':
        if (cliOut) cliOut.textContent = '';
        break;
      default:
        cliLog('Неизвестная команда «' + cmd + '». Введите help.');
    }
  }
  $$('.cli-quick', page).forEach(btn => btn.addEventListener('click', () => cliExec(btn.dataset.cmd || 'help')));

  const cliForm = $('#cliForm');
  if (cliForm) cliForm.addEventListener('submit', ev => {
    ev.preventDefault();
    const v = cliInput.value;
    cliInput.value = '';
    cliExec(v);
  });

  /* ═══════════════ Пуск ═══════════════ */
  syncPidInputs();
  syncMixOutputs();
  drawPid(false);
  cliLog('АэроЛаб SITL — учебный полётный контроллер.');
  cliLog('Введите help для списка команд.');
})();
