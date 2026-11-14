'use strict';
/* АэроЛаб · pixhawk.js — Симулятор Pixhawk: мастер настройки, параметры, сценарии failsafe */
(function () {
  const { clamp, $, $$ } = window.AeroLab;
  const page = $('#page-pixhawk');
  if (!page) return;

  /* ═══════════════ Под-вкладки ═══════════════ */
  const subBtns = $$('.fc-subtab', page);
  function activateSub(name) {
    subBtns.forEach(b => b.classList.toggle('active', b.dataset.phx === name));
    $$('.fc-panel', page).forEach(p => p.classList.toggle('active', p.id === 'phxPanel-' + name));
  }
  subBtns.forEach(b => b.addEventListener('click', () => activateSub(b.dataset.phx)));

  /* ═══════════════════════════════════════════════
     ПАНЕЛЬ 1 · МАСТЕР НАСТРОЙКИ (5 шагов)
     ═══════════════════════════════════════════════ */
  const stepsDone = { 1: false, 2: false, 3: false, 4: false, 5: false };

  function renderStepper() {
    $$('.ph-stepper .ph-stepdot', page).forEach(dot => {
      const n = parseInt(dot.dataset.step, 10);
      dot.classList.toggle('done', !!stepsDone[n]);
    });
    const doneCount = Object.values(stepsDone).filter(Boolean).length;
    const verdict = $('#phxVerdict');
    if (verdict) {
      verdict.className = 'build-verdict ' + (doneCount === 5 ? 'ok' : 'bad');
      verdict.innerHTML = '<span>' + (doneCount === 5
        ? 'PIXHAWK ГОТОВ — параметры сохранены, можно взлетать'
        : 'НАСТРОЙКА НЕ ЗАВЕРШЕНА: ' + doneCount + '/5 шагов') + '</span>';
    }
    if (doneCount === 5) window.AeroLab.unlock('pixhawk_ok');
  }
  function markStep(n) {
    stepsDone[n] = true;
    const el = $('#phxStep' + n);
    if (el) el.classList.add('done');
    const badge = $('#phxBadge' + n);
    if (badge) badge.textContent = '✓';
    renderStepper();
  }

  /* ── Шаг 1 · Акселерометр ── */
  const accPitch = $('#accPitch'), accRoll = $('#accRoll');
  const accPitchOut = $('#accPitchOut'), accRollOut = $('#accRollOut');
  const bubbleDot = $('#bubbleDot'), bubbleState = $('#bubbleState');
  const accBtn = $('#accCalibrate');

  function accRefresh() {
    const p = parseFloat(accPitch.value), r = parseFloat(accRoll.value);
    accPitchOut.textContent = (p >= 0 ? '+' : '') + p.toFixed(1) + '°';
    accRollOut.textContent = (r >= 0 ? '+' : '') + r.toFixed(1) + '°';
    window.AeroLab.paintRange(accPitch); window.AeroLab.paintRange(accRoll);
    const dx = clamp(r * 2.6, -38, 38), dy = clamp(-p * 2.6, -38, 38);
    if (bubbleDot) { bubbleDot.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))'; }
    const level = Math.abs(p) <= 1 && Math.abs(r) <= 1;
    if (bubbleState) {
      bubbleState.textContent = level ? 'РОВНО ✓ — можно калибровать' : 'Коптер наклонён — выровняйте стол/коптер';
      bubbleState.style.color = level ? 'var(--green)' : 'var(--muted)';
    }
    if (accBtn) accBtn.disabled = !level;
  }
  if (accPitch && accRoll) {
    window.AeroLab.bindRange(accPitch); window.AeroLab.bindRange(accRoll);
    accPitch.addEventListener('input', accRefresh);
    accRoll.addEventListener('input', accRefresh);
    accRefresh();
    accBtn.addEventListener('click', () => {
      if (accBtn.disabled) return;
      accBtn.disabled = true;
      accBtn.textContent = 'Калибровка…';
      setTimeout(() => {
        accBtn.textContent = 'Откалибровано ✓ (offsets: X 0.031, Y −0.018, Z 1.004)';
        accBtn.classList.add('done-btn');
        markStep(1);
      }, 900);
    });
  }

  /* ── Шаг 2 · Гироскоп (удерживать 3 сек) ── */
  const gyroHold = $('#gyroHold');
  const gyroBar = $('#gyroBar'), gyroState = $('#gyroState');
  const gyroCanvas = $('#gyroNoise');
  const gyroCtx = gyroCanvas ? gyroCanvas.getContext('2d') : null;
  let gyroHoldStart = 0, gyroRaf = 0, gyroDone = false;
  const gyroTrace = [];

  function gyroFrame(now) {
    if (!gyroHoldStart) return;
    const elapsed = (now - gyroHoldStart) / 1000;
    const k = clamp(elapsed / 3, 0, 1);
    const noise = 14 * Math.pow(1 - k, 1.6) + 0.8;
    if (gyroBar) gyroBar.style.width = (k * 100).toFixed(0) + '%';
    if (gyroState) gyroState.textContent = gyroDone ? 'Калибровка завершена ✓' : 'Не двигайте коптер… ' + Math.max(0, 3 - elapsed).toFixed(1) + ' с';
    gyroTrace.push(noise * (Math.random() - 0.5));
    if (gyroTrace.length > 140) gyroTrace.shift();
    drawGyroTrace();
    if (k >= 1 && !gyroDone) {
      gyroDone = true;
      gyroState.textContent = 'Гироскоп откалиброван ✓ (дрейф < 0.01 °/с)';
      gyroState.style.color = 'var(--green)';
      markStep(2);
      cancelAnimationFrame(gyroRaf);
      return;
    }
    gyroRaf = requestAnimationFrame(gyroFrame);
  }
  function drawGyroTrace() {
    if (!gyroCtx) return;
    const W = gyroCanvas.width, H = gyroCanvas.height;
    gyroCtx.clearRect(0, 0, W, H);
    gyroCtx.fillStyle = '#060b18'; gyroCtx.fillRect(0, 0, W, H);
    gyroCtx.strokeStyle = 'rgba(140,165,210,0.15)'; gyroCtx.lineWidth = 1;
    gyroCtx.beginPath(); gyroCtx.moveTo(0, H / 2); gyroCtx.lineTo(W, H / 2); gyroCtx.stroke();
    gyroCtx.beginPath();
    gyroTrace.forEach((v, i) => {
      const x = i / 140 * W, y = H / 2 + v * (H / 32);
      if (i === 0) gyroCtx.moveTo(x, y); else gyroCtx.lineTo(x, y);
    });
    gyroCtx.strokeStyle = '#38d0ff'; gyroCtx.lineWidth = 1.8; gyroCtx.stroke();
  }
  if (gyroHold) {
    const start = () => {
      if (gyroDone) return;
      gyroTrace.length = 0;
      gyroHoldStart = performance.now();
      gyroRaf = requestAnimationFrame(gyroFrame);
    };
    const stop = () => {
      if (gyroDone) return;
      gyroHoldStart = 0;
      cancelAnimationFrame(gyroRaf);
      if (gyroBar) gyroBar.style.width = '0%';
      if (gyroState) { gyroState.textContent = 'Отпустили рано — держите кнопку 3 секунды'; gyroState.style.color = 'var(--yellow)'; }
    };
    gyroHold.addEventListener('mousedown', start);
    gyroHold.addEventListener('touchstart', e => { e.preventDefault(); start(); }, { passive: false });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => gyroHold.addEventListener(ev, stop));
  }

  /* ── Шаг 3 · Магнитометр (повернуть на 720°) ── */
  const magBtn = $('#magRotate'), magBar = $('#magBar'), magState = $('#magState');
  const magArrow = $('#magArrow');
  let magAngle = 0, magRaf = 0, magLast = 0, magHolding = false, magDone = false;
  const MAG_TARGET = 720;

  function magFrame(now) {
    if (!magHolding || magDone) return;
    const dt = Math.min(0.05, (now - magLast) / 1000);
    magLast = now;
    magAngle += dt * 260; // °/с
    const k = clamp(magAngle / MAG_TARGET, 0, 1);
    if (magBar) magBar.style.width = (k * 100).toFixed(0) + '%';
    if (magArrow) magArrow.style.transform = 'rotate(' + (magAngle % 360) + 'deg)';
    if (magState) magState.textContent = 'Вращайте коптер… ' + Math.min(magAngle, MAG_TARGET).toFixed(0) + '° / ' + MAG_TARGET + '°';
    if (magAngle >= MAG_TARGET) {
      magDone = true;
      if (magState) { magState.textContent = 'Компас откалиброван ✓ (offsets: X 112, Y −84, Z −631 · поле 512 mGauss)'; magState.style.color = 'var(--green)'; }
      magBtn.disabled = true;
      magBtn.textContent = 'Готово ✓';
      markStep(3);
      return;
    }
    magRaf = requestAnimationFrame(magFrame);
  }
  if (magBtn) {
    const start = () => {
      if (magDone) return;
      magHolding = true; magLast = performance.now();
      magRaf = requestAnimationFrame(magFrame);
    };
    const stop = () => { magHolding = false; cancelAnimationFrame(magRaf); };
    magBtn.addEventListener('mousedown', start);
    magBtn.addEventListener('touchstart', e => { e.preventDefault(); start(); }, { passive: false });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => magBtn.addEventListener(ev, stop));
  }

  /* ── Шаг 4 · Радио (захват мин/макс по 4 каналам) ── */
  const RC_CHANNELS = [
    { id: 'rc1', name: 'Канал 1 · Roll' },
    { id: 'rc2', name: 'Канал 2 · Pitch' },
    { id: 'rc3', name: 'Канал 3 · Throttle' },
    { id: 'rc4', name: 'Канал 4 · Yaw' }
  ];
  const rcSeen = { rc1: null, rc2: null, rc3: null, rc4: null };
  let rcDone = false;

  function rcRefresh() {
    RC_CHANNELS.forEach(ch => {
      const input = document.getElementById('phx_' + ch.id);
      if (!input) return;
      const v = parseFloat(input.value);
      window.AeroLab.paintRange(input);
      document.getElementById('phx_' + ch.id + '_val').textContent = (v >= 0 ? '+' : '') + v;
      if (!rcSeen[ch.id]) rcSeen[ch.id] = { min: v, max: v };
      rcSeen[ch.id].min = Math.min(rcSeen[ch.id].min, v);
      rcSeen[ch.id].max = Math.max(rcSeen[ch.id].max, v);
      const span = rcSeen[ch.id].max - rcSeen[ch.id].min;
      const bar = document.getElementById('phx_' + ch.id + '_bar');
      const lab = document.getElementById('phx_' + ch.id + '_span');
      if (bar) bar.style.width = clamp(span / 180 * 100, 0, 100).toFixed(0) + '%';
      if (lab) lab.textContent = 'размах ' + span.toFixed(0) + ' / 180';
    });
    const allOk = RC_CHANNELS.every(ch => {
      const s = rcSeen[ch.id];
      return s && (s.max - s.min) >= 150;
    });
    const state = $('#rcState');
    if (state) {
      state.textContent = allOk ? 'Все 4 канала прошли полный ход ✓' : 'Прогоните каждый стик из упора в упор';
      state.style.color = allOk ? 'var(--green)' : 'var(--muted)';
    }
    const btn = $('#rcCapture');
    if (btn) btn.disabled = !allOk;
  }
  RC_CHANNELS.forEach(ch => {
    const input = document.getElementById('phx_' + ch.id);
    if (input) { window.AeroLab.bindRange(input); input.addEventListener('input', rcRefresh); }
  });
  rcRefresh();
  const rcCaptureBtn = $('#rcCapture');
  if (rcCaptureBtn) rcCaptureBtn.addEventListener('click', () => {
    if (rcCaptureBtn.disabled) return;
    rcCaptureBtn.disabled = true;
    rcCaptureBtn.textContent = 'MIN/MAX/TRIM записаны ✓';
    rcCaptureBtn.classList.add('done-btn');
    $('#rcState').textContent = 'Радиоканал откалиброван: 1000–2000 мкс, центр 1500 мкс';
    markStep(4);
  });

  /* ── Шаг 5 · Двигатели (БЕЗ ПРОПЕЛЛЕРОВ) ── */
  const dirState = { m1: false, m2: false, m3: false, m4: false };
  const tested = { m1: false, m2: false, m3: false, m4: false };
  let armSafe = false;
  const armBtn5 = $('#phxArm'), armLamp5 = $('#phxArmLamp'), armText5 = $('#phxArmText');

  if (armBtn5) armBtn5.addEventListener('click', () => {
    armSafe = !armSafe;
    armBtn5.textContent = armSafe ? 'DISARM' : 'ARM (пропы сняты!)';
    armBtn5.classList.toggle('armed', armSafe);
    if (armLamp5) armLamp5.classList.toggle('on', armSafe);
    if (armText5) armText5.textContent = armSafe ? 'Разрешён тест моторов' : 'Моторы заблокированы';
  });

  $$('.motor-test-btn', page).forEach(btn => btn.addEventListener('click', () => {
    if (!armSafe) {
      const st = $('#motorState');
      if (st) { st.textContent = 'Сначала ARM (с полностью снятыми пропеллерами)!'; st.style.color = 'var(--red)'; }
      return;
    }
    const motor = btn.dataset.motor;
    tested[motor] = true;
    const cell = document.getElementById('cell_' + motor);
    if (cell) {
      cell.classList.add('spinning');
      setTimeout(() => cell.classList.remove('spinning'), 2600);
    }
    const st = $('#motorState');
    if (st) { st.textContent = 'Мотор ' + motor.toUpperCase() + ' крутится 2,5 с…'; st.style.color = 'var(--cyan2)'; }
    refreshMotorStep();
  }));

  $$('input.dir-check', page).forEach(cb => cb.addEventListener('change', () => {
    dirState[cb.dataset.motor] = cb.checked;
    refreshMotorStep();
  }));

  function refreshMotorStep() {
    const allTested = Object.values(tested).every(Boolean);
    const allDir = Object.values(dirState).every(Boolean);
    const st = $('#motorState');
    if (st && allTested && allDir) {
      st.textContent = 'Все моторы в нужную сторону ✓ X-раскладка подтверждена';
      st.style.color = 'var(--green)';
    }
    const btn = $('#motorConfirm');
    if (btn) btn.disabled = !(allTested && allDir);
  }
  const motorConfirm = $('#motorConfirm');
  if (motorConfirm) motorConfirm.addEventListener('click', () => {
    if (motorConfirm.disabled) return;
    motorConfirm.disabled = true;
    motorConfirm.textContent = 'Направление подтверждено ✓';
    motorConfirm.classList.add('done-btn');
    markStep(5);
  });

  renderStepper();

  /* ═══════════════════════════════════════════════
     ПАНЕЛЬ 2 · ПАРАМЕТРЫ (ArduPilot-стиль)
     ═══════════════════════════════════════════════ */
  const PARAMS = [
    { n: 'FRAME_CLASS', v: 1, unit: '', cat: 'frame', d: 'Класс рамы: 1 = квадрокоптер, 2 = гекса, 3 = окта', min: 1, max: 3, step: 1 },
    { n: 'FRAME_TYPE', v: 1, unit: '', cat: 'frame', d: 'Тип: 0 = +, 1 = X (классика для FPV)', min: 0, max: 1, step: 1 },
    { n: 'SCHED_LOOP_RATE', v: 400, unit: 'Гц', cat: 'frame', d: 'Частота цикла планировщика (250/400/500)', min: 100, max: 1000, step: 50 },
    { n: 'INS_GYRO_FILTER', v: 20, unit: 'Гц', cat: 'frame', d: 'ФНЧ гироскопа; ниже — спокойнее, выше — резче', min: 10, max: 256, step: 5 },

    { n: 'ATC_RAT_RLL_P', v: 0.135, unit: '', cat: 'stab', d: 'Roll: пропорциональный по скорости', min: 0, max: 0.6, step: 0.005 },
    { n: 'ATC_RAT_RLL_I', v: 0.135, unit: '', cat: 'stab', d: 'Roll: интегральный по скорости', min: 0, max: 0.6, step: 0.005 },
    { n: 'ATC_RAT_RLL_D', v: 0.0036, unit: '', cat: 'stab', d: 'Roll: дифференциальный по скорости', min: 0, max: 0.02, step: 0.0002 },
    { n: 'ATC_RAT_PIT_P', v: 0.135, unit: '', cat: 'stab', d: 'Pitch: P по скорости', min: 0, max: 0.6, step: 0.005 },
    { n: 'ATC_RAT_PIT_I', v: 0.135, unit: '', cat: 'stab', d: 'Pitch: I по скорости', min: 0, max: 0.6, step: 0.005 },
    { n: 'ATC_RAT_PIT_D', v: 0.0036, unit: '', cat: 'stab', d: 'Pitch: D по скорости', min: 0, max: 0.02, step: 0.0002 },
    { n: 'ATC_RAT_YAW_P', v: 0.18, unit: '', cat: 'stab', d: 'Yaw: P по скорости рыскания', min: 0, max: 1, step: 0.005 },
    { n: 'ATC_RAT_YAW_I', v: 0.018, unit: '', cat: 'stab', d: 'Yaw: I по скорости рыскания', min: 0, max: 1, step: 0.005 },
    { n: 'ATC_RAT_YAW_D', v: 0.0, unit: '', cat: 'stab', d: 'Yaw: D по скорости (обычно 0)', min: 0, max: 0.02, step: 0.0002 },
    { n: 'ATC_ACCEL_P_MAX', v: 110000, unit: '°/с²', cat: 'stab', d: 'Максимальное ускорение по pitch', min: 30000, max: 300000, step: 5000 },

    { n: 'MOT_SPIN_ARM', v: 0.1, unit: 'доля', cat: 'motor', d: 'Доля газа на ARM (чтобы моторы чуть крутились)', min: 0, max: 0.3, step: 0.01 },
    { n: 'MOT_SPIN_MIN', v: 0.15, unit: 'доля', cat: 'motor', d: 'Минимальная рабочая доля газа', min: 0, max: 0.4, step: 0.01 },
    { n: 'MOT_THST_HOVER', v: 0.5, unit: 'доля', cat: 'motor', d: 'Доля газа висения (калибруется в полёте)', min: 0.2, max: 0.9, step: 0.01 },
    { n: 'MOT_BAT_VOLT_MAX', v: 16.8, unit: 'В', cat: 'motor', d: 'Полный заряд 4S (для компенсации тяги)', min: 10, max: 26, step: 0.1 },
    { n: 'MOT_BAT_VOLT_MIN', v: 13.2, unit: 'В', cat: 'motor', d: 'Отсечка 4S', min: 9, max: 22, step: 0.1 },

    { n: 'RC1_MIN', v: 1000, unit: 'мкс', cat: 'radio', d: 'Roll: минимум канала', min: 800, max: 1500, step: 1 },
    { n: 'RC1_MAX', v: 2000, unit: 'мкс', cat: 'radio', d: 'Roll: максимум канала', min: 1500, max: 2200, step: 1 },
    { n: 'RC2_MIN', v: 1000, unit: 'мкс', cat: 'radio', d: 'Pitch: минимум', min: 800, max: 1500, step: 1 },
    { n: 'RC2_MAX', v: 2000, unit: 'мкс', cat: 'radio', d: 'Pitch: максимум', min: 1500, max: 2200, step: 1 },
    { n: 'RC3_MIN', v: 1000, unit: 'мкс', cat: 'radio', d: 'Throttle: минимум', min: 800, max: 1500, step: 1 },
    { n: 'RC3_MAX', v: 2000, unit: 'мкс', cat: 'radio', d: 'Throttle: максимум', min: 1500, max: 2200, step: 1 },
    { n: 'RC3_TRIM', v: 1000, unit: 'мкс', cat: 'radio', d: 'Газ вниз = trim (обязательно!)', min: 800, max: 1500, step: 1 },
    { n: 'RC4_MIN', v: 1000, unit: 'мкс', cat: 'radio', d: 'Yaw: минимум', min: 800, max: 1500, step: 1 },
    { n: 'RC4_MAX', v: 2000, unit: 'мкс', cat: 'radio', d: 'Yaw: максимум', min: 1500, max: 2200, step: 1 },

    { n: 'FS_THR_ENABLE', v: 1, unit: '', cat: 'safe', d: 'Failsafe по газу: 1 = RTL, 2 = посадка на месте', min: 0, max: 2, step: 1 },
    { n: 'FS_GCS_ENABLE', v: 1, unit: '', cat: 'safe', d: 'Failsafe по потере телеметрии: 1 = RTL', min: 0, max: 1, step: 1 },
    { n: 'FS_BATT_VOLTAGE', v: 10.5, unit: 'В', cat: 'safe', d: 'Напряжение «пора домой» (RTL)', min: 8, max: 24, step: 0.1 },
    { n: 'COM_DISARM_PRFLT', v: 10, unit: 'с', cat: 'safe', d: 'Автодизарм на земле без газа', min: 0, max: 60, step: 1 },
    { n: 'FENCE_ENABLE', v: 0, unit: '', cat: 'safe', d: 'Геозона: 1 = вернуться домой у границы', min: 0, max: 1, step: 1 },
    { n: 'FENCE_RADIUS', v: 50, unit: 'м', cat: 'safe', d: 'Радиус геозоны от точки взлёта', min: 10, max: 500, step: 10 },

    { n: 'WPNAV_SPEED', v: 500, unit: 'см/с', cat: 'nav', d: 'Точность скорости миссии', min: 50, max: 2000, step: 25 },
    { n: 'RTL_ALT', v: 1500, unit: 'см', cat: 'nav', d: 'Высота возврата домой', min: 0, max: 10000, step: 100 },
    { n: 'RTL_CLIMB_MIN', v: 2000, unit: 'см', cat: 'nav', d: 'Минимальная высота подъёма перед RTL', min: 0, max: 10000, step: 100 }
  ];
  const factoryValues = {};
  PARAMS.forEach(p => { factoryValues[p.n] = p.v; });
  const modified = {};

  const paramList = $('#phxParamList');
  const paramSearch = $('#phxParamSearch');
  const paramCat = $('#phxParamCat');
  const paramCount = $('#phxParamCount');

  function renderParams() {
    if (!paramList) return;
    const q = (paramSearch && paramSearch.value || '').trim().toLowerCase();
    const cat = paramCat && paramCat.value || 'all';
    const filtered = PARAMS.filter(p =>
      (cat === 'all' || p.cat === cat) &&
      (!q || p.n.toLowerCase().includes(q) || p.d.toLowerCase().includes(q))
    );
    if (paramCount) paramCount.textContent = 'Показано: ' + filtered.length + ' из ' + PARAMS.length;
    paramList.innerHTML = filtered.map(p => {
      const isMod = modified[p.n];
      return '<div class="ph-param' + (isMod ? ' mod' : '') + '" data-name="' + p.n + '">' +
        '<div class="ph-param-head"><code>' + p.n + (isMod ? ' <span class="mod-dot" title="изменён">●</span>' : '') + '</code>' +
        '<input type="number" class="ph-param-val" step="' + p.step + '" min="' + p.min + '" max="' + p.max + '" value="' + p.v + '" aria-label="' + p.n + '">' +
        (p.unit ? '<span class="ph-param-unit">' + p.unit + '</span>' : '<span></span>') + '</div>' +
        '<div class="ph-param-desc">' + p.d + '</div>' +
      '</div>';
    }).join('');
    $$('.ph-param-val', paramList).forEach(input => {
      input.addEventListener('change', () => {
        const name = input.closest('.ph-param').dataset.name;
        const p = PARAMS.find(x => x.n === name);
        if (!p) return;
        let v = parseFloat(input.value);
        if (!isFinite(v)) v = factoryValues[name];
        v = clamp(v, p.min, p.max);
        p.v = v;
        input.value = v;
        if (Math.abs(v - factoryValues[name]) > 1e-9) modified[name] = true; else delete modified[name];
        const row = input.closest('.ph-param');
        row.classList.toggle('mod', !!modified[name]);
        const code = row.querySelector('code');
        code.innerHTML = p.n + (modified[name] ? ' <span class="mod-dot" title="изменён">●</span>' : '');
      });
    });
  }
  if (paramSearch) paramSearch.addEventListener('input', renderParams);
  if (paramCat) paramCat.addEventListener('change', renderParams);

  const resetParams = $('#phxParamReset');
  if (resetParams) resetParams.addEventListener('click', () => {
    PARAMS.forEach(p => { p.v = factoryValues[p.n]; });
    Object.keys(modified).forEach(k => delete modified[k]);
    renderParams();
  });
  const downloadParams = $('#phxParamDownload');
  if (downloadParams) downloadParams.addEventListener('click', () => {
    const lines = ['# АэроЛаб — параметры Pixhawk (учебная выгрузка)', '# name,value']
      .concat(PARAMS.map(p => p.n + ',' + p.v));
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'aerolab-pixhawk.param';
    a.click();
    URL.revokeObjectURL(url);
  });
  const copyParams = $('#phxParamCopy');
  if (copyParams) copyParams.addEventListener('click', () => {
    const text = PARAMS.map(p => 'set ' + p.n + ' ' + p.v).join('\n');
    const done = () => { copyParams.textContent = 'Скопировано ✓'; setTimeout(() => { copyParams.textContent = 'Копировать как CLI'; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else done();
  });

  renderParams();

  /* ═══════════════════════════════════════════════
     ПАНЕЛЬ 3 · СЦЕНАРИИ FAILSAFE (canvas)
     ═══════════════════════════════════════════════ */
  const sceneCanvas = $('#failsafeCanvas');
  const sctx = sceneCanvas ? sceneCanvas.getContext('2d') : null;
  const SW = sceneCanvas ? sceneCanvas.width : 640, SH = sceneCanvas ? sceneCanvas.height : 420;
  const HOME = { x: 72, y: SH - 58 };
  const WAYPOINTS = [
    { x: 170, y: SH - 96 }, { x: 292, y: 205 }, { x: 425, y: 255 }, { x: 540, y: 82 }
  ];

  const scene = {
    running: false, raf: 0, last: 0,
    mode: 'DISARM',       // DISARM → MISSION → FAILSAFE_RTL / FAILSAFE_LAND → LANDED
    pos: { x: HOME.x, y: HOME.y },
    alt: 0,               // м
    wpIndex: 0,
    battery: 100,
    trail: [],
    landTimer: 0,
    missionLog: []
  };
  window.AeroLab._phxScene = scene;

  const sceneEls = {
    mode: $('#phxMode'), batt: $('#phxBatt'), alt: $('#phxAlt'), dist: $('#phxDist'),
    log: $('#phxSceneLog'),
    startBtn: $('#phxStartMission'), linkBtn: $('#phxLinkLoss'), battBtn: $('#phxBattLow'), resetBtn: $('#phxSceneReset')
  };

  function sceneLog(msg) {
    scene.missionLog.push('[' + new Date().toLocaleTimeString('ru-RU') + '] ' + msg);
    if (scene.missionLog.length > 60) scene.missionLog.shift();
    if (sceneEls.log) {
      sceneEls.log.textContent = scene.missionLog.join('\n');
      sceneEls.log.scrollTop = sceneEls.log.scrollHeight;
    }
  }
  function setMode(mode) {
    scene.mode = mode;
    if (sceneEls.mode) {
      sceneEls.mode.textContent = mode;
      sceneEls.mode.className = 'mode-pill ' + mode.toLowerCase().replace('failsafe_', 'fs-');
    }
  }
  function distTo(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  const PX_PER_M = 3.6;

  function sceneReset(silent) {
    scene.running = false;
    cancelAnimationFrame(scene.raf);
    scene.mode = 'DISARM';
    scene.pos = { x: HOME.x, y: HOME.y };
    scene.alt = 0;
    scene.wpIndex = 0;
    scene.battery = 100;
    scene.trail = [];
    scene.landTimer = 0;
    scene.missionLog = [];
    if (sceneEls.mode) { sceneEls.mode.textContent = 'DISARM'; sceneEls.mode.className = 'mode-pill disarm'; }
    if (sceneEls.batt) sceneEls.batt.style.width = '100%';
    if (sceneEls.alt) sceneEls.alt.textContent = '0.0 м';
    if (sceneEls.dist) sceneEls.dist.textContent = '0 м';
    if (sceneEls.log) sceneEls.log.textContent = '';
    if (!silent) sceneLog('Симуляция сброшена. Снимите с лопастей… то есть нажмите «Старт миссии».');
    drawScene();
  }

  function sceneStep(dt) {
    const speed = 52; // px/с
    const takeoffAlt = 12;
    if (scene.mode === 'MISSION' || scene.mode === 'FAILSAFE_RTL') {
      scene.alt = Math.min(takeoffAlt, scene.alt + dt * 6);
    } else if (scene.mode === 'FAILSAFE_LAND' || scene.mode === 'LANDED') {
      scene.alt = Math.max(0, scene.alt - dt * 3.2);
    }

    let target = null;
    if (scene.mode === 'MISSION') target = WAYPOINTS[scene.wpIndex] || HOME;
    else if (scene.mode === 'FAILSAFE_RTL') target = HOME;
    else if (scene.mode === 'FAILSAFE_LAND' || scene.mode === 'LANDED') target = null;

    if (target) {
      const d = distTo(scene.pos, target);
      if (d > 6) {
        const step = speed * dt;
        scene.pos.x += (target.x - scene.pos.x) / d * step;
        scene.pos.y += (target.y - scene.pos.y) / d * step;
        scene.trail.push({ x: scene.pos.x, y: scene.pos.y, a: 1 });
      } else if (scene.mode === 'MISSION') {
        if (scene.wpIndex < WAYPOINTS.length - 1) {
          scene.wpIndex++;
          sceneLog('Точка WP' + scene.wpIndex + ' достигнута → WP' + (scene.wpIndex + 1));
        } else {
          sceneLog('Миссия завершена → возврат домой (RTL)');
          setMode('FAILSAFE_RTL');
        }
      } else if (scene.mode === 'FAILSAFE_RTL') {
        sceneLog('Дома. Начинаю посадку…');
        setMode('FAILSAFE_LAND');
      }
    } else if (scene.mode === 'FAILSAFE_LAND') {
      if (scene.alt <= 0.02) {
        setMode('LANDED');
        scene.running = false;
        sceneLog('Посадка завершена. Моторы заглушены. ✓');
      }
    }

    // батарея тает в полёте
    if (scene.mode !== 'DISARM' && scene.mode !== 'LANDED') {
      scene.battery = Math.max(0, scene.battery - dt * 1.05);
      if (scene.battery <= 20 && scene.mode === 'MISSION') {
        sceneLog('БАТАРЕЯ 20% → failsafe: посадка на месте');
        setMode('FAILSAFE_LAND');
      } else if (scene.battery <= 8 && scene.mode !== 'LANDED') {
        sceneLog('БАТАРЕЯ КРИТИЧЕСКАЯ → принудительная посадка');
        setMode('FAILSAFE_LAND');
      }
    }

    scene.trail.forEach(t => { t.a -= dt * 0.35; });
    scene.trail = scene.trail.filter(t => t.a > 0);

    if (sceneEls.batt) sceneEls.batt.style.width = scene.battery.toFixed(0) + '%';
    if (sceneEls.batt) sceneEls.batt.style.background = scene.battery > 45 ? 'var(--green)' : scene.battery > 20 ? 'var(--yellow)' : 'var(--red)';
    if (sceneEls.alt) sceneEls.alt.textContent = scene.alt.toFixed(1) + ' м';
    if (sceneEls.dist) sceneEls.dist.textContent = (distTo(scene.pos, HOME) / PX_PER_M).toFixed(0) + ' м';
  }

  function drawScene() {
    if (!sctx) return;
    const W = SW, H = SH;
    sctx.clearRect(0, 0, W, H);
    // поле
    const bg = sctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1322'); bg.addColorStop(1, '#0d1a2e');
    sctx.fillStyle = bg; sctx.fillRect(0, 0, W, H);
    sctx.strokeStyle = 'rgba(140,165,210,0.07)';
    for (let x = 30; x < W; x += 30) { sctx.beginPath(); sctx.moveTo(x, 0); sctx.lineTo(x, H); sctx.stroke(); }
    for (let y = 30; y < H; y += 30) { sctx.beginPath(); sctx.moveTo(0, y); sctx.lineTo(W, y); sctx.stroke(); }

    // след
    scene.trail.forEach(t => {
      sctx.globalAlpha = t.a * 0.75;
      sctx.fillStyle = '#38d0ff';
      sctx.beginPath(); sctx.arc(t.x, t.y, 2.1, 0, Math.PI * 2); sctx.fill();
    });
    sctx.globalAlpha = 1;

    // точка дома
    sctx.fillStyle = '#182449';
    sctx.beginPath(); sctx.rect(HOME.x - 19, HOME.y - 13, 38, 26); sctx.fill();
    sctx.strokeStyle = '#2fe08c'; sctx.lineWidth = 2.5; sctx.strokeRect(HOME.x - 19, HOME.y - 13, 38, 26);
    sctx.fillStyle = '#2fe08c'; sctx.font = 'bold 15px "Segoe UI",sans-serif'; sctx.textAlign = 'center';
    sctx.fillText('H', HOME.x, HOME.y + 5);
    sctx.textAlign = 'left';

    // точки маршрута
    WAYPOINTS.forEach((wp, i) => {
      sctx.beginPath(); sctx.arc(wp.x, wp.y, 7, 0, Math.PI * 2);
      sctx.fillStyle = i < scene.wpIndex ? 'rgba(56,208,255,0.15)' : 'rgba(255,138,42,0.18)';
      sctx.fill();
      sctx.strokeStyle = i < scene.wpIndex ? '#38d0ff' : '#ff8a2a'; sctx.lineWidth = 1.6; sctx.stroke();
      sctx.fillStyle = i < scene.wpIndex ? '#8ae4ff' : '#ffb066'; sctx.font = 'bold 9px "Segoe UI",sans-serif';
      sctx.fillText('WP' + (i + 1), wp.x - 9, wp.y + 3);
    });

    // коптер
    if (scene.mode !== 'LANDED' || scene.alt > 0.01) {
      const { x, y } = scene.pos;
      const target = scene.mode === 'MISSION' ? (WAYPOINTS[scene.wpIndex] || HOME) : HOME;
      const ang = Math.atan2(target.y - y, target.x - x);
      sctx.save();
      sctx.translate(x, y);
      sctx.rotate(ang + Math.PI / 2);
      sctx.fillStyle = '#e9eefb';
      sctx.beginPath(); sctx.moveTo(0, -11); sctx.lineTo(8, 9); sctx.lineTo(0, 5); sctx.lineTo(-8, 9); sctx.closePath(); sctx.fill();
      sctx.fillStyle = '#ff8a2a';
      [[-9, -9], [9, -9], [-9, 9], [9, 9]].forEach(([mx, my]) => {
        sctx.beginPath(); sctx.ellipse(mx, my, 4.6, 2.2, 0, 0, Math.PI * 2); sctx.fill();
      });
      sctx.restore();
      // тень высоты
      sctx.globalAlpha = 0.35;
      sctx.fillStyle = '#000';
      sctx.beginPath(); sctx.ellipse(x + 6 + scene.alt * 0.8, y + 8 + scene.alt * 0.8, 12, 5, 0, 0, Math.PI * 2); sctx.fill();
      sctx.globalAlpha = 1;
    }

    // батарея и высота на поле
    sctx.fillStyle = 'rgba(6,11,24,0.72)';
    sctx.fillRect(10, 10, 208, 46);
    sctx.fillStyle = '#8ae4ff'; sctx.font = 'bold 11px "Consolas",monospace';
    sctx.fillText(' режим: ' + scene.mode, 18, 28);
    sctx.fillText(' АКБ: ' + scene.battery.toFixed(0) + '%  H: ' + scene.alt.toFixed(1) + ' м', 18, 46);
  }

  function sceneFrame(now) {
    const dt = Math.min(0.05, (now - scene.last || 16) / 1000);
    scene.last = now;
    sceneStep(dt);
    drawScene();
    if (scene.running) scene.raf = requestAnimationFrame(sceneFrame);
  }
  if (sceneEls.startBtn) sceneEls.startBtn.addEventListener('click', () => {
    if (scene.mode !== 'DISARM' && scene.mode !== 'LANDED') return;
    sceneReset(true);
    setMode('MISSION');
    scene.running = true;
    scene.last = performance.now();
    sceneLog('ARM → взлёт. Миссия: WP1 → WP2 → WP3 → WP4 → RTL');
    scene.raf = requestAnimationFrame(sceneFrame);
  });
  if (sceneEls.linkBtn) sceneEls.linkBtn.addEventListener('click', () => {
    if (scene.mode === 'MISSION') {
      sceneLog('ПОТЕРЯ СВЯЗИ (900 МГц). Failsafe: возврат домой (RTL)…');
      setMode('FAILSAFE_RTL');
    }
  });
  if (sceneEls.battBtn) sceneEls.battBtn.addEventListener('click', () => {
    if (scene.mode === 'MISSION') {
      scene.battery = 19;
      sceneLog('Напряжение просело: 10,9 В. Объявляется посадка на месте.');
      setMode('FAILSAFE_LAND');
    }
  });
  if (sceneEls.resetBtn) sceneEls.resetBtn.addEventListener('click', () => sceneReset(false));

  sceneReset(true);
  if (sctx) drawScene();
})();
