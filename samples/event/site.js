/* はじめての発信ラボ — next session & countdown, stickers, post builder, 90-minute clock. */
(() => {
  const K = window.Kit;
  if (!K) return;
  const d = document;
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- Next session: the 4th Saturday of each month, 14:00 JST ---------- */
  function fourthSaturday(y, m) {
    const dow = new Date(Date.UTC(y, m, 1)).getUTCDay();
    return 1 + ((6 - dow + 7) % 7) + 21;
  }
  function nextSession() {
    const t = K.jst();
    let y = t.y, m = t.mo;
    for (let i = 0; i < 3; i++) {
      const day = fourthSaturday(y, m);
      const start = Date.UTC(y, m, day, 5, 0, 0); // 14:00 JST
      if (start + 90 * 60000 > Date.now()) return { y, m, day, start };
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return null;
  }
  const session = nextSession();
  if (session) {
    const { y, m, day } = session;
    d.querySelectorAll('[data-next="md"]').forEach((el) => { el.textContent = `${m + 1}.${day}`; });
    d.querySelectorAll('[data-next="dow"]').forEach((el) => { el.textContent = 'SAT'; });
    d.querySelectorAll('[data-next="full"]').forEach((el) => { el.textContent = `${y}年${m + 1}月${day}日（土）14:00〜15:30`; });
    const cells = {};
    d.querySelectorAll('[data-cd]').forEach((el) => { (cells[el.dataset.cd] ||= []).push(el); });
    const inline = d.querySelectorAll('[data-countdown-inline]');
    const set = (key, val) => (cells[key] || []).forEach((el) => {
      if (el.textContent === val) return;
      el.textContent = val;
      if (!K.reduce) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
    });
    const tick = () => {
      const left = Math.max(0, session.start - Date.now());
      const s = Math.floor(left / 1000);
      set('d', pad(Math.floor(s / 86400)));
      set('h', pad(Math.floor(s / 3600) % 24));
      set('m', pad(Math.floor(s / 60) % 60));
      set('s', pad(s % 60));
      const text = left > 0 ? `次回まで あと${Math.floor(s / 86400)}日` : 'ただいま開催中（という想定です）';
      inline.forEach((el) => { el.textContent = text; });
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Current section in the header ---------- */
  const links = [...d.querySelectorAll('.gnav a[href^="#"]:not(.gnav__cta)')];
  const secIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['try', 'takeaway', 'program', 'faq', 'top', 'outline'].forEach((id) => { const s = d.getElementById(id); if (s) secIO.observe(s); });

  /* ---------- Stickers: drag and fling (mouse), tap to wiggle (touch) ---------- */
  const hero = d.querySelector('.hero');
  d.querySelectorAll('.sticker').forEach((el) => {
    let x = 0, y = 0, vx = 0, vy = 0, lx = 0, ly = 0, dragging = false, moved = false, spin = 0;
    const bounds = () => ({
      minX: -el.offsetLeft + 8,
      maxX: hero.clientWidth - el.offsetLeft - el.offsetWidth - 8,
      minY: -el.offsetTop + 80,
      maxY: hero.clientHeight - el.offsetTop - el.offsetHeight - 8,
    });
    const wiggle = () => { el.classList.remove('is-wiggle'); void el.offsetWidth; el.classList.add('is-wiggle'); };
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || K.reduce) return;
      dragging = true; moved = false;
      lx = e.clientX; ly = e.clientY; vx = 0; vy = 0;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-drag');
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      x += dx; y += dy; vx = dx; vy = dy;
      if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-drag');
      if (!moved) wiggle();
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('click', (e) => { if (e.pointerType !== 'mouse') wiggle(); });
    K.onTick(() => {
      if (!dragging && Math.abs(vx) + Math.abs(vy) < 0.05 && Math.abs(spin) < 0.05) return;
      if (!dragging) {
        x += vx; y += vy;
        vx *= 0.93; vy *= 0.93;
        const b = bounds();
        if (x < b.minX) { x = b.minX; vx *= -0.6; }
        if (x > b.maxX) { x = b.maxX; vx *= -0.6; }
        if (y < b.minY) { y = b.minY; vy *= -0.6; }
        if (y > b.maxY) { y = b.maxY; vy *= -0.6; }
      }
      spin = K.lerp(spin, K.clamp(vx * 1.6, -24, 24), 0.2);
      el.style.setProperty('--x', `${x.toFixed(1)}px`);
      el.style.setProperty('--y', `${y.toFixed(1)}px`);
      el.style.setProperty('--spin', `${spin.toFixed(2)}deg`);
    });
  });

  /* ---------- Band speeds up with the scroll ---------- */
  const band = d.querySelector('.band__track');
  const bandAnim = band && band.getAnimations ? band.getAnimations()[0] : null;
  if (bandAnim && !K.reduce) {
    let dir = 1;
    K.onTick(() => {
      const v = K.velocity;
      if (v > 0.6) dir = 1; else if (v < -0.6) dir = -1;
      bandAnim.playbackRate = dir * (1 + Math.min(12, Math.abs(v)) * 0.7);
    });
  }

  /* ---------- Post builder ---------- */
  const shops = {
    bakery: { name: 'こむぎ堂', word: 'BREAD', tag: '#パン屋' },
    salon: { name: 'hair ひだまり', word: 'HAIR', tag: '#美容室' },
    body: { name: 'ほぐし整体', word: 'BODY', tag: '#整体' },
  };
  const who = {
    family: { open: 'お子さま連れの方へ', close: 'ベビーカーのままでも、ゆっくりどうぞ' },
    work: { open: 'お仕事帰りの方へ', close: '平日は19時まで開いています' },
    first: { open: 'はじめての方へ', close: 'わからないことは、なんでも聞いてください' },
  };
  const strength = {
    craft: {
      bakery: '毎朝4時から、生地をこねています',
      salon: 'カラーは、髪の状態を見て一人ずつ調合します',
      body: '施術の内容は、その日の体に合わせて決めています',
    },
    quick: {
      bakery: '焼きあがりの時間を、店頭の黒板に書き出しています',
      salon: 'ご予約の方は、ほとんど待たずにご案内できます',
      body: '予約制なので、待ち時間はほとんどありません',
    },
    care: {
      bakery: 'アレルギーのご相談も、気軽にどうぞ',
      salon: '仕上がりは、写真を見ながら一緒に決めます',
      body: 'はじめに20分、じっくりお話をうかがいます',
    },
  };
  const builder = d.querySelector('.builder');
  if (builder) {
    const state = { place: 'bakery', who: 'family', strength: 'craft' };
    const names = d.querySelectorAll('[data-post-name]');
    const img = d.querySelector('[data-post-img]');
    const word = d.querySelector('[data-post-word]');
    const textEl = d.querySelector('[data-post-text]');
    const live = d.querySelector('[data-post-live]');
    let typer = 0;
    const caption = () => {
      const s = shops[state.place];
      const w = who[state.who];
      return `${w.open}\n${strength[state.strength][state.place]}\n${w.close}\n${s.tag} #札幌`;
    };
    const render = (instant) => {
      const s = shops[state.place];
      names.forEach((n) => { n.textContent = s.name; });
      if (img.dataset.postImg !== state.place) {
        img.dataset.postImg = state.place;
        word.textContent = s.word;
        img.classList.remove('is-swap'); void img.offsetWidth; img.classList.add('is-swap');
      }
      const full = caption();
      live.textContent = `${s.name}：${full.replace(/\n/g, '。')}`;
      clearInterval(typer);
      if (instant || K.reduce) { textEl.textContent = full; return; }
      let i = 0;
      textEl.textContent = '';
      const chars = [...full];
      typer = setInterval(() => {
        i += 1;
        textEl.textContent = chars.slice(0, i).join('');
        if (i >= chars.length) clearInterval(typer);
      }, 26);
    };
    const choose = (group, value) => {
      state[group] = value;
      builder.querySelectorAll(`[data-group="${group}"] .chip`).forEach((c) => {
        const on = c.dataset.value === value;
        c.setAttribute('aria-pressed', String(on));
        if (on) { c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump'); }
      });
    };
    builder.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) {
        choose(chip.closest('[data-group]').dataset.group, chip.dataset.value);
        render();
        return;
      }
      if (e.target.closest('[data-shuffle]')) {
        builder.querySelectorAll('[data-group]').forEach((g) => {
          const chips = [...g.querySelectorAll('.chip')];
          choose(g.dataset.group, chips[Math.floor(Math.random() * chips.length)].dataset.value);
        });
        render();
      }
    });
    render(true);
    const phone = d.querySelector('.phone');
    let typedOnce = false;
    new IntersectionObserver(([en], obs) => {
      if (!en.isIntersecting || typedOnce) return;
      typedOnce = true;
      render();
      obs.disconnect();
    }, { threshold: 0.4 }).observe(phone);
  }

  /* ---------- Program: the 90-minute clock follows the scroll ---------- */
  const program = d.querySelector('.program');
  if (program) {
    const minutes = program.querySelector('[data-minutes]');
    const slots = [...program.querySelectorAll('.slot')];
    const wide = () => innerWidth > 960;
    let last = -1;
    const paint = (p) => {
      if (!wide()) { slots.forEach((s) => s.classList.add('is-active')); return; }
      const mins = Math.round(K.clamp(p * 1.08) * 90);
      if (minutes.textContent !== String(mins)) minutes.textContent = mins;
      const idx = mins < 20 ? 0 : mins < 50 ? 1 : 2;
      if (idx === last) return;
      last = idx;
      slots.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    };
    program.addEventListener('kit:progress', (e) => paint(e.detail));
    addEventListener('resize', () => { last = -1; paint(program._p || 0); });
    paint(0);
  }

  /* ---------- Pretend application ---------- */
  const toast = d.querySelector('[data-toast]');
  let toastTimer = 0;
  d.querySelectorAll('[data-fake-apply]').forEach((b) => b.addEventListener('click', () => {
    toast.textContent = 'このイベントは架空の設定のため、申し込みはできません';
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3200);
  }));
})();
