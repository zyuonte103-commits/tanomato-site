/* 余白珈琲 — page interactions (opening status, menu tabs, a day in the shop). */
(() => {
  const K = window.Kit;
  if (!K) return;
  const d = document;

  /* ---------- Open now (Japan time) ---------- */
  const hours = { 0: [9, 18], 1: [8, 18], 2: [8, 18], 3: null, 4: [8, 18], 5: [8, 18], 6: [9, 18] };
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  function state() {
    const t = K.jst();
    const h = hours[t.day];
    const now = t.h + t.m / 60;
    if (h && now >= h[0] && now < h[1]) {
      return { open: true, day: t.day, short: `営業中　${h[1]}:00まで`, long: `ただいま営業中です。本日は${h[1]}:00まで（ラストオーダー${h[1] - 1}:30）` };
    }
    if (h && now < h[0]) {
      return { open: false, day: t.day, short: `本日 ${h[0]}:00から`, long: `本日は${h[0]}:00から営業します` };
    }
    let i = 1;
    while (!hours[(t.day + i) % 7]) i++;
    const next = (t.day + i) % 7;
    const when = i === 1 ? '明日' : `${dayNames[next]}曜日`;
    return {
      open: false,
      day: t.day,
      short: h ? '本日の営業は終了' : '本日は定休日',
      long: `${h ? '本日の営業は終了しました' : '本日は定休日です'}。${when}は${hours[next][0]}:00から営業します`,
    };
  }
  const chip = d.querySelector('[data-status]');
  const long = d.querySelector('[data-status-long]');
  function paintStatus() {
    const s = state();
    if (chip) { chip.classList.toggle('is-open', s.open); chip.querySelector('span').textContent = s.short; }
    if (long) { long.classList.toggle('is-open', s.open); long.textContent = s.long; }
    d.querySelectorAll('.week tr').forEach((tr) => tr.classList.toggle('is-today', Number(tr.dataset.day) === s.day));
  }
  paintStatus();
  setInterval(paintStatus, 30000);

  /* ---------- Current section in the header ---------- */
  const links = [...d.querySelectorAll('.gnav a[href^="#"]')];
  const secIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a) => { const s = d.querySelector(a.getAttribute('href')); if (s) secIO.observe(s); });

  /* ---------- Menu tabs ---------- */
  const tabs = [...d.querySelectorAll('.tabs__btn')];
  const ink = d.querySelector('.tabs__ink');
  const current = () => tabs.find((b) => b.getAttribute('aria-selected') === 'true') || tabs[0];
  const moveInk = () => {
    const b = current();
    if (ink && b) ink.style.transform = `translate3d(0, ${b.offsetTop + b.offsetHeight / 2 - 7.5}px, 0)`;
  };
  function select(btn, focus) {
    tabs.forEach((b) => {
      const on = b === btn;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      const panel = d.getElementById(b.getAttribute('aria-controls'));
      panel.hidden = !on;
      panel.classList.remove('is-shown');
      if (on) { void panel.offsetWidth; panel.classList.add('is-shown'); }
    });
    if (focus) btn.focus();
    if (btn.scrollIntoView && innerWidth <= 960) btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: K.reduce ? 'auto' : 'smooth' });
    moveInk();
    K._dirty = true;
  }
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => select(b));
    b.addEventListener('keydown', (e) => {
      const map = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      select(tabs[(map[e.key] + tabs.length) % tabs.length], true);
    });
  });
  d.querySelectorAll('.panel').forEach((p) => p.querySelectorAll('.item').forEach((it, i) => it.style.setProperty('--i', i)));
  moveInk();
  if (d.fonts) d.fonts.ready.then(moveInk);
  addEventListener('resize', moveInk);

  /* ---------- Floating illustration beside the menu ---------- */
  const preview = d.querySelector('.preview');
  if (preview && K.fine && !K.reduce) {
    const use = preview.querySelector('use');
    const en = preview.querySelector('.preview__en');
    let mx = -400, my = -400, x = -400, y = -400;
    d.querySelectorAll('.item').forEach((it) => {
      it.addEventListener('pointerenter', () => {
        use.setAttribute('href', `#illust-${it.dataset.illust}`);
        en.textContent = it.dataset.en;
        preview.style.setProperty('--rot', `${(Math.random() * 12 - 6).toFixed(1)}deg`);
        preview.classList.add('is-on');
      });
      it.addEventListener('pointerleave', () => preview.classList.remove('is-on'));
    });
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    K.onTick(() => {
      const side = mx > innerWidth - 260 ? -150 : 150;
      x = K.lerp(x, mx + side, 0.12);
      y = K.lerp(y, my, 0.12);
      preview.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
  }

  /* ---------- Marquee follows the scroll ---------- */
  const track = d.querySelector('.marquee__track');
  const anim = track && track.getAnimations ? track.getAnimations()[0] : null;
  if (anim && !K.reduce) {
    let dir = 1;
    K.onTick(() => {
      const v = K.velocity;
      if (v > 0.6) dir = 1;
      else if (v < -0.6) dir = -1;
      anim.playbackRate = dir * (1 + Math.min(10, Math.abs(v)) * 0.8);
    });
  }

  /* ---------- A day at Yohaku: scroll moves the clock ---------- */
  const day = d.querySelector('.day');
  if (day) {
    const sky = day.querySelector('.day__sky');
    const clock = day.querySelector('[data-clock]');
    const scenes = [...day.querySelectorAll('.scene')];
    const bg = [
      [0, [243, 238, 229]], [0.42, [242, 229, 206]], [0.68, [214, 158, 110]], [0.8, [92, 64, 48]], [1, [34, 27, 22]],
    ];
    const sun = [
      [0, [255, 240, 205]], [0.45, [255, 250, 232]], [0.7, [255, 196, 120]], [1, [242, 132, 80]],
    ];
    const at = (stops, p) => {
      for (let i = 0; i < stops.length - 1; i++) {
        const [p0, c0] = stops[i];
        const [p1, c1] = stops[i + 1];
        if (p <= p1) {
          const t = (p - p0) / (p1 - p0);
          return c0.map((v, k) => Math.round(K.lerp(v, c1[k], t)));
        }
      }
      return stops[stops.length - 1][1];
    };
    const lum = (c) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
    };
    let last = -1;
    const paint = (p) => {
      const c = at(bg, p);
      const dark = lum(c) < 0.19;
      day.style.setProperty('--day-bg', `rgb(${c.join(',')})`);
      day.style.setProperty('--day-ink', dark ? '#f3eee5' : '#2a211b');
      day.style.setProperty('--day-accent', dark ? '#e3ad78' : (p > 0.55 ? '#6e3a14' : '#9c5a26'));
      day.style.setProperty('--sun', `rgb(${at(sun, p).join(',')})`);
      const th = Math.PI * (0.05 + p * 0.93);
      sky.style.setProperty('--sx', (50 - 46 * Math.cos(th)).toFixed(2));
      sky.style.setProperty('--sy', (96 - 88 * Math.sin(th)).toFixed(2));
      const mins = Math.round((8 * 60 + p * 600) / 10) * 10;
      const text = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      if (clock.textContent !== text) clock.textContent = text;
      const idx = p < 0.36 ? 0 : p < 0.7 ? 1 : 2;
      if (idx !== last) {
        last = idx;
        scenes.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      }
    };
    day.addEventListener('kit:progress', (e) => paint(e.detail));
    paint(0);
  }
})();
