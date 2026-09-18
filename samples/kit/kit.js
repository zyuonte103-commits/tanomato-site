/* TANOMATO sample kit — shared motion for the sample sites in samples/.
   Each page sets <html data-site="..."> and adds .booting / .entering in an inline head script.
   Site scripts can use window.Kit (tick loop, helpers) after this file runs. */
(() => {
  const d = document;
  const root = d.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const key = `${root.dataset.site || 'sample'}.booted`;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* storage may be blocked */ } },
  };

  const readyFns = [];
  const tickFns = new Set();
  const Kit = (window.Kit = {
    reduce, fine, clamp, lerp, store,
    ready: false,
    velocity: 0,
    whenReady(fn) { if (Kit.ready) fn(); else readyFns.push(fn); },
    onTick(fn) { tickFns.add(fn); return () => tickFns.delete(fn); },
  });
  const setReady = () => {
    if (Kit.ready) return;
    Kit.ready = true;
    root.classList.add('is-ready');
    readyFns.splice(0).forEach((fn) => fn());
  };

  /* ---------- Opening, arrival and leaving ---------- */
  const loader = d.querySelector('.loader');
  const veil = d.querySelector('.veil');

  if (root.classList.contains('booting') && loader) {
    const dur = Number(loader.dataset.duration) || 1600;
    const num = loader.querySelector('[data-load-num]');
    const t0 = performance.now();
    const tick = (now) => {
      const p = clamp((now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      loader.style.setProperty('--p', e.toFixed(4));
      if (num) num.textContent = String(Math.round(e * 100)).padStart(3, '0');
      if (p < 1) { requestAnimationFrame(tick); return; }
      store.set(key, '1');
      root.classList.add('is-loaded');
      setTimeout(setReady, Number(loader.dataset.exit) || 450);
      setTimeout(() => { root.classList.remove('booting'); loader.remove(); }, 1800);
    };
    requestAnimationFrame(tick);
  } else {
    store.set(key, '1');
    if (loader) loader.remove();
    if (root.classList.contains('entering')) {
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-entered')));
      setTimeout(setReady, 320);
      setTimeout(() => root.classList.remove('entering', 'is-entered'), 1500);
    } else {
      setReady();
    }
  }
  // Last resort: never leave the page hidden if something above stalls.
  setTimeout(() => { root.classList.remove('booting', 'entering'); setReady(); }, 4000);

  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download') || 'noVeil' in a.dataset) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) {
      closeMenu();
      return;
    }
    if (!/(\.html|\/)$/.test(url.pathname) || reduce || !veil) return;
    e.preventDefault();
    closeMenu();
    veil.classList.add('is-leaving');
    setTimeout(() => { location.href = url.href; }, Number(veil.dataset.leave) || 720);
  });
  addEventListener('pageshow', (e) => {
    if (e.persisted && veil) veil.classList.remove('is-leaving');
  });

  /* ---------- Mobile menu ---------- */
  const header = d.querySelector('[data-autohide]');
  const toggle = d.querySelector('.menu-toggle');
  function closeMenu() {
    if (!root.classList.contains('menu-open')) return;
    root.classList.remove('menu-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = root.classList.toggle('menu-open');
      if (open && header) header.classList.remove('is-hidden');
      toggle.setAttribute('aria-expanded', String(open));
    });
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    addEventListener('resize', () => { if (innerWidth > 1180) closeMenu(); });
  }

  /* ---------- Text splitting ---------- */
  // Split text is hidden from screen readers; a plain copy is read instead.
  function srText(text) {
    const s = d.createElement('span');
    s.className = 'sr-only';
    s.textContent = text;
    return s;
  }
  function splitChars(el) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = d.createDocumentFragment();
          [...child.textContent].forEach((ch) => {
            if (/\s/.test(ch) && !ch.trim()) { frag.append(ch); return; }
            const s = d.createElement('span');
            s.className = 'ch';
            s.style.setProperty('--c', i++);
            s.textContent = ch;
            frag.append(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    const inner = d.createElement('span');
    inner.setAttribute('aria-hidden', 'true');
    inner.className = 'split-inner';
    while (el.firstChild) inner.append(el.firstChild);
    el.append(inner, srText(label));
    el.style.setProperty('--chars', i);
  }
  d.querySelectorAll('[data-split]').forEach(splitChars);
  d.querySelectorAll('[data-lines]').forEach((el) => {
    el.querySelectorAll('.ln').forEach((ln, i) => ln.style.setProperty('--l', i));
  });
  d.querySelectorAll('[data-stagger]').forEach((g) => {
    [...g.children].forEach((ch, i) => ch.style.setProperty('--i', i));
  });

  /* ---------- Scramble ---------- */
  const glyphs = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789#*+/=<>';
  function scramble(el) {
    if (reduce) return;
    const final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    const q = [...final].map((ch, i) => ({ ch, end: Math.floor(Math.random() * 8) + i * 1.2 + 4 }));
    let frame = 0;
    cancelAnimationFrame(el._raf);
    const step = () => {
      let out = '';
      let done = 0;
      q.forEach((o) => {
        if (frame >= o.end || !o.ch.trim()) { out += o.ch; done++; }
        else out += glyphs[(Math.random() * glyphs.length) | 0];
      });
      el.textContent = out;
      frame++;
      if (done < q.length) el._raf = requestAnimationFrame(step);
    };
    step();
  }
  Kit.scramble = scramble;
  d.querySelectorAll('[data-scramble-hover]').forEach((el) => {
    const host = el.closest('a, button') || el;
    host.addEventListener('pointerenter', () => scramble(el));
  });

  /* ---------- Counters ---------- */
  function countUp(el) {
    const to = parseFloat(el.dataset.count);
    const dec = Number(el.dataset.decimals) || 0;
    const fmt = (v) => v.toLocaleString('ja-JP', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const dur = Number(el.dataset.duration) || 1600;
    const tick = (now) => {
      const p = clamp((now - t0) / dur);
      el.textContent = fmt(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Reveal on scroll ---------- */
  const revealSel = '[data-reveal], [data-split], [data-lines], [data-scramble], [data-count], [data-inview]';
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('is-in');
      if (el.hasAttribute('data-scramble')) scramble(el);
      if (el.hasAttribute('data-count')) countUp(el);
      el.dispatchEvent(new CustomEvent('kit:in'));
      io.unobserve(el);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  Kit.whenReady(() => d.querySelectorAll(revealSel).forEach((el) => io.observe(el)));

  /* ---------- Scroll-lit statement ---------- */
  const statements = [...d.querySelectorAll('[data-words]')].map((el) => {
    const frag = d.createDocumentFragment();
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    el.childNodes.forEach((node) => {
      if (node.nodeType === 1 && node.tagName === 'BR') { frag.append(d.createElement('br')); return; }
      const hl = node.nodeType === 1 && node.tagName === 'EM';
      [...node.textContent].forEach((ch) => {
        if (!ch.trim()) { frag.append(ch); return; }
        const s = d.createElement('span');
        s.className = hl ? 'w hl' : 'w';
        s.textContent = ch;
        frag.append(s);
      });
    });
    const inner = d.createElement('span');
    inner.setAttribute('aria-hidden', 'true');
    inner.append(frag);
    el.textContent = '';
    el.append(inner, srText(label));
    return { el, chars: [...el.querySelectorAll('.w')], last: -1 };
  });

  /* ---------- Parallax and progress ---------- */
  const speeds = [...d.querySelectorAll('[data-speed]')];
  const progress = [...d.querySelectorAll('[data-progress]')];
  const ribbon = d.querySelector('.sample-ribbon');
  let ribbonTimer = 0;
  let lastY = scrollY;
  let smoothV = 0;

  function frame(now) {
    const y = scrollY;
    const vh = innerHeight;
    const dy = y - lastY;
    smoothV = lerp(smoothV, dy, 0.12);
    Kit.velocity = smoothV;
    if (Math.abs(dy) > 0 || now < 3000 || Kit._dirty) {
      Kit._dirty = false;
      const max = Math.max(1, d.documentElement.scrollHeight - vh);
      root.style.setProperty('--scroll', (y / max).toFixed(4));
      if (ribbon && Math.abs(dy) > 4 && y > 200) {
        ribbon.classList.add('is-tucked');
        clearTimeout(ribbonTimer);
        ribbonTimer = setTimeout(() => ribbon.classList.remove('is-tucked'), 900);
      }
      if (header) {
        header.classList.toggle('is-scrolled', y > 24);
        if (Math.abs(dy) > 2) header.classList.toggle('is-hidden', dy > 0 && y > 480 && !root.classList.contains('menu-open'));
      }
      if (!reduce) {
        speeds.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          const c = r.top + r.height / 2 - vh / 2;
          el.style.transform = `translate3d(0, ${(c * Number(el.dataset.speed)).toFixed(1)}px, 0)`;
        });
      }
      progress.forEach((el) => {
        const r = el.getBoundingClientRect();
        const p = el.dataset.progress === 'sticky'
          ? clamp(-r.top / Math.max(1, r.height - vh))
          : clamp((vh - r.top) / (r.height + vh));
        if (el._p !== p) {
          el._p = p;
          el.style.setProperty('--p', p.toFixed(4));
          el.dispatchEvent(new CustomEvent('kit:progress', { detail: p }));
        }
      });
      statements.forEach((s) => {
        const r = s.el.getBoundingClientRect();
        const p = reduce ? 1 : clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
        const n = Math.floor(p * s.chars.length);
        if (n === s.last) return;
        s.last = n;
        s.chars.forEach((c, i) => c.classList.toggle('on', i < n));
      });
    }
    tickFns.forEach((fn) => fn(now, y, smoothV));
    lastY = y;
    requestAnimationFrame(frame);
  }
  addEventListener('resize', () => { Kit._dirty = true; });
  Kit._dirty = true;
  requestAnimationFrame(frame);

  /* ---------- Pointer effects ---------- */
  if (fine) {
    d.querySelectorAll('.spot').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }
  if (fine && !reduce) {
    d.querySelectorAll('[data-tilt]').forEach((el) => {
      const amt = Number(el.dataset.tilt) || 6;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--rx', `${(-py * amt).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${(px * amt).toFixed(2)}deg`);
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
    d.querySelectorAll('[data-magnetic]').forEach((el) => {
      const pull = Number(el.dataset.magnetic) || 0.25;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--gx', `${((e.clientX - (r.left + r.width / 2)) * pull).toFixed(1)}px`);
        el.style.setProperty('--gy', `${((e.clientY - (r.top + r.height / 2)) * pull * 1.3).toFixed(1)}px`);
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--gx', '0px'); el.style.setProperty('--gy', '0px'); });
    });

    /* Cursor mark: shown only over clickable things. The real pointer is never
       hidden, so a busy frame can never leave the visitor without a pointer. */
    if (root.dataset.cursor) {
      const c = d.createElement('div');
      c.className = 'cursor';
      c.setAttribute('aria-hidden', 'true');
      c.innerHTML = '<span class="cursor__shape"></span><span class="cursor__label"></span>';
      d.body.append(c);
      const label = c.querySelector('.cursor__label');
      let mx = -100, my = -100, cx = -100, cy = -100, hovering = false;
      const place = () => { c.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`; };
      addEventListener('pointermove', (e) => {
        mx = e.clientX; my = e.clientY;
        if (!hovering) { cx = mx; cy = my; }
      }, { passive: true });
      d.addEventListener('pointerover', (e) => {
        // <html data-cursor="..."> must not count as a clickable target.
        const t = e.target.closest('a[href], button, summary, label, [role="button"], [data-cursor]:not(html)');
        const on = !!t && !e.target.closest('input, textarea, select');
        if (on && !hovering) { cx = mx; cy = my; place(); }
        hovering = on;
        const text = on && t.dataset.cursor ? t.dataset.cursor : '';
        c.classList.toggle('is-hover', on);
        c.classList.toggle('is-label', !!text);
        if (text) label.textContent = text;
      });
      d.documentElement.addEventListener('pointerleave', () => { hovering = false; c.classList.remove('is-hover'); });
      addEventListener('blur', () => { hovering = false; c.classList.remove('is-hover', 'is-down'); });
      addEventListener('pointerdown', () => c.classList.add('is-down'));
      addEventListener('pointerup', () => c.classList.remove('is-down'));
      Kit.onTick(() => {
        if (!hovering) return;
        cx = lerp(cx, mx, 0.24);
        cy = lerp(cy, my, 0.24);
        place();
      });
    }
  }

  /* ---------- Small helpers ---------- */
  d.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  d.querySelectorAll('[data-to-top]').forEach((b) => b.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }));
  Kit.jst = () => {
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    return { y: now.getUTCFullYear(), mo: now.getUTCMonth(), d: now.getUTCDate(), day: now.getUTCDay(), h: now.getUTCHours(), m: now.getUTCMinutes(), s: now.getUTCSeconds(), date: now };
  };
})();
