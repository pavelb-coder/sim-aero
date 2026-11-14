'use strict';
/* АэроЛаб · tunnel.js — аэродинамическая труба: геометрия профилей, расчёт, рендер */
window.AeroLab = window.AeroLab || {};
(function () {
  const { clamp, $, $$ } = window.AeroLab;

  /* ───────────── Модель профилей (учебная, упрощённая) ───────────── */
  const PROFILES = {
    naca2412: { name: 'NACA 2412', desc: 'несимметричный · планер', cl0: 0.25, slope: 0.100, clMax: 1.65, stall: 14.5, cd0: 0.0095, k: 0.0062, kind: 'naca', m: 0.02, p: 0.40, t: 0.12 },
    naca0012: { name: 'NACA 0012', desc: 'симметричный · пилотаж', cl0: 0.0, slope: 0.110, clMax: 1.25, stall: 12.0, cd0: 0.0078, k: 0.0060, kind: 'naca', m: 0, p: 0.5, t: 0.12 },
    flatbottom: { name: 'Плоско-выпуклый', desc: 'тяга с нуля · тренеры', cl0: 0.42, slope: 0.095, clMax: 1.50, stall: 13.0, cd0: 0.0125, k: 0.0078, kind: 'arc', h: 0.155 },
    flatplate: { name: 'Плоская пластина', desc: 'наглядный срыв · опыты', cl0: 0.0, slope: 0.085, clMax: 0.85, stall: 9.0, cd0: 0.024, k: 0.016, kind: 'plate', h: 0.016 }
  };

  /* Коэффициенты по углу атаки (градусы) */
  function coeffs(p, aDeg) {
    const clLin = p.cl0 + p.slope * aDeg;
    const over = Math.abs(clLin) - p.clMax;
    let cl = clLin, stalled = false;
    if (over > 0) {
      stalled = true;
      cl = Math.sign(clLin) * Math.max(p.clMax - over * 1.35, 0.18);
    }
    let cd = p.cd0 + p.k * cl * cl;
    if (stalled) {
      const deep = Math.min(Math.abs(aDeg) - p.stall, 30);
      cd += 0.42 * Math.pow(Math.sin(clamp(Math.abs(aDeg), 0, 38) * Math.PI / 180), 1.7) + 0.10 * over;
    }
    const ld = Math.abs(cd) > 1e-6 ? cl / cd : 0;
    return { cl, cd, stalled, ld };
  }

  /* ───────────── Геометрия профиля (x∈[0,1], y вверх, ед. хорды) ───────────── */
  function profileOutline(p, n) {
    n = n || 56;
    const up = [], lo = [];
    if (p.kind === 'naca') {
      for (let i = 0; i <= n; i++) {
        const x = i / n;
        const yt = 5 * p.t * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x);
        let yc = 0, dyc = 0;
        if (p.m > 0) {
          if (x < p.p) {
            yc = p.m / (p.p * p.p) * (2 * p.p * x - x * x);
            dyc = 2 * p.m / (p.p * p.p) * (p.p - x);
          } else {
            yc = p.m / ((1 - p.p) * (1 - p.p)) * ((1 - 2 * p.p) + 2 * p.p * x - x * x);
            dyc = 2 * p.m / ((1 - p.p) * (1 - p.p)) * (p.p - x);
          }
        }
        const th = Math.atan(dyc), st = Math.sin(th), ct = Math.cos(th);
        up.push([x - yt * st, yc + yt * ct]);
        lo.push([x + yt * st, yc - yt * ct]);
      }
    } else if (p.kind === 'arc') {
      for (let i = 0; i <= n; i++) {
        const x = i / n;
        const yTop = p.h * Math.sin(Math.PI * Math.pow(x, 0.72));
        up.push([x, yTop]);
        lo.push([x, 0]);
      }
    } else { // plate
      for (let i = 0; i <= n; i++) {
        const x = i / n;
        up.push([x, p.h / 2]);
        lo.push([x, -p.h / 2]);
      }
    }
    return { up, lo };
  }

  function profileSvgPath(p) {
    const { up, lo } = profileOutline(p, 44);
    const pts = up.concat(lo.slice().reverse());
    const X = x => (10 + x * 100).toFixed(1);
    const Y = y => (26 - y * 95).toFixed(1);
    return 'M' + pts.map(q => X(q[0]) + ' ' + Y(q[1])).join(' L') + ' Z';
  }

  /* ───────────── Состояние ───────────── */
  const state = {
    profileId: 'naca2412',
    alphaDeg: 4,
    v: 28,        // м/с
    area: 0.35,   // м²
    chord: 0.16,  // м
    timeScale: 1,
    t: 0,
    coeffs: null
  };
  window.AeroLab.tunnelState = state;

  const canvas = $('#tunnelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const CX = 470, CY = 246, CHORD = 190;

  const polar = $('#polarCanvas');
  const pctx = polar ? polar.getContext('2d') : null;

  /* ───────────── Частицы потока ───────────── */
  const N = 150;
  const particles = [];
  function spawn(anywhere) {
    particles.push({
      x: anywhere ? Math.random() * W : -30 - Math.random() * 120,
      y0: 40 + Math.random() * (H - 80),
      seed: Math.random() * 10,
      jitter: 0.75 + Math.random() * 0.5
    });
  }
  for (let i = 0; i < N; i++) spawn(true);

  function deflection(x, y0, aRad) {
    const u = (x - CX) / CHORD;
    const near = 1 / (1 + Math.pow((y0 - CY) / (CHORD * 0.85), 2));
    const A = Math.sin(aRad) * CHORD * 0.95;
    return A * u * Math.exp(-0.9 * u * u) * (0.35 + 0.65 * near);
  }
  function localSlope(x, y0, aRad) {
    return (deflection(x + 3, y0, aRad) - deflection(x - 3, y0, aRad)) / 6;
  }

  const SPEED_STOPS = [
    { s: 0.50, c: [30, 111, 255] },
    { s: 0.85, c: [56, 208, 255] },
    { s: 1.00, c: [160, 240, 255] },
    { s: 1.20, c: [240, 255, 255] },
    { s: 1.45, c: [255, 176, 102] },
    { s: 1.75, c: [255, 94, 58] }
  ];
  function speedColor(f) {
    f = clamp(f, SPEED_STOPS[0].s, SPEED_STOPS[SPEED_STOPS.length - 1].s);
    for (let i = 0; i < SPEED_STOPS.length - 1; i++) {
      const a = SPEED_STOPS[i], b = SPEED_STOPS[i + 1];
      if (f <= b.s) {
        const t = (f - a.s) / (b.s - a.s);
        const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * t);
        const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * t);
        const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * t);
        return 'rgb(' + r + ',' + g + ',' + bl + ')';
      }
    }
    return '#fff';
  }

  /* ───────────── Построение SVG-силуэтов профилей в пульте ───────────── */
  const grid = $('#profileGrid');
  Object.keys(PROFILES).forEach(id => {
    const p = PROFILES[id];
    const btn = document.createElement('button');
    btn.className = 'profile-card' + (id === state.profileId ? ' on' : '');
    btn.dataset.profile = id;
    btn.innerHTML =
      '<svg viewBox="0 0 120 46"><path d="' + profileSvgPath(p) + '" fill="#38d0ff" fill-opacity="0.22" stroke="#38d0ff" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
      '<div class="p-name">' + p.name + '</div><div class="p-desc">' + p.desc + '</div>';
    btn.addEventListener('click', () => {
      state.profileId = id;
      $$('.profile-card', grid).forEach(c => c.classList.toggle('on', c.dataset.profile === id));
      refresh();
    });
    grid.appendChild(btn);
  });

  /* ───────────── Элементы управления ───────────── */
  const alphaRange = $('#alphaRange'), speedRange = $('#speedRange'), areaRange = $('#areaRange'), chordRange = $('#chordRange');
  window.AeroLab.bindRange(alphaRange); window.AeroLab.bindRange(speedRange);
  window.AeroLab.bindRange(areaRange); window.AeroLab.bindRange(chordRange);

  alphaRange.addEventListener('input', () => { state.alphaDeg = parseFloat(alphaRange.value); refresh(); });
  speedRange.addEventListener('input', () => { state.v = parseFloat(speedRange.value); refresh(); });
  areaRange.addEventListener('input', () => { state.area = parseFloat(areaRange.value); refresh(); });
  chordRange.addEventListener('input', () => { state.chord = parseFloat(chordRange.value); refresh(); });

  $$('#timeSeg button').forEach(b => b.addEventListener('click', () => {
    state.timeScale = parseFloat(b.dataset.mult);
    $$('#timeSeg button').forEach(x => x.classList.toggle('on', x === b));
  }));

  const PRESETS = {
    cruise: { alpha: 4, v: 28 },
    takeoff: { alpha: 11, v: 18 },
    stall: { alpha: 19, v: 22 },
    zero: { alpha: 0, v: 30 }
  };
  $$('.preset-btn').forEach(b => b.addEventListener('click', () => {
    const p = PRESETS[b.dataset.preset];
    state.alphaDeg = p.alpha; state.v = p.v;
    alphaRange.value = p.alpha; speedRange.value = p.v;
    window.AeroLab.paintRange(alphaRange); window.AeroLab.paintRange(speedRange);
    refresh();
  }));

  /* ───────────── Приборы ───────────── */
  const el = {
    alphaOut: $('#alphaOut'), speedOut: $('#speedOut'), areaOut: $('#areaOut'), chordOut: $('#chordOut'),
    liftVal: $('#liftVal'), dragVal: $('#dragVal'), ldVal: $('#ldVal'), cyVal: $('#cyVal'),
    reVal: $('#reVal'), cpVal: $('#cpVal'), liftBar: $('#liftBar'), dragBar: $('#dragBar'),
    regimePill: $('#regimePill'), liftPerMeter: $('#liftPerMeter'),
    stallBadge: $('#stallBadge'), lampStall: $('#lampStall'), lampRun: $('#lampRun')
  };

  const RHO = 1.225, MU = 1.81e-5;

  function refresh() {
    const p = PROFILES[state.profileId];
    const c = coeffs(p, state.alphaDeg);
    state.coeffs = c;
    const q = 0.5 * RHO * state.v * state.v;
    const L = q * state.area * c.cl;
    const D = q * state.area * c.cd;
    const Re = RHO * state.v * state.chord / MU;
    const cp = clamp(0.35 - c.cl * 0.075, 0.09, 0.52);

    el.alphaOut.textContent = state.alphaDeg.toFixed(1) + '°';
    el.speedOut.textContent = state.v.toFixed(0) + ' м/с';
    el.areaOut.textContent = state.area.toFixed(2) + ' м²';
    el.chordOut.textContent = state.chord.toFixed(2) + ' м';
    el.liftVal.textContent = window.AeroLab.fmt(L, 1);
    el.dragVal.textContent = window.AeroLab.fmt(D, 2);
    el.ldVal.textContent = window.AeroLab.fmt(c.ld, 1);
    el.cyVal.textContent = window.AeroLab.fmt(c.cl, 2);
    el.reVal.textContent = window.AeroLab.fmt(Re / 1000, 0);
    el.cpVal.textContent = window.AeroLab.fmt(cp * 100, 0);
    el.liftBar.style.width = clamp(Math.abs(L) / 2.2, 0, 100).toFixed(1) + '%';
    el.dragBar.style.width = clamp(D / 0.9, 0, 100).toFixed(1) + '%';
    el.liftPerMeter.textContent = 'нагрузка ' + window.AeroLab.fmt(Math.abs(L) / Math.max(state.area, 0.01), 0) + ' Н/м²';

    el.regimePill.textContent = c.stalled ? 'СРЫВ!' : 'ОБТЕКАНИЕ';
    el.regimePill.classList.toggle('stall', c.stalled);
    el.stallBadge.classList.toggle('show', c.stalled && state.v > 0);
    el.lampStall.classList.toggle('danger', c.stalled);
    el.lampRun.style.opacity = state.v > 0 ? '1' : '0.35';
    el.lampStall.querySelector('.bulb').style.background = c.stalled ? '' : '#3a4a70';
    el.lampStall.querySelector('.bulb').style.boxShadow = c.stalled ? '' : 'none';

    drawPolar();
  }

  /* ───────────── Полярная диаграмма Cy(α) ───────────── */
  function drawPolar() {
    if (!pctx) return;
    const p = PROFILES[state.profileId];
    const w = polar.width, h = polar.height;
    const padL = 34, padR = 10, padT = 12, padB = 26;
    const aMin = -6, aMax = 24, cyMin = -0.4, cyMax = 1.9;
    const X = a => padL + (a - aMin) / (aMax - aMin) * (w - padL - padR);
    const Y = cy => h - padB - (cy - cyMin) / (cyMax - cyMin) * (h - padT - padB);

    pctx.clearRect(0, 0, w, h);
    // зона срыва
    pctx.fillStyle = 'rgba(255,77,94,0.10)';
    pctx.fillRect(X(p.stall), padT, w - padR - X(p.stall), h - padT - padB);
    // сетка
    pctx.strokeStyle = 'rgba(140,165,210,0.14)'; pctx.lineWidth = 1;
    pctx.font = '9px "Segoe UI",sans-serif'; pctx.fillStyle = '#6b7ca3';
    for (let cy = 0; cy <= 1.6; cy += 0.4) {
      pctx.beginPath(); pctx.moveTo(padL, Y(cy)); pctx.lineTo(w - padR, Y(cy)); pctx.stroke();
      pctx.fillText(cy.toFixed(1), 4, Y(cy) + 3);
    }
    for (let a = -6; a <= 24; a += 6) {
      pctx.beginPath(); pctx.moveTo(X(a), padT); pctx.lineTo(X(a), h - padB); pctx.stroke();
      pctx.fillText(a + '°', X(a) - 7, h - padB + 12);
    }
    // оси
    pctx.strokeStyle = 'rgba(140,165,210,0.45)';
    pctx.beginPath(); pctx.moveTo(padL, h - padB); pctx.lineTo(w - padR, h - padB); pctx.stroke();
    pctx.beginPath(); pctx.moveTo(padL, padT); pctx.lineTo(padL, h - padB); pctx.stroke();
    // кривая
    pctx.beginPath();
    for (let i = 0; i <= 140; i++) {
      const a = aMin + (aMax - aMin) * i / 140;
      const cy = coeffs(p, a).cl;
      const px = X(a), py = Y(clamp(cy, cyMin, cyMax));
      if (i === 0) pctx.moveTo(px, py); else pctx.lineTo(px, py);
    }
    pctx.strokeStyle = '#38d0ff'; pctx.lineWidth = 2.4; pctx.stroke();
    // текущая точка
    const cNow = coeffs(p, state.alphaDeg);
    const mx = X(state.alphaDeg), my = Y(clamp(cNow.cl, cyMin, cyMax));
    pctx.setLineDash([3, 3]); pctx.strokeStyle = 'rgba(255,176,102,0.6)'; pctx.lineWidth = 1;
    pctx.beginPath(); pctx.moveTo(mx, padT); pctx.lineTo(mx, h - padB); pctx.stroke();
    pctx.setLineDash([]);
    pctx.beginPath(); pctx.arc(mx, my, 4.6, 0, Math.PI * 2);
    pctx.fillStyle = '#ff8a2a'; pctx.fill(); pctx.strokeStyle = '#1a0e00'; pctx.lineWidth = 1.5; pctx.stroke();
    pctx.fillStyle = '#ffb066'; pctx.font = 'bold 9px "Segoe UI",sans-serif';
    pctx.fillText('Cy=' + cNow.cl.toFixed(2), clamp(mx + 7, padL, w - 44), clamp(my - 6, 10, h - 8));
  }

  /* ───────────── Отрисовка сцены ───────────── */
  function drawFan(t) {
    ctx.save();
    ctx.translate(-30, CY);
    const spin = state.v > 0 ? t * (2 + state.v * 0.55) : 0.4;
    ctx.fillStyle = '#0d1630';
    ctx.beginPath(); ctx.arc(0, 0, 175, -Math.PI / 2.6, Math.PI / 2.6); ctx.fill();
    ctx.strokeStyle = '#263563'; ctx.lineWidth = 5; ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = spin + i * (Math.PI * 2 / 5);
      ctx.save(); ctx.rotate(a);
      ctx.fillStyle = i % 2 ? '#1c2a4e' : '#223258';
      ctx.beginPath(); ctx.ellipse(72, 0, 64, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#38d0ff'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawWalls() {
    // верхняя и нижняя стенки с заклёпками
    const grd = ctx.createLinearGradient(0, 0, 0, 26);
    grd.addColorStop(0, '#2a3a66'); grd.addColorStop(1, '#141f3d');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, 24); ctx.fillRect(0, H - 24, W, 24);
    ctx.fillStyle = '#3a4f82';
    for (let x = 16; x < W; x += 36) {
      ctx.beginPath(); ctx.arc(x, 12, 2.4, 0, Math.PI * 2); ctx.arc(x, H - 12, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    // пунктирная осевая линия
    ctx.setLineDash([7, 9]); ctx.strokeStyle = 'rgba(140,165,210,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, CY); ctx.lineTo(W, CY); ctx.stroke(); ctx.setLineDash([]);
    // стрелка направления потока
    ctx.fillStyle = 'rgba(140,165,210,0.5)';
    ctx.font = '11px "Segoe UI",sans-serif';
    ctx.fillText('поток →', W - 78, 42);
  }

  function drawSting() {
    ctx.save();
    ctx.fillStyle = '#1a2547';
    ctx.strokeStyle = '#33477c'; ctx.lineWidth = 2;
    ctx.fillRect(CX - 7, 24, 14, CY - 24 - Math.sin(state.alphaDeg * Math.PI / 180) * 40);
    ctx.strokeRect(CX - 7, 24, 14, CY - 24 - Math.sin(state.alphaDeg * Math.PI / 180) * 40);
    ctx.fillStyle = '#263563'; ctx.fillRect(CX - 12, 20, 24, 6);
    ctx.restore();
  }

  function drawAirfoil() {
    const p = PROFILES[state.profileId];
    const { up, lo } = profileOutline(p, 60);
    const aRad = state.alphaDeg * Math.PI / 180;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(aRad);
    ctx.translate(-CHORD / 2, 0);
    const grad = ctx.createLinearGradient(0, -CHORD * 0.2, 0, CHORD * 0.2);
    grad.addColorStop(0, '#eef3ff'); grad.addColorStop(0.45, '#b9c6e4'); grad.addColorStop(1, '#66739c');
    ctx.beginPath();
    up.forEach((q, i) => { const px = q[0] * CHORD, py = -q[1] * CHORD; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    for (let i = lo.length - 1; i >= 0; i--) ctx.lineTo(lo[i][0] * CHORD, -lo[i][1] * CHORD);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = '#05070f'; ctx.lineWidth = 2; ctx.stroke();
    // маркер центра давления (условно ~25–30% хорды)
    const cp = clamp(0.35 - state.coeffs.cl * 0.075, 0.09, 0.52);
    ctx.beginPath(); ctx.arc(cp * CHORD, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8a2a'; ctx.fill(); ctx.strokeStyle = '#1a0e00'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffb066'; ctx.font = 'bold 10px "Segoe UI",sans-serif';
    ctx.fillText('ЦД', cp * CHORD - 7, -12);
    // носок крыла
    ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fillStyle = '#38d0ff'; ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - (frame.last || now)) / 1000) * state.timeScale;
    frame.last = now;
    state.t += dt;
    const t = state.t;
    const aRad = state.alphaDeg * Math.PI / 180;
    const stalled = state.coeffs && state.coeffs.stalled;

    // фон рабочей зоны
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#070d1f'); bg.addColorStop(0.5, '#0a1330'); bg.addColorStop(1, '#070d1f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // вертикальная разметка
    ctx.strokeStyle = 'rgba(140,165,210,0.07)'; ctx.lineWidth = 1;
    for (let x = 90; x < W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 26); ctx.lineTo(x, H - 26); ctx.stroke(); }

    drawFan(t);
    drawWalls();

    // частицы (струйки)
    const vPix = state.v * 6.2;
    particles.forEach(pt => {
      const prevX = pt.x, prevY = pt.y0 + deflection(pt.x, pt.y0, aRad) + wakeFlutter(pt.x, pt, aRad, stalled);
      pt.x += vPix * dt * pt.jitter;
      if (pt.x > W + 40) { pt.x = -30 - Math.random() * 120; pt.y0 = 40 + Math.random() * (H - 80); return; }
      const yy = pt.y0 + deflection(pt.x, pt.y0, aRad) + wakeFlutter(pt.x, pt, aRad, stalled);
      let f = 1 - localSlope(pt.x, pt.y0, aRad) * 4.1 * (pt.y0 < CY ? 1.35 : 0.75);
      if (stalled && pt.x > CX && Math.abs(pt.y0 - CY) < CHORD * 0.42) f *= 0.62;
      f = clamp(f, 0.5, 1.75);
      ctx.strokeStyle = speedColor(f);
      ctx.globalAlpha = stalled && pt.x > CX && Math.abs(pt.y0 - CY) < CHORD * 0.42 ? 0.6 : 0.9;
      ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(pt.x, yy); ctx.stroke();
      ctx.globalAlpha = 1;
    });

    drawSting();
    drawAirfoil();

    // табло в углу рабочей зоны
    ctx.fillStyle = 'rgba(6,11,24,0.72)';
    ctx.fillRect(14, H - 58, 205, 34);
    ctx.strokeStyle = 'rgba(56,208,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(14, H - 58, 205, 34);
    ctx.fillStyle = '#8ae4ff'; ctx.font = 'bold 12px "Consolas",monospace';
    ctx.fillText('v = ' + state.v.toFixed(0) + ' м/с   α = ' + state.alphaDeg.toFixed(1) + '°', 24, H - 37);

    requestAnimationFrame(frame);
  }

  function wakeFlutter(x, pt, aRad, stalled) {
    if (!stalled || x <= CX) return 0;
    if (Math.abs(pt.y0 - CY) >= CHORD * 0.42) return 0;
    const env = clamp((x - CX) / 130, 0, 1);
    return (Math.sin(x * 0.045 - state.t * 7 + pt.seed) * 11 + Math.sin(x * 0.095 + state.t * 12 + pt.seed * 2.3) * 5) * env;
  }

  /* ───────────── Задания с автопроверкой ───────────── */
  const TASKS = [
    { id: 1, text: 'NACA 2412: найдите угол атаки максимальной подъёмной силы (C<sub>y</sub> &gt; 1,5, но ещё без срыва).', check: s => s.profileId === 'naca2412' && !s.coeffs.stalled && s.coeffs.cl > 1.5 },
    { id: 2, text: 'Добейтесь режима СРЫВ на любом профиле — стрелками «угол атаки» и «Поймать срыв» в пресетах.', check: s => s.coeffs.stalled },
    { id: 3, text: 'NACA 0012, малый угол (2–5°): получите аэродинамическое качество K ≥ 30 и зафиксируйте показание.', check: s => s.profileId === 'naca0012' && Math.abs(s.alphaDeg) >= 2 && Math.abs(s.alphaDeg) <= 5.5 && s.coeffs.ld >= 30 }
  ];
  const taskList = $('#taskList');
  TASKS.forEach(task => {
    const div = document.createElement('div');
    div.className = 'task'; div.id = 'task-' + task.id;
    div.innerHTML =
      '<div class="task-num">' + task.id + '</div>' +
      '<div class="task-body"><div class="task-text">' + task.text + '</div>' +
      '<div class="task-foot"><span class="task-status">Не выполнено</span>' +
      '<button class="task-btn">Проверить</button></div></div>';
    div.querySelector('.task-btn').addEventListener('click', () => {
      const ok = task.check(state);
      div.classList.toggle('done', ok);
      div.querySelector('.task-status').textContent = ok ? '✓ Выполнено! Так держать.' : 'Пока нет — крутите стенд дальше.';
    });
    taskList.appendChild(div);
  });

  /* ───────────── Пуск ───────────── */
  refresh();
  requestAnimationFrame(frame);
})();
