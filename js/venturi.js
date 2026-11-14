'use strict';
/* АэроЛаб · venturi.js — трубка Вентури: неразрывность + Бернулли */
(function () {
  const { clamp, $, $$ } = window.AeroLab;
  const canvas = $('#venturiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const RHO_W = 1000, G = 9.81;
  const FULL_HALF = 62, THROAT_HALF = 30, CY = 208;

  const state = { vThroat: 8, t: 0, smoothLevels: [null, null, null] };

  function smooth(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function halfHeight(x) {
    if (x < 250) return FULL_HALF;
    if (x < 400) return lerp(FULL_HALF, THROAT_HALF, smooth((x - 250) / 150));
    if (x < 520) return THROAT_HALF;
    if (x < 670) return lerp(THROAT_HALF, FULL_HALF, smooth((x - 520) / 150));
    return FULL_HALF;
  }
  const AREA_RATIO = Math.pow(THROAT_HALF / FULL_HALF, 2); // 0.234

  /* частицы-пузырьки */
  const bubbles = [];
  for (let i = 0; i < 90; i++) {
    bubbles.push({ x: Math.random() * W, lane: (Math.random() * 2 - 1) * 0.82, r: 1.5 + Math.random() * 2.6 });
  }

  const throatRange = $('#throatRange');
  window.AeroLab.bindRange(throatRange);
  throatRange.addEventListener('input', () => { state.vThroat = parseFloat(throatRange.value); refresh(); });

  const el = {
    throatOut: $('#throatOut'), v1Val: $('#v1Val'), qVal: $('#qVal'), dpVal: $('#dpVal'), dhVal: $('#dhVal')
  };

  function stationPhysics() {
    const v2 = state.vThroat;
    const v1 = v2 * AREA_RATIO;
    const A1 = Math.PI * 0.05 * 0.05;      // D1 = 100 мм
    const Q = v1 * A1;                      // м³/с
    const dP = 0.5 * RHO_W * (v2 * v2 - v1 * v1); // Па
    const dhCm = dP / (RHO_W * G) * 100;    // см вод. ст.
    return { v1, v2, Q, dP, dhCm };
  }

  function refresh() {
    const ph = stationPhysics();
    el.throatOut.textContent = state.vThroat.toFixed(1) + ' м/с';
    el.v1Val.textContent = ph.v1.toFixed(2);
    el.qVal.textContent = (ph.Q * 1000).toFixed(1);
    el.dpVal.textContent = (ph.dP / 1000).toFixed(1);
    el.dhVal.textContent = ph.dhCm.toFixed(0);
  }

  /* Question buttons */
  const qButtons = $$('#venturiQ .vq-opt');
  const feedback = $('#venturiFeedback');
  qButtons.forEach(btn => btn.addEventListener('click', () => {
    qButtons.forEach(b => b.classList.remove('correct', 'wrong'));
    const correct = btn.dataset.q === '1';
    btn.classList.add(correct ? 'correct' : 'wrong');
    if (correct) {
      feedback.textContent = 'Верно! В горловине скорость максимальна → давление минимально (Бернулли).';
      feedback.style.color = 'var(--green)';
    } else {
      feedback.textContent = 'Не совсем: давление минимально там, где поток быстрее всего, — в сужении.';
      feedback.style.color = 'var(--red)';
    }
  }));

  /* ── Отрисовка ── */
  function pipePath() {
    ctx.beginPath();
    ctx.moveTo(24, CY - halfHeight(24));
    for (let x = 24; x <= W - 24; x += 6) ctx.lineTo(x, CY - halfHeight(x));
    for (let x = W - 24; x >= 24; x -= 6) ctx.lineTo(x, CY + halfHeight(x));
    ctx.closePath();
  }

  const TAPS = [
    { x: 130, label: 'А', key: 0 },
    { x: 460, label: 'Б', key: 1 },
    { x: 735, label: 'В', key: 2 }
  ];

  function frame(now) {
    const dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
    frame.last = now;
    state.t += dt;
    const ph = stationPhysics();

    ctx.clearRect(0, 0, W, H);
    // фон
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#070d1f'); bg.addColorStop(1, '#0a1330');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    /* пьезометрические трубки */
    const vAt = x => {
      const hh = halfHeight(x);
      return ph.v2 * Math.pow(THROAT_HALF / hh, 2);
    };
    const dPAt = x => 0.5 * RHO_W * (vAt(x) * vAt(x) - ph.v1 * ph.v1);
    const maxDP = Math.max(dPAt(460), 1);
    TAPS.forEach(tap => {
      const dP = dPAt(tap.x);
      const levelT = clamp(dP / maxDP, 0, 1); // 0 = давление входа, 1 = максимальный перепад
      if (state.smoothLevels[tap.key] === null) state.smoothLevels[tap.key] = levelT;
      state.smoothLevels[tap.key] += (levelT - state.smoothLevels[tap.key]) * 0.08;
      const lvl = state.smoothLevels[tap.key];
      const tubeW = 26, tubeTop = 26, tubeBottom = CY - halfHeight(tap.x) + 6;
      const waterTop = tubeTop + 14 + lvl * 108; // столб ниже → давление меньше
      // стекло
      ctx.fillStyle = 'rgba(10,18,38,0.9)';
      ctx.fillRect(tap.x - tubeW / 2, tubeTop, tubeW, tubeBottom - tubeTop);
      ctx.strokeStyle = '#33477c'; ctx.lineWidth = 2;
      ctx.strokeRect(tap.x - tubeW / 2, tubeTop, tubeW, tubeBottom - tubeTop);
      // вода
      const wg = ctx.createLinearGradient(0, waterTop, 0, tubeBottom);
      wg.addColorStop(0, '#4aa8ff'); wg.addColorStop(1, '#1e4fd8');
      ctx.fillStyle = wg;
      ctx.fillRect(tap.x - tubeW / 2 + 2, waterTop, tubeW - 4, tubeBottom - waterTop - 2);
      // мениск
      ctx.fillStyle = '#bfe6ff';
      ctx.fillRect(tap.x - tubeW / 2 + 2, waterTop, tubeW - 4, 3);
      // подпись
      ctx.fillStyle = '#8ae4ff'; ctx.font = 'bold 13px "Segoe UI",sans-serif';
      ctx.fillText(tap.label, tap.x - 4.5, tubeTop - 8);
    });

    /* труба */
    pipePath();
    const pg = ctx.createLinearGradient(0, CY - FULL_HALF, 0, CY + FULL_HALF);
    pg.addColorStop(0, '#1b2a52'); pg.addColorStop(0.28, '#3d548f'); pg.addColorStop(0.5, '#58719f'); pg.addColorStop(0.72, '#3d548f'); pg.addColorStop(1, '#1b2a52');
    ctx.fillStyle = pg; ctx.fill();
    ctx.strokeStyle = '#05070f'; ctx.lineWidth = 3; ctx.stroke();

    /* вода внутри */
    ctx.save();
    pipePath();
    ctx.clip();
    const wg2 = ctx.createLinearGradient(0, CY - FULL_HALF, 0, CY + FULL_HALF);
    wg2.addColorStop(0, '#123a72'); wg2.addColorStop(0.5, '#1c5bb0'); wg2.addColorStop(1, '#123a72');
    ctx.fillStyle = wg2;
    ctx.fillRect(0, CY - FULL_HALF, W, FULL_HALF * 2);
    // блик на поверхности воды
    ctx.fillStyle = 'rgba(160,220,255,0.16)';
    ctx.fillRect(0, CY - FULL_HALF + 6 + Math.sin(state.t * 2.1) * 2, W, 7);

    /* пузырьки */
    bubbles.forEach(b => {
      const hh = halfHeight(b.x);
      const v = ph.v2 * Math.pow(THROAT_HALF / hh, 2);
      b.x += v * 26 * dt;
      if (b.x > W - 18) { b.x = 20; b.lane = (Math.random() * 2 - 1) * 0.82; }
      const y = CY + b.lane * (hh - 8) + Math.sin(state.t * 3 + b.x * 0.02) * 2.5;
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(b.x * 0.05 + state.t * 6);
      ctx.fillStyle = '#bfe6ff';
      ctx.beginPath(); ctx.arc(b.x, y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.restore();

    /* фланцы */
    ctx.fillStyle = '#263563';
    [[24, -1], [W - 24, 1]].forEach(([x, dir]) => {
      ctx.fillRect(x - (dir < 0 ? 14 : 0), CY - FULL_HALF - 8, 14, FULL_HALF * 2 + 16);
    });

    /* подписи станций */
    ctx.fillStyle = 'rgba(233,238,251,0.75)'; ctx.font = '11px "Segoe UI",sans-serif';
    ctx.fillText('вход · D=100', 96, H - 12);
    ctx.fillText('горловина · D=50', 405, H - 12);
    ctx.fillText('выход', 722, H - 12);

    /* табло */
    ctx.fillStyle = 'rgba(6,11,24,0.75)';
    ctx.fillRect(14, 12, 210, 34);
    ctx.fillStyle = '#8ae4ff'; ctx.font = 'bold 12px "Consolas",monospace';
    ctx.fillText('v₂ = ' + ph.v2.toFixed(1) + ' м/с · Q = ' + (ph.Q * 1000).toFixed(1) + ' л/с', 24, 33);

    requestAnimationFrame(frame);
  }

  refresh();
  requestAnimationFrame(frame);
})();
