/* ピアノ教室 ゆきのね（架空）— 鍵盤の目次と、今日・今月の印 */
(function () {
  const d = document;
  const keys = [...d.querySelectorAll('.key')];
  keys.forEach((k, i) => k.style.setProperty('--n', i));

  // 時間割：開いた日の曜日に「今日」
  const now = new Date();
  const today = d.querySelector('.book li[data-day="' + now.getDay() + '"]');
  if (today) today.classList.add('is-today');

  // 一年の予定：いまの月に印
  const month = d.querySelector('.staff__months li[data-m="' + (now.getMonth() + 1) + '"]');
  if (month) month.classList.add('is-now');

  // 読んでいるところの鍵盤に、フェルトの赤い線
  if ('IntersectionObserver' in window) {
    const map = new Map(keys.map(k => [k.getAttribute('href').slice(1), k]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        keys.forEach(k => k.classList.remove('is-current'));
        const k = map.get(e.target.id);
        if (k) k.classList.add('is-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = d.getElementById(id); if (s) io.observe(s); });
  }
})();
