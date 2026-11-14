'use strict';
/* АэроЛаб · quiz.js — квиз «Аэро-Эрудит» */
(function () {
  const { $ } = window.AeroLab;
  const root = $('#page-quiz');
  if (!root) return;

  const QUESTIONS = [
    { q: 'Что такое угол атаки крыла?', options: ['Угол между крылом и горизонтом', 'Угол между хордой крыла и набегающим потоком', 'Угол крена самолёта в вираже', 'Угол между стабилизатором и крылом'], answer: 1, expl: 'Хорда — прямая от носка к задней кромке. Угол к вектору скорости потока и есть α.' },
    { q: 'Подъёмная сила при увеличении скорости потока в 2 раза…', options: ['вырастет в 2 раза', 'вырастет в 4 раза', 'не изменится', 'упадёт в 2 раза'], answer: 1, expl: 'L = ½ρv²SC_y — скорость в квадрате. Поэтому разбег критичен: чем быстрее, тем «легче» крыло.' },
    { q: 'Что происходит с потоком при превышении критического угла атаки?', options: ['Самолёт начинает штопорить без предупреждения', 'Пограничный слой отрывается, подъёмная сила падает', 'Воздух становится несжимаемым', 'Ничего, крыло просто тянет сильнее'], answer: 1, expl: 'Это и есть срыв. Сваливание — про угол атаки, а не про скорость.' },
    { q: 'Чему равно аэродинамическое качество K?', options: ['K = C_x / C_y', 'K = L / D', 'K = v² / g', 'K = S · C_y'], answer: 1, expl: 'K = L/D = C_y/C_x — сколько метров вперёд пролетит планер на каждый метр высоты.' },
    { q: 'В узкой части трубы Вентури…', options: ['скорость и давление выше', 'скорость выше, давление ниже', 'скорость ниже, давление выше', 'и скорость, и давление ниже'], answer: 1, expl: 'Континуитет: v₁S₁ = v₂S₂. Бернулли: быстро — значит «разрежено».' },
    { q: 'Число Рейнольдса Re = ρvc/μ характеризует…', options: ['во сколько раз крыло тяжелее воздуха', 'отношение инерции к вязкости потока (режим течения)', 'прочность крыла на изгиб', 'время полёта от батареи'], answer: 1, expl: 'Малые Re — «вязкий» мир модели: профиль должен быть толстым и дугистым.' },
    { q: 'Шаг винта 4.5″ означает, что…', options: ['винт делает 4.5 оборота в секунду', 'за один оборот винт «проходит» 4.5 дюйма вдоль оси', 'диаметр винта 4.5 дюйма', 'угол установки лопасти 4.5°'], answer: 1, expl: 'Шаг — осевой ход за оборот без скольжения. H = шаг, скорость по шагу V = H·n.' },
    { q: 'Почему соседние моторы квадрокоптера вращаются в разные стороны?', options: ['Для симметрии рамы', 'Чтобы компенсировать реактивный момент винтов', 'Так проще паять регуляторы', 'Это ни на что не влияет'], answer: 1, expl: 'Иначе коптер закрутился бы вокруг вертикальной оси. Диагональные пары крутятся в одну сторону (режим X).' },
    { q: 'Что измеряет трубка Пито?', options: ['Статическое давление', 'Полное давление → по нему скорость потока', 'Температуру воздуха', 'Влажность'], answer: 1, expl: 'Давление полного торможения минус статическое (по приёмнику статики) = скоростной напор ½ρv².' },
    { q: 'Как расшифровывается FPV?', options: ['Fast Propeller Vehicle', 'First Person View — вид от первого лица', 'Flight Path Vector', 'Fixed-Pitch Variable'], answer: 1, expl: 'Камера на борту + очки/монитор пилота. Основа гоночно-фристайлового пилотирования.' },
    { q: 'Почему винт большего диаметра обычно тяговитее?', options: ['Красивее смотрится', 'Тяга ∝ D⁴ при прочих равных', 'Легче балансируется', 'Меньше шум'], answer: 1, expl: 'T = C_t·ρ·n²·D⁴. Каждый сантиметр диаметра — в четвёртой степени по тяге.' },
    { q: 'Профиль NACA 2412 по сравнению с NACA 0012…', options: ['создаёт подъёмную силу уже при α = 0°', 'никогда не срывается', 'имеет нулевую кривизну средней линии', 'предназначен только для хвостового оперения'], answer: 0, expl: '«24» — вогнутость 2 % при 40 % хорды: C_y(0°) ≈ 0,25. 0012 — симметричный, подъёмная сила только от угла атаки.' }
  ];

  const LETTERS = ['А', 'Б', 'В', 'Г'];
  let index = 0, score = 0, answered = false;

  const el = {
    progress: $('#quizProgress'), counter: $('#quizCounter'), score: $('#quizScore'),
    question: $('#quizQuestion'), options: $('#quizOptions'), expl: $('#quizExpl'),
    next: $('#quizNext'), result: $('#quizResult'), finalScore: $('#quizFinalScore'),
    rank: $('#quizRank'), rankSub: $('#quizRankSub'), stars: $('#quizStars'), restart: $('#quizRestart')
  };

  function render() {
    answered = false;
    const item = QUESTIONS[index];
    el.progress.style.width = (index / QUESTIONS.length * 100) + '%';
    el.counter.textContent = 'Вопрос ' + (index + 1) + ' из ' + QUESTIONS.length;
    el.score.textContent = 'Верно: ' + score;
    el.question.textContent = item.q;
    el.expl.style.display = 'none';
    el.next.style.display = 'none';
    el.options.innerHTML = '';
    item.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt';
      btn.innerHTML = '<span class="letter">' + LETTERS[i] + '</span><span>' + opt + '</span>';
      btn.addEventListener('click', () => choose(i, btn));
      el.options.appendChild(btn);
    });
  }

  function choose(i, btn) {
    if (answered) return;
    answered = true;
    const item = QUESTIONS[index];
    const buttons = Array.from(el.options.children);
    buttons.forEach((b, j) => {
      b.disabled = true;
      if (j === item.answer) b.classList.add('correct');
    });
    if (i === item.answer) {
      score++;
    } else {
      btn.classList.add('wrong');
    }
    el.score.textContent = 'Верно: ' + score;
    el.expl.textContent = 'Почему: ' + item.expl;
    el.expl.style.display = 'block';
    el.next.style.display = 'inline-flex';
    el.next.textContent = index === QUESTIONS.length - 1 ? 'Показать результат →' : 'Дальше →';
  }

  el.next.addEventListener('click', () => {
    index++;
    if (index >= QUESTIONS.length) return showResult();
    render();
  });

  function showResult() {
    el.progress.style.width = '100%';
    el.counter.textContent = 'Готово!';
    el.question.textContent = 'Ваш результат:';
    el.options.innerHTML = '';
    el.expl.style.display = 'none';
    el.next.style.display = 'none';
    el.result.style.display = 'block';
    el.finalScore.textContent = score;
    const pct = score / QUESTIONS.length;
    let rank, sub, stars;
    if (pct === 1) { rank = 'Легенда Аэроквантума'; sub = 'Идеальный результат! Вас ждёт инструкторский допуск и сложные маршруты.'; stars = '★★★'; }
    else if (pct >= 0.75) { rank = 'Мастер Аэроквантума'; sub = 'Уверенные знания: можно допускать к самостоятельным полётам в зоне.'; stars = '★★★'; }
    else if (pct >= 0.5) { rank = 'Ученик Аэроквантума'; sub = 'База есть. Загляните в «Аэродинамическую трубу» и доберите про срыв и качество.'; stars = '★★'; }
    else { rank = 'Юный авиамоделист'; sub = 'Начало положено! Пройдите модули стенда и вернитесь — всё получится.'; stars = '★'; }
    el.rank.textContent = rank;
    el.rankSub.textContent = sub;
    el.stars.textContent = stars;
  }

  el.restart.addEventListener('click', () => {
    index = 0; score = 0;
    el.result.style.display = 'none';
    render();
  });

  render();
})();
