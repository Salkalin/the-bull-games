// games/leaderboard.js — демо-турнирная таблица (без бэкенда)
(function () {
  const FAKE_KEY = 'lb_fakes_v1';
  const MY_KEY   = 'lb_my_scores_v1';

  const NAMES = [
    'Мясник', 'Гриль-Мастер', 'Антон', 'Шеф', 'Бык №7', 'Гость',
    'Стейк-Любитель', 'Марина', 'Огонь', 'Дмитрий', 'Котлета', 'Бургер-Кинг',
    'Таня', 'Ростбиф', 'Копчёный', 'Ирина', 'Сергей', 'Уголёк', 'Просто Гость',
    'Максим', 'Окорочок', 'Гурман', 'Юля', 'Барбекю', 'Тётя Люба'
  ];

  // Простой seeded random, чтобы фейки были стабильны в течение дня
  function seedRandom(seed) {
    let s = seed;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  function todaySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function makeFakes(baseScore) {
    // базовый результат — это счёт текущей игры (или 0)
    // фейки распределяем вокруг него: кто-то выше, кто-то ниже
    const rnd = seedRandom(todaySeed() + baseScore % 13);
    const count = 8 + Math.floor(rnd() * 4); // 8–11
    const fakes = [];
    const usedNames = new Set();

    for (let i = 0; i < count; i++) {
      let name;
      do { name = NAMES[Math.floor(rnd() * NAMES.length)]; }
      while (usedNames.has(name));
      usedNames.add(name);

      // разброс: от -60% до +40% от базового, с минимумом 200
      const factor = 0.4 + rnd() * 1.0; // 0.4..1.4
      const score = Math.max(200, Math.round(baseScore * factor));
      fakes.push({ name, score, fake: true });
    }
    return fakes;
  }

  function getCachedFakes(baseScore) {
    try {
      const raw = localStorage.getItem(FAKE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const today = todaySeed();
        // кэш живёт сутки и только если базовый счёт "похож" (чтобы не было дикого перекоса)
        if (data.day === today) return data.fakes;
      }
    } catch (e) {}
    const fakes = makeFakes(baseScore);
    try {
      localStorage.setItem(FAKE_KEY, JSON.stringify({ day: todaySeed(), fakes }));
    } catch (e) {}
    return fakes;
  }

  function getMyScores() {
    try { return JSON.parse(localStorage.getItem(MY_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  function saveMyScore(game, score) {
    const all = getMyScores();
    if (!all[game] || all[game] < score) {
      all[game] = score;
      try { localStorage.setItem(MY_KEY, JSON.stringify(all)); } catch (e) {}
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function render(el, rows, myScore) {
    if (!rows.length) {
      el.innerHTML = '<div class="lb-empty">Пока никого. Стань первым!</div>';
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    let html = '<div class="lb-title">🏆 ТОП СЕГОДНЯ</div><ol class="lb-list">';

    // подсвечиваем первую строку, где score совпадает с myScore
    let meMarked = false;

    rows.forEach((r, i) => {
      const isMe = !meMarked && r.score === myScore;
      if (isMe) meMarked = true;
      const pos = medals[i] || (i + 1);
      html += `<li class="${isMe ? 'lb-me' : ''}">
        <span class="lb-pos">${pos}</span>
        <span class="lb-name">${escapeHtml(r.name)}${isMe ? ' ←' : ''}</span>
        <span class="lb-score">${r.score}</span>
      </li>`;
    });
    html += '</ol>';
    el.innerHTML = html;
  }

  window.Leaderboard = {
    init: function (opts) {
      // opts: { game: 'match'|'mash'|'synth', score: number, containerId: string }
      const el = document.getElementById(opts.containerId);
      if (!el) return;

      const myScore = Number(opts.score) || 0;

      // сохраняем личный рекорд
      if (myScore > 0) saveMyScore(opts.game, myScore);

      // собираем общий список: фейки + я
      const fakes = getCachedFakes(myScore);
      const rows = fakes.concat([{ name: 'Ты', score: myScore, me: true }]);
      rows.sort((a, b) => b.score - a.score);

      // оставляем топ-7, но «Ты» должен быть виден, даже если вне топ-7
      const top = rows.slice(0, 7);
      const meInTop = top.some(r => r.me);
      if (!meInTop) {
        const meRow = rows.find(r => r.me);
        if (meRow) top.push(meRow); // добавляем 8-й строкой
      }

      render(el, top, myScore);
    }
  };
})();