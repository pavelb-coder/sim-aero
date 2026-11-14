'use strict';
/* АэроЛаб · prop.js — воздушный винт: оценка тяги (импульсная теория, FM=0.65) */
(function () {
  const { clamp, $ } = window.AeroLab;
  const canvas = $('#propCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const RHO = 1.225;
  const state = { D: 0.254, pitchCm: 11.4, rpm: 4000, angle: 0, t: 0 };

  const diamRange = $('#diamRange'), pitchRange = $('#pitchRange'), rpmRange = $('#rpmRange');
  [diamRange, pitchRange, rpmRange].forEach(window.AeroLab.bindRange);

  diamRange.addEventListener('input', () => { state.D = parseFloat(diamRange.value); refresh(); });
  pitchRange.addEventListener('input', () => { state.pitchCm = parseFloat(pitchRange.value); refresh(); });
  rpmRange.addEventListener('input', () => { state.rpm = parseFloat(rpmRange.value); refresh(); });

  const el = {
    diamOut: $('#diamOut'), pitchOut: $('#pitchOut'), rpmOut: $('#rpmOut'),
    propName: $('#propName'), hdVal: $('#hdVal'), thrustVal: $('#thrustVal'), powerVal: $('#powerVal'),
    pitchSpeedVal: $('#pitchSpeedVal'), effLabel: $('#effLabel'), maxMassVal: $('#maxMassVal'),
    task: $('#propTask'), taskStatus: $('#propTaskStatus'), taskCheck: $('#propTaskCheck')
  };

  function calc() {
    const D = state.D, Hm = state.pitchCm / 100, n = state.rpm / 60;
    const A = Math.PI * D * D / 4;
    const rel = Hm / D;
    const Ct = clamp(0.085 + 0.42 * rel - 0.28 * rel * rel, 0.045, 0.30);
    const T = Ct * RHO * n * n * Math.pow(D, 4);          // Н, статика
    const Pin = Math.pow(T, 1.5) / Math.sqrt(2 * RHO * A) / 0.65; // Вт (FM=0.65)
    const Vpitch = Hm * n;                                 // м/с
    const maxMassQuad = T * 4 / (2 * 9.81) * 1000;         // г, правило тяга/вес = 2
    return { D, Hm, n, A, rel, Ct, T, Pin, Vpitch, maxMassQuad };
  }

  const INCH = 0.0254, INCH_CM = 2.54;
  function refresh() {
    const c = calc();
    el.diamOut.textContent = state.D.toFixed(3) + ' м (' + (state.D / INCH).toFixed(1) + '″)';
    el.pitchOut.textContent = state.pitchCm.toFixed(1) + ' см (' + (state.pitchCm / INCH_CM).toFixed(1) + '″)';
    el.rpmOut.textContent = state.rpm.toFixed(0) + ' об/мин';
    el.propName.textContent = (state.D / INCH).toFixed(1) + '×' + (state.pitchCm / INCH_CM).toFixed(1);
    el.hdVal.textContent = c.rel.toFixed(2);
    el.thrustVal.textContent = c.T.toFixed(2);
    el.powerVal.textContent = c.Pin.toFixed(0);
    el.pitchSpeedVal.textContent = c.Vpitch.toFixed(1);
    el.effLabel.textContent = c.rel < 0.30 ? 'Тяговый' : c.rel <= 0.60 ? 'Универсальный' : c.rel <= 0.90 ? 'Скоростной' : 'Гоночный';
    el.effLabel.style.color = c.rel < 0.30 ? 'var(--cyan2)' : c.rel <= 0.60 ? 'var(--green)' : c.rel <= 0.90 ? 'var(--yellow)' : 'var(--red)';
    el.maxMassVal.textContent = c.maxMassQuad.toFixed(0);
    el.taskStatus.textContent = 'Сейчас: ' + c.maxMassQuad.toFixed(0) + ' г из 1200 г';
    if (c.maxMassQuad >= 1200) el.task.classList.add('done'); else el.task.classList.remove('done');
  }

  el.taskCheck.addEventListener('click', () => {
    const c = calc();
    const ok = c.maxMassQuad >= 1200;
    el.task.classList.toggle('done', ok);
    el.taskStatus.textContent = ok
      ? '✓ Выполнено! Запас тяги ' + c.maxMassQuad.toFixed(0) + ' г — коптер взлетит.'
      : 'Пока ' + c.maxMassQuad.toFixed(0) + ' г — мало. Добавьте диаметр, обороты или шаг.';
    el.taskStatus.style.color = ok ? 'var(--green)' : 'var(--red)';
    if (ok) window.AeroLab.unlock('prop_master');
  });

  /* ── Вращение винта (с «размытием» лопастей) ── */
  function drawBlade(a, len, chordW, alpha) {
    ctx.save();
    ctx.rotate(a);
    ctx.globalAlpha = alpha;
    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, '#33477c'); grad.addColorStop(0.35, '#dfe8ff'); grad.addColorStop(0.75, '#8fa3c0'); grad.addColorStop(1, '#ff8a2a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(14, -chordW * 0.32);
    ctx.quadraticCurveTo(len * 0.55, -chordW * 0.62, len, -chordW * 0.16);
    ctx.quadraticCurveTo(len + 6, 0, len, chordW * 0.16);
    ctx.quadraticCurveTo(len * 0.55, chordW * 0.62, 14, chordW * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(5,7,15,0.85)'; ctx.lineWidth = 1.5; ctx.stroke();
    // заметная цветная законцовка
    ctx.fillStyle = '#ff8a2a';
    ctx.beginPath(); ctx.ellipse(len - 8, 0, 9, chordW * 0.17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
    frame.last = now;
    state.t += dt;
    // визуальная частота: чем выше обороты, тем сильнее размытие (не стробим выше предела)
    const visualOmega = Math.min(state.rpm, 2600) / 60 * Math.PI * 2 * 0.35;
    state.angle += visualOmega * dt;

    ctx.clearRect(0, 0, W, H);

    // разметка диска
    ctx.strokeStyle = 'rgba(56,208,255,0.10)'; ctx.lineWidth = 1;
    [70, 120, 165].forEach(r => { ctx.beginPath(); ctx.arc(W / 2, H / 2 - 12, r, 0, Math.PI * 2); ctx.stroke(); });

    const cx = W / 2, cy = H / 2 - 12;
    const bladeLen = (state.D / 0.5) * 150 + 20;   // масштаб: 0.5 м → 170 px
    const chordW = 26 + (state.pitchCm / 30) * 30;  // шаг → ширина лопасти (условно)

    ctx.save();
    ctx.translate(cx, cy);
    // призраки лопастей — эффект вращения
    const ghosts = state.rpm > 5000 ? 3 : state.rpm > 2500 ? 2 : 1;
    for (let g = ghosts; g >= 1; g--) {
      const off = g * 0.22;
      drawBlade(state.angle - off, bladeLen, chordW, 0.10 + 0.05 * (ghosts - g));
      drawBlade(state.angle - off + Math.PI, bladeLen, chordW, 0.10 + 0.05 * (ghosts - g));
    }
    drawBlade(state.angle, bladeLen, chordW, 0.96);
    drawBlade(state.angle + Math.PI, bladeLen, chordW, 0.96);
    // ступица
    const hub = ctx.createRadialGradient(-4, -4, 2, 0, 0, 26);
    hub.addColorStop(0, '#e8eeff'); hub.addColorStop(0.5, '#66739c'); hub.addColorStop(1, '#1c2a4e');
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fillStyle = hub; ctx.fill();
    ctx.strokeStyle = '#05070f'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fillStyle = '#38d0ff'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fillStyle = '#05070f'; ctx.fill();
    ctx.restore();

    // табло оборотов
    ctx.fillStyle = 'rgba(6,11,24,0.75)';
    ctx.fillRect(14, H - 46, 190, 32);
    ctx.fillStyle = '#8ae4ff'; ctx.font = 'bold 13px "Consolas",monospace';
    ctx.fillText(state.rpm.toFixed(0) + ' об/мин · ' + (state.rpm / 60).toFixed(1) + ' об/с', 24, H - 25);

    requestAnimationFrame(frame);
  }

  refresh();
  requestAnimationFrame(frame);
})();
