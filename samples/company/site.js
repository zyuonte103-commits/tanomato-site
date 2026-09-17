/* NORTHLINE — contour-map hero, header theme, horizontal process, live clock. */
(() => {
  const K = window.Kit;
  if (!K) return;
  const d = document;

  /* ---------- Japan time clock ---------- */
  const clocks = [...d.querySelectorAll('[data-jst]')];
  const pad = (n) => String(n).padStart(2, '0');
  const tickClock = () => {
    const t = K.jst();
    const text = `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`;
    clocks.forEach((c) => { c.textContent = text; });
  };
  if (clocks.length) { tickClock(); setInterval(tickClock, 1000); }

  /* ---------- Header colour follows the section under it ---------- */
  const head = d.querySelector('.head');
  const themed = [...d.querySelectorAll('[data-theme]')];
  let lastScroll = -1;
  K.onTick((now, y) => {
    if (!head || y === lastScroll) return;
    lastScroll = y;
    const probe = 36;
    let dark = false;
    for (const s of themed) {
      const r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { dark = s.dataset.theme === 'dark'; break; }
    }
    head.classList.toggle('on-dark', dark);
  });

  /* ---------- Simplex noise (Gustavson) for the contour map ---------- */
  const perm = new Uint8Array(512);
  (() => {
    const p = Array.from({ length: 256 }, (_, i) => i);
    let seed = 43062;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  const G = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];
  const F3 = 1 / 3, G3 = 1 / 6;
  function corner(gi, x, y, z) {
    let t = 0.6 - x * x - y * y - z * z;
    if (t < 0) return 0;
    t *= t;
    const g = (gi % 12) * 3;
    return t * t * (G[g] * x + G[g + 1] * y + G[g + 2] * z);
  }
  function noise3(xin, yin, zin) {
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    const ii = i & 255, jj = j & 255, kk = k & 255;
    const n0 = corner(perm[ii + perm[jj + perm[kk]]], x0, y0, z0);
    const n1 = corner(perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3);
    const n2 = corner(perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3);
    const n3 = corner(perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3);
    return 32 * (n0 + n1 + n2 + n3);
  }

  /* Marching squares: for each corner pattern, which edges to join (0 top, 1 right, 2 bottom, 3 left). */
  const CASES = [[], [2, 3], [1, 2], [1, 3], [0, 1], [0, 1, 2, 3], [0, 2], [0, 3], [0, 3], [0, 2], [0, 3, 1, 2], [0, 1], [1, 3], [1, 2], [2, 3], []];

  function contour(canvas) {
    const ctx = canvas.getContext('2d');
    const host = canvas.closest('[data-topo-host]') || canvas.parentElement;
    const strength = Number(canvas.dataset.strength) || 1;
    let W = 0, H = 0, cell = 14, cols = 0, rows = 0, field = null;
    let mx = -9999, my = -9999, bx = -9999, by = -9999, bump = 0;
    let visible = true, last = 0;
    const levels = [];
    for (let v = -0.66; v <= 0.7; v += 0.12) levels.push(v);
    const hi = 7;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = W < 720 ? 20 : 15;
      cols = Math.ceil(W / cell) + 2; rows = Math.ceil(H / cell) + 2;
      field = new Float32Array(cols * rows);
    }
    function draw(t) {
      const z = t * 0.000045;
      bx = K.lerp(bx, mx, 0.08); by = K.lerp(by, my, 0.08);
      bump = K.lerp(bump, mx > -999 ? 1 : 0, 0.05);
      const sig = 2 * 170 * 170;
      for (let j = 0; j < rows; j++) {
        const y = j * cell;
        for (let i = 0; i < cols; i++) {
          const x = i * cell;
          let v = noise3(x * 0.0019, y * 0.0019, z) * 0.72 + noise3(x * 0.0052 + 40, y * 0.0052, z * 1.6) * 0.28;
          if (bump > 0.01) { const dx = x - bx, dy = y - by; v += 0.42 * bump * Math.exp(-(dx * dx + dy * dy) / sig); }
          field[j * cols + i] = v;
        }
      }
      ctx.clearRect(0, 0, W, H);
      levels.forEach((L, li) => {
        ctx.beginPath();
        for (let j = 0; j < rows - 1; j++) {
          const y0 = j * cell, y1 = y0 + cell;
          for (let i = 0; i < cols - 1; i++) {
            const a = field[j * cols + i], b = field[j * cols + i + 1];
            const c = field[(j + 1) * cols + i + 1], dd = field[(j + 1) * cols + i];
            const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (dd > L ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            const x0 = i * cell, x1 = x0 + cell;
            const seg = CASES[idx];
            for (let s = 0; s < seg.length; s += 2) {
              for (let e = 0; e < 2; e++) {
                const edge = seg[s + e];
                let px, py;
                if (edge === 0) { px = x0 + ((L - a) / (b - a)) * cell; py = y0; }
                else if (edge === 1) { px = x1; py = y0 + ((L - b) / (c - b)) * cell; }
                else if (edge === 2) { px = x0 + ((L - dd) / (c - dd)) * cell; py = y1; }
                else { px = x0; py = y0 + ((L - a) / (dd - a)) * cell; }
                if (e === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
              }
            }
          }
        }
        if (li === hi) {
          ctx.strokeStyle = `rgba(255, 106, 51, ${0.75 * strength})`;
          ctx.lineWidth = 1.4;
        } else {
          ctx.strokeStyle = `rgba(170, 196, 218, ${(li % 3 === 0 ? 0.3 : 0.14) * strength})`;
          ctx.lineWidth = li % 3 === 0 ? 1.1 : 0.8;
        }
        ctx.stroke();
      });
    }
    resize();
    addEventListener('resize', resize);
    if (K.fine) {
      host.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top;
        if (bump < 0.05) { bx = mx; by = my; }
      });
      host.addEventListener('pointerleave', () => { mx = -9999; my = -9999; });
    }
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
    draw(0);
    if (K.reduce) return;
    K.onTick((now) => {
      if (!visible || d.hidden || now - last < 33) return;
      last = now;
      draw(now);
    });
  }
  d.querySelectorAll('canvas.topo').forEach(contour);

  /* ---------- Coordinates follow the pointer in the hero ---------- */
  const coord = d.querySelector('[data-coord]');
  const hero = d.querySelector('.hero');
  if (coord && hero && K.fine) {
    const base = { lat: 43.0621, lon: 141.3544 };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const lat = base.lat + (0.5 - (e.clientY - r.top) / r.height) * 0.18;
      const lon = base.lon + ((e.clientX - r.left) / r.width - 0.5) * 0.32;
      coord.textContent = `${lat.toFixed(4)}°N ${lon.toFixed(4)}°E`;
    });
  }

  /* ---------- Horizontal process on wide screens ---------- */
  const proc = d.querySelector('.process');
  if (proc) {
    const track = proc.querySelector('.process__track');
    let dist = 0;
    const wide = () => innerWidth > 960 && !K.reduce;
    const layout = () => {
      if (!wide()) { proc.style.height = ''; track.style.transform = ''; dist = 0; return; }
      dist = Math.max(0, track.scrollWidth - track.clientWidth);
      proc.style.height = `${dist + innerHeight}px`;
      K._dirty = true;
    };
    layout();
    addEventListener('resize', layout);
    if (d.fonts) d.fonts.ready.then(layout);
    const count = proc.querySelector('.process__count b');
    const steps = [...proc.querySelectorAll('.pstep')];
    if (count) count.textContent = `01/${String(steps.length).padStart(2, '0')}`;
    proc.addEventListener('kit:progress', (e) => {
      if (!dist) return;
      track.style.transform = `translate3d(${(-e.detail * dist).toFixed(1)}px, 0, 0)`;
      const n = Math.min(steps.length - 1, Math.floor(e.detail * steps.length));
      steps.forEach((s, i) => s.classList.toggle('is-on', i <= n));
      if (count) count.textContent = `${String(n + 1).padStart(2, '0')}/${String(steps.length).padStart(2, '0')}`;
    });
  }

  /* ---------- Service index follows the reading position ---------- */
  const index = [...d.querySelectorAll('.index a')];
  if (index.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        index.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${en.target.id}`));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    index.forEach((a) => { const t = d.querySelector(a.getAttribute('href')); if (t) io.observe(t); });
  }
})();
